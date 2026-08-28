import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { US_STATE_CODES } from '../lib/usStates'
import TopBar from '../components/layout/TopBar'
import { safeFormatDate } from '../lib/dates'
import { MapPinned, CheckCircle2 } from 'lucide-react'

const fieldClass = 'w-full bg-navy-800 border border-fg/10 text-fg rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-fg/30'

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function MileageLog() {
  const { profile } = useAuth()

  const [vehicles, setVehicles] = useState([])
  const [entries, setEntries] = useState([])
  const [entriesLoading, setEntriesLoading] = useState(true)

  const [entryDate, setEntryDate] = useState(todayStr())
  const [vehicleId, setVehicleId] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [miles, setMiles] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.from('vehicles').select('id, name, plate, make, model').eq('active', true)
      .then(({ data }) => setVehicles(data ?? []))
  }, [])

  // fetchEntries is intentionally left out of the deps array (same convention
  // as DriverDashboard's fetchMyRuns/fetchHistory effects) — profile?.id is
  // the trigger, and fetchEntries is redefined every render so including it
  // would refetch on every render.
  useEffect(() => {
    if (!profile?.id) return
    fetchEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function fetchEntries() {
    setEntriesLoading(true)
    const { data } = await supabase
      .from('mileage_entries')
      .select('id, entry_date, jurisdiction, miles, vehicles(name, make, model)')
      .eq('driver_id', profile.id)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)
    setEntries(data ?? [])
    setEntriesLoading(false)
  }

  const milesNum = parseFloat(miles)
  const canSubmit = vehicleId && jurisdiction && miles !== '' && !Number.isNaN(milesNum) && milesNum >= 0 && !saving

  async function submit() {
    if (!canSubmit) return
    setSaving(true)
    setError('')
    try {
      const { error: insertError } = await supabase.from('mileage_entries').insert({
        company_id: profile.company_id,
        driver_id: profile.id,
        vehicle_id: vehicleId,
        jurisdiction,
        miles: milesNum,
        entry_date: entryDate,
      })
      if (insertError) throw insertError
      setDone(true)
      setMiles('')
      setJurisdiction('')
      await fetchEntries()
      setTimeout(() => setDone(false), 1400)
    } catch (err) {
      setError(err.message ?? 'Failed to save mileage entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Mileage Log" />
      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">

        <div className="bg-navy-700 rounded-2xl p-4 border border-fg/[0.07] space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-600/25 flex items-center justify-center shrink-0">
              <MapPinned size={16} className="text-brand-300" />
            </div>
            <h2 className="text-sm font-semibold text-fg">Log Mileage</h2>
          </div>

          <div>
            <label className="block text-xs text-fg/50 mb-1">Date *</label>
            <input
              type="date"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="block text-xs text-fg/50 mb-1">Vehicle *</label>
            <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={fieldClass}>
              <option value="">Select a vehicle…</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name || `${v.make} ${v.model}`}{v.plate ? ` · ${v.plate}` : ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-fg/50 mb-1">Jurisdiction *</label>
              <select value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} className={fieldClass}>
                <option value="">State…</option>
                {US_STATE_CODES.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg/50 mb-1">Miles *</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={miles}
                onChange={e => setMiles(e.target.value)}
                placeholder="0"
                className={fieldClass}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-600/30 rounded-xl px-4 py-3">
              <p className="text-red-300 text-sm font-medium">Error</p>
              <p className="text-red-400 text-xs mt-0.5">{error}</p>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 text-xs text-green-300 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5">
              <CheckCircle2 size={14} className="shrink-0" />
              Mileage entry saved
            </div>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 active:bg-brand-700 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-fg/40 uppercase tracking-wide mb-2 px-1">Recent Entries</h2>
          {entriesLoading && (
            <p className="text-sm text-fg/40 text-center py-6">Loading…</p>
          )}
          {!entriesLoading && entries.length === 0 && (
            <div className="bg-navy-700 rounded-2xl border border-fg/[0.07] p-6 text-center">
              <p className="text-fg/40 text-sm">No mileage logged yet.</p>
            </div>
          )}
          {!entriesLoading && entries.length > 0 && (
            <div className="bg-navy-700 rounded-2xl border border-fg/[0.07] overflow-hidden divide-y divide-white/[0.06]">
              {entries.map(e => (
                <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-fg/80">{safeFormatDate(e.entry_date, 'MMM d, yyyy')}</p>
                    <p className="text-xs text-fg/40 truncate">
                      {e.vehicles ? (e.vehicles.name || `${e.vehicles.make} ${e.vehicles.model}`) : 'Vehicle'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-fg">{Number(e.miles).toLocaleString()} mi</p>
                    <p className="text-xs text-fg/40">{e.jurisdiction}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
