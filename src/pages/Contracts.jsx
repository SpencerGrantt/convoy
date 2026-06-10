import { useState } from 'react'
import { useContracts } from '../hooks/useContracts'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import StatusPill from '../components/ui/StatusPill'
import AlertBanner from '../components/ui/AlertBanner'
import TopBar from '../components/layout/TopBar'
import { format, differenceInDays, parseISO } from 'date-fns'

export default function Contracts() {
  const { contracts, loading } = useContracts()
  const { profile } = useAuth()
  const company = profile?.companies
  const today = new Date()
  const [opportunities, setOpportunities] = useState([])
  const [matching, setMatching] = useState(false)
  const [matched, setMatched] = useState(false)
  const [scanError, setScanError] = useState('')

  async function findOpportunities() {
    setMatching(true)
    setScanError('')
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 20s')), 20000)
      )
      const { data, error } = await Promise.race([
        supabase.functions.invoke('sam-gov-sync', {
          body: {
            naicsCodes: company?.naics_codes ?? [],
            companyName: company?.name ?? 'My Company',
            samExpiry: company?.sam_expiry ?? null,
          },
        }),
        timeout,
      ])
      if (error) throw error
      setOpportunities(data?.opportunities ?? [])
    } catch (err) {
      setScanError(err?.message ?? 'Scan failed')
    } finally {
      setMatching(false)
      setMatched(true)
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

        <div className="bg-navy-700 rounded-2xl border border-white/[0.07] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Contract Opportunities</p>
              <p className="text-xs text-white/40">AI-scored SAM.gov matches for your NAICS codes</p>
            </div>
            <button
              onClick={findOpportunities}
              disabled={matching}
              className="bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-50"
            >
              {matching ? 'Scanning…' : '🔍 Find Matches'}
            </button>
          </div>
          {scanError && <p className="text-xs text-red-400 font-medium">{scanError}</p>}
          {matched && !scanError && opportunities.length === 0 && (
            <p className="text-xs text-white/40">No matches found. Try updating your NAICS codes in Settings.</p>
          )}
          {opportunities.map((opp, i) => (
            <div key={i} className="bg-navy-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${opp.score >= 7 ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                  {opp.score}/10
                </span>
                <p className="text-xs font-semibold text-white flex-1 truncate">{opp.title}</p>
              </div>
              <p className="text-xs text-white/50">{opp.reason}</p>
              {opp.deadline && <p className="text-xs text-white/40">Deadline: {opp.deadline}</p>}
            </div>
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
