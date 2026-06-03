import { useState } from 'react'
import { useDrivers } from '../hooks/useDrivers'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { differenceInDays, parseISO, format } from 'date-fns'

const DOC_TYPES = [
  { key: 'cdl',              label: 'CDL' },
  { key: 'hipaa_cert',       label: 'HIPAA Cert' },
  { key: 'background_check', label: 'BG Check' },
  { key: 'insurance',        label: 'Insurance' },
]

function ExpiryBadge({ date }) {
  if (!date) return <span className="text-gray-300 text-xs">—</span>
  const d = differenceInDays(parseISO(date), new Date())
  const color = d <= 30 ? 'text-red-600 bg-red-50' : d <= 60 ? 'text-yellow-600 bg-yellow-50' : 'text-green-700 bg-green-50'
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>
      {d < 0 ? 'Expired' : `${d}d`}
    </span>
  )
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-4 pt-4 pb-8 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-900">{title}</p>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
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

  async function saveDoc() {
    if (!expiry || !selectedDriver) return
    setSaving(true)
    await supabase.from('compliance_docs').insert({
      company_id: profile.company_id,
      owner_id: selectedDriver.id,
      doc_type: docType,
      expiry_date: expiry,
    })
    setSaving(false)
    setSheet(null)
    refresh()
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700'

  // Collect all expiring docs for the alert banner
  const expiring = []
  drivers.forEach(d => {
    (d.compliance_docs ?? []).forEach(doc => {
      if (!doc.expiry_date) return
      const days = differenceInDays(parseISO(doc.expiry_date), new Date())
      if (days <= 60) expiring.push({ driver: d.full_name, doc: doc.doc_type, days })
    })
  })

  return (
    <div className="pb-24">
      <TopBar title="Drivers" />
      <div className="px-4 pt-4 space-y-3">

        {expiring.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-yellow-800">⚠️ Compliance Alerts</p>
            {expiring.map((e, i) => (
              <p key={i} className="text-xs text-yellow-700">
                {e.driver} — {e.doc.replace('_', ' ')} expires in <strong>{e.days}d</strong>
              </p>
            ))}
          </div>
        )}

        {loading ? <LoadingSpinner /> : (
          <>
            {drivers.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No drivers yet</p>}
            {drivers.map(driver => {
              const initials = driver.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
              return (
                <div key={driver.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-brand-900 flex items-center justify-center text-brand-50 font-bold text-sm">
                      {initials}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{driver.full_name}</p>
                      <p className="text-xs text-gray-400">{driver.phone ?? 'No phone'}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedDriver(driver); setSheet('doc') }}
                      className="text-xs text-brand-700 font-medium bg-brand-50 px-2 py-1 rounded-lg"
                    >
                      + Doc
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DOC_TYPES.map(({ key, label }) => {
                      const doc = (driver.compliance_docs ?? []).find(d => d.doc_type === key)
                      return (
                        <div key={key} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
                          <span className="text-xs text-gray-500">{label}</span>
                          <ExpiryBadge date={doc?.expiry_date} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {sheet === 'doc' && selectedDriver && (
        <Sheet title={`Add Doc — ${selectedDriver.full_name}`} onClose={() => setSheet(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)} className={field}>
                {DOC_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Expiry Date</label>
              <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className={field} />
            </div>
            <button onClick={saveDoc} disabled={saving || !expiry} className="w-full bg-brand-900 text-brand-50 font-bold py-3 rounded-xl disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Document'}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
