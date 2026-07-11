import { useState } from 'react'
import { useContracts } from '../hooks/useContracts'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import StatusPill from '../components/ui/StatusPill'
import AlertBanner from '../components/ui/AlertBanner'
import TopBar from '../components/layout/TopBar'
import { format, differenceInDays, parseISO } from 'date-fns'

const fieldClass = 'w-full bg-navy-800 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/30'

function fmtSamDate(d) {
  const day = String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + '/' + d.getFullYear()
  return day
}

// Shared SAM.gov lookup — tries a direct browser call first, falls back to
// the sam-gov-sync edge function (which itself falls back to mock data) if
// the direct call fails for any reason. SAM.gov's API commonly rejects
// direct browser requests via CORS, so the direct path failing is expected
// and must not be treated as a hard error — always fall through instead.
async function samSearch({ naicsCode, title }) {
  const samKey = import.meta.env.VITE_SAM_GOV_API_KEY

  if (samKey) {
    try {
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const params = new URLSearchParams({
        api_key: samKey,
        limit: '10',
        postedFrom: fmtSamDate(ninetyDaysAgo),
        postedTo: fmtSamDate(new Date()),
        active: 'Yes',
      })
      if (naicsCode) params.set('naicsCode', String(naicsCode).trim())
      if (title?.trim()) params.set('title', title.trim())

      const res = await fetch(`https://api.sam.gov/opportunities/v2/search?${params}`)
      if (!res.ok) throw new Error(`SAM.gov returned ${res.status}`)
      const json = await res.json()
      const raw = json.opportunitiesData ?? []
      if (raw.length) {
        return {
          live: true,
          opportunities: raw.slice(0, 5).map((opp, i) => ({
            title: opp.title ?? 'Untitled Opportunity',
            score: Math.max(6, 8 - i),
            reason: [opp.typeOfSetAsideDescription, opp.naicsCode ? `NAICS ${opp.naicsCode}` : null, opp.baseType].filter(Boolean).join(' — ') || 'Government opportunity',
            deadline: opp.responseDeadLine ?? opp.archiveDate ?? 'See SAM.gov',
            link: opp.uiLink ?? `https://sam.gov/opp/${opp.noticeId}/view`,
            noticeId: opp.noticeId ?? null,
            naicsCode: opp.naicsCode ?? null,
            agency: opp.fullParentPathName?.split('.').pop()?.trim() ?? opp.department ?? null,
          })),
        }
      }
      // Direct call succeeded but returned zero results — fall through to
      // the edge function rather than reporting "no matches" prematurely.
    } catch (directErr) {
      console.warn('[samSearch] direct SAM.gov call failed, falling back to edge function:', directErr.message)
    }
  }

  // Fallback: edge function (returns mock data if SAM.gov is unreachable from cloud)
  const { data, error } = await supabase.functions.invoke('sam-gov-sync', {
    body: { naicsCodes: naicsCode ? [naicsCode] : [], title },
  })
  if (error) throw error
  return { live: data?.live ?? false, opportunities: data?.opportunities ?? [] }
}

function OpportunityCard({ opp, companyId, defaultNaics, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  async function saveAsContract() {
    setSaving(true)
    setErr('')
    try {
      const parsedDeadline = new Date(opp.deadline)
      const end_date = !isNaN(parsedDeadline) ? parsedDeadline.toISOString().slice(0, 10) : null

      const { error } = await supabase.from('contracts').insert({
        company_id: companyId,
        name: opp.title,
        agency: opp.agency ?? null,
        contract_number: opp.noticeId ?? null,
        naics_code: opp.naicsCode ?? defaultNaics ?? null,
        status: 'pending',
        sam_link: opp.link ?? null,
        end_date,
        notes: opp.reason ?? null,
      })
      if (error) throw error
      setSaved(true)
      onSaved?.()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-navy-800 rounded-xl p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${opp.score >= 7 ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
          {opp.score}/10
        </span>
        <p className="text-xs font-semibold text-white flex-1 truncate">{opp.title}</p>
      </div>
      <p className="text-xs text-white/50">{opp.reason}</p>
      <div className="flex items-center justify-between gap-2">
        {opp.deadline && <p className="text-xs text-white/40">Deadline: {opp.deadline}</p>}
        <button
          onClick={saveAsContract}
          disabled={saving || saved}
          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg shrink-0 disabled:opacity-60 ${saved ? 'bg-green-500/20 text-green-300' : 'bg-brand-500/20 text-brand-300'}`}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : '+ Save as Contract'}
        </button>
      </div>
      {err && <p className="text-xs text-red-400 font-medium">{err}</p>}
    </div>
  )
}

export default function Contracts() {
  const { contracts, loading, refresh } = useContracts()
  const { profile } = useAuth()
  const company = profile?.companies
  const today = new Date()

  const [opportunities, setOpportunities] = useState([])
  const [matching, setMatching] = useState(false)
  const [matched, setMatched] = useState(false)
  const [scanError, setScanError] = useState('')
  const [liveResults, setLiveResults] = useState(false)

  const [manualQuery, setManualQuery] = useState('')
  const [manualResults, setManualResults] = useState([])
  const [manualSearching, setManualSearching] = useState(false)
  const [manualMatched, setManualMatched] = useState(false)
  const [manualError, setManualError] = useState('')
  const [manualLive, setManualLive] = useState(false)

  async function findOpportunities() {
    setMatching(true)
    setScanError('')
    try {
      const { live, opportunities } = await samSearch({ naicsCode: company?.naics_codes?.[0] })
      setOpportunities(opportunities)
      setLiveResults(live)
    } catch (err) {
      setScanError(err?.message ?? 'Scan failed')
    } finally {
      setMatching(false)
      setMatched(true)
    }
  }

  async function runManualSearch(e) {
    e.preventDefault()
    if (!manualQuery.trim()) return
    setManualSearching(true)
    setManualError('')
    try {
      const { live, opportunities } = await samSearch({ title: manualQuery, naicsCode: company?.naics_codes?.[0] })
      setManualResults(opportunities)
      setManualLive(live)
    } catch (err) {
      setManualError(err?.message ?? 'Search failed')
    } finally {
      setManualSearching(false)
      setManualMatched(true)
    }
  }

  const expiring = contracts.filter(c => {
    if (!c.end_date) return false
    const d = differenceInDays(parseISO(c.end_date), today)
    return d >= 0 && d <= 30
  })

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Contracts" />
      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">
        {expiring.map(c => (
          <AlertBanner
            key={c.id}
            type="warning"
            message={`"${c.name}" renews in ${differenceInDays(parseISO(c.end_date), today)} days`}
          />
        ))}

        {company && (
          <div className="bg-brand-600 text-white rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏛️</span>
              <p className="font-bold text-sm">{company.name}</p>
              {company.sdvosb && <span className="bg-brand-700 text-brand-100 text-xs px-1.5 py-0.5 rounded font-medium">SDVOSB</span>}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-brand-200">
              <span>CAGE: <strong className="text-white">{company.cage_code ?? '—'}</strong></span>
              <span>UEI: <strong className="text-white">{company.uei ?? '—'}</strong></span>
              <span className="col-span-2">NAICS: <strong className="text-white">{company.naics_codes?.join(', ') ?? '—'}</strong></span>
              {company.sam_expiry && (
                <span className="col-span-2">SAM Expiry: <strong className="text-white">{format(parseISO(company.sam_expiry), 'MMM d, yyyy')}</strong></span>
              )}
            </div>
          </div>
        )}

        {/* AI / NAICS-based auto match */}
        <div className="bg-navy-700 rounded-2xl border border-white/[0.07] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Contract Opportunities</p>
              <p className="text-xs text-white/40">
                {matched && liveResults ? 'Live SAM.gov results' : matched ? 'SAM.gov unavailable — showing sample results' : 'SAM.gov matches for your NAICS codes'}
              </p>
            </div>
            <button
              onClick={findOpportunities}
              disabled={matching}
              className="bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-50"
            >
              {matching ? 'Fetching from SAM.gov…' : '🔍 Find Matches'}
            </button>
          </div>
          {scanError && <p className="text-xs text-red-400 font-medium">{scanError}</p>}
          {matched && !scanError && opportunities.length === 0 && (
            <p className="text-xs text-white/40">No matches found. Try updating your NAICS codes in Settings.</p>
          )}
          {opportunities.map((opp, i) => (
            <OpportunityCard key={i} opp={opp} companyId={profile?.company_id} defaultNaics={company?.naics_codes?.[0]} onSaved={refresh} />
          ))}
        </div>

        {/* Manual keyword search */}
        <div className="bg-navy-700 rounded-2xl border border-white/[0.07] p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Manual Search</p>
          <form onSubmit={runManualSearch} className="flex gap-2">
            <input
              value={manualQuery}
              onChange={e => setManualQuery(e.target.value)}
              placeholder="e.g. lab specimen courier"
              className={fieldClass}
            />
            <button
              type="submit"
              disabled={manualSearching || !manualQuery.trim()}
              className="bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-50 shrink-0"
            >
              {manualSearching ? 'Searching…' : 'Search'}
            </button>
          </form>
          <p className="text-xs text-white/40">
            {manualMatched && manualLive ? 'Live SAM.gov results' : manualMatched ? 'SAM.gov unavailable — showing sample results' : 'Search SAM.gov opportunities by keyword'}
          </p>
          {manualError && <p className="text-xs text-red-400 font-medium">{manualError}</p>}
          {manualMatched && !manualError && manualResults.length === 0 && (
            <p className="text-xs text-white/40">No matches found for "{manualQuery}".</p>
          )}
          {manualResults.map((opp, i) => (
            <OpportunityCard key={i} opp={opp} companyId={profile?.company_id} defaultNaics={company?.naics_codes?.[0]} onSaved={refresh} />
          ))}
        </div>

        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Contracts</h2>
        <div className="space-y-2">
          {!loading && contracts.length === 0 && <p className="text-sm text-white/40 text-center py-4">No contracts yet</p>}
          {contracts.map(c => (
            <div key={c.id} className="bg-navy-700 rounded-xl p-4 border border-white/[0.07]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white text-sm">{c.name}</p>
                    <StatusPill status={c.status} />
                  </div>
                  <p className="text-xs text-white/50">{c.agency} · #{c.contract_number}</p>
                  {c.annual_value && (
                    <p className="text-xs text-green-400 font-semibold mt-1">
                      ${Number(c.annual_value).toLocaleString()} / yr
                    </p>
                  )}
                </div>
                {c.end_date && (
                  <div className="text-right text-xs text-white/40 shrink-0">
                    <p>Ends</p>
                    <p className="font-medium text-white/60">{format(parseISO(c.end_date), 'MMM d, yy')}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
