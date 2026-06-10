import { useState } from 'react'
import { useDrivers } from '../hooks/useDrivers'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'
import { differenceInDays, parseISO } from 'date-fns'

const DOC_TYPES = [
  { key: 'cdl',              label: 'CDL' },
  { key: 'hipaa_cert',       label: 'HIPAA Cert' },
  { key: 'background_check', label: 'BG Check' },
  { key: 'insurance',        label: 'Insurance' },
]

function ExpiryBadge({ date }) {
  if (!date) return <span className="text-white/20 text-xs">—</span>
  const d = differenceInDays(parseISO(date), new Date())
  const color = d <= 30 ? 'text-red-400 bg-red-500/20' : d <= 60 ? 'text-yellow-400 bg-yellow-500/20' : 'text-green-400 bg-green-500/20'
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>
      {d < 0 ? 'Expired' : `${d}d`}
    </span>
  )
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-navy-700 rounded-t-3xl px-4 pt-4 pb-8 space-y-4 border-t border-white/[0.08]">
        <div className="flex items-center justify-between">
          <p className="font-bold text-white">{title}</p>
          <button onClick={onClose} className="text-white/40 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Drivers() {
  const { drivers, loading, refresh } = useDrivers()
  const { profile } = useAuth()
  const [sheet, setSheet] = useState(null)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [docType, setDocType] = useState('cdl')
  const [expiry, setExpiry] = useState('')
  const [saving, setSaving] = useState(false)
  const [docErr, setDocErr] = useState('')
  const [docSaved, setDocSaved] = useState(false)

  const fieldClass = 'w-full bg-navy-800 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/30'

  async function saveDoc() {
    if (!expiry || !selectedDriver) return
    setSaving(true)
    setDocErr('')
    try {
      const { error } = await supabase.from('compliance_docs').insert({
        company_id: profile.company_id,
        owner_id: selectedDriver.id,
        doc_type: docType,
        expiry_date: expiry,
      })
      if (error) throw error
      setDocSaved(true)
      refresh()
      setTimeout(() => { setDocSaved(false); setSheet(null) }, 1200)
    } catch (err) {
      setDocErr(err.message)
    } finally {
      setSaving(false)
    }
  }

  const expiring = []
  drivers.forEach(d => {
    (d.compliance_docs ?? []).forEach(doc => {
      if (!doc.expiry_date) return
      const days = differenceInDays(parseISO(doc.expiry_date), new Date())
      if (days <= 60) expiring.push({ driver: d.full_name, doc: doc.doc_type, days })
    })
  })

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Drivers" />
      <div className="px-4 pt-4 space-y-3 md:px-8 md:pt-6">

        {expiring.length > 0 && (
          <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-yellow-300">⚠️ Compliance Alerts</p>
            {expiring.map((e, i) => (
              <p key={i} className="text-xs text-yellow-400/80">
                {e.driver} — {e.doc.replace('_', ' ')} expires in <strong>{e.days}d</strong>
              </p>
            ))}
          </div>
        )}

        {!loading && drivers.length === 0 && <p className="text-sm text-white/40 text-center py-8">No drivers yet</p>}
        {drivers.map(driver => {
          const initials = driver.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
          return (
            <div key={driver.id} className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07]">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-300 font-bold text-sm">
                  {initials}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{driver.full_name}</p>
                  <p className="text-xs text-white/40">{driver.phone ?? 'No phone'}</p>
                </div>
                <button
                  onClick={() => { setSelectedDriver(driver); setSheet('doc') }}
                  className="text-xs text-brand-300 font-medium bg-brand-500/20 px-2 py-1 rounded-lg"
                >
                  + Doc
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {DOC_TYPES.map(({ key, label }) => {
                  const doc = (driver.compliance_docs ?? []).find(d => d.doc_type === key)
                  return (
                    <div key={key} className="flex items-center justify-between bg-navy-800 rounded-lg px-2 py-1.5">
                      <span className="text-xs text-white/50">{label}</span>
                      <ExpiryBadge date={doc?.expiry_date} />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {sheet === 'doc' && selectedDriver && (
        <Sheet title={`Add Doc — ${selectedDriver.full_name}`} onClose={() => setSheet(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)} className={fieldClass}>
                {DOC_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Expiry Date</label>
              <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className={fieldClass} />
            </div>
            {docErr && <p className="text-red-400 text-xs font-medium">{docErr}</p>}
            <button onClick={saveDoc} disabled={saving || !expiry} className={`w-full font-bold py-3 rounded-xl disabled:opacity-50 transition-colors ${docSaved ? 'bg-green-600 text-white' : 'bg-brand-600 text-white'}`}>
              {saving ? 'Saving…' : docSaved ? '✓ Document Saved' : 'Save Document'}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
