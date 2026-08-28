import { useState } from 'react'
import { useVehicles } from '../hooks/useVehicles'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'
import ExpiryBadge from '../components/ui/ExpiryBadge'
import { safeFormatDate } from '../lib/dates'

const VEHICLE_TYPES = ['Van', 'Box Truck', 'Cargo Van', 'Sedan', 'SUV', 'Refrigerated Van', 'Other']
const SERVICE_TYPES = ['Oil Change', 'Tire Rotation', 'Brake Service', 'Inspection', 'Other']

const fieldClass = 'w-full bg-navy-800 border border-fg/10 text-fg rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-fg/30'

// Same $-formatting convention as Finances.jsx's fmt() — replicated locally
// rather than shared since Finances doesn't export it.
function fmt(n) {
  if (n === null || n === undefined || n === '') return '—'
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function emptyVehicleForm() {
  return {
    name: '', plate: '', vin: '', year: '', make: '', model: '',
    vehicle_type: VEHICLE_TYPES[0], registration_number: '', registration_expiry: '',
    current_odometer: '', active: true,
  }
}

function vehicleToForm(v) {
  return {
    name: v.name ?? '', plate: v.plate ?? '', vin: v.vin ?? '',
    year: v.year ?? '', make: v.make ?? '', model: v.model ?? '',
    vehicle_type: v.vehicle_type ?? VEHICLE_TYPES[0],
    registration_number: v.registration_number ?? '', registration_expiry: v.registration_expiry ?? '',
    current_odometer: v.current_odometer ?? '', active: v.active ?? true,
  }
}

function emptyMaintenanceForm(vehicle) {
  return {
    service_type: SERVICE_TYPES[0], description: '', cost: '',
    odometer_at_service: vehicle?.current_odometer ?? '',
    performed_at: new Date().toISOString().slice(0, 10),
    next_due_date: '', next_due_miles: '',
  }
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-navy-700 rounded-t-3xl px-4 pt-4 pb-8 space-y-4 max-h-[88vh] overflow-y-auto border-t border-fg/[0.08]">
        <div className="flex items-center justify-between">
          <p className="font-bold text-fg">{title}</p>
          <button onClick={onClose} className="text-fg/40 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Miles-based due indicator — ExpiryBadge only understands dates, so
// overdue-by-mileage gets its own small badge using the same red/green
// visual language (spec calls out only an "overdue" state for miles, no
// upcoming/yellow tier, since there's no generic "distance until due" unit
// to bucket the way day-counts are).
function MilesDueBadge({ currentOdometer, nextDueMiles }) {
  if (currentOdometer == null || currentOdometer === '' || nextDueMiles == null || nextDueMiles === '') return null
  const over = Number(currentOdometer) >= Number(nextDueMiles)
  if (!over) return null
  return (
    <span className="text-xs font-medium px-1.5 py-0.5 rounded text-red-400 bg-red-500/20">
      Overdue (miles)
    </span>
  )
}

function VehicleForm({ form, setForm }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-fg/50 mb-1">Name</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Unit 4 / Sprinter Van" className={fieldClass} />
        </div>
        <div>
          <label className="block text-xs text-fg/50 mb-1">Plate</label>
          <input value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} className={fieldClass} />
        </div>
        <div>
          <label className="block text-xs text-fg/50 mb-1">VIN</label>
          <input value={form.vin} onChange={e => setForm({ ...form, vin: e.target.value })} className={fieldClass} />
        </div>
        <div>
          <label className="block text-xs text-fg/50 mb-1">Year</label>
          <input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className={fieldClass} />
        </div>
        <div>
          <label className="block text-xs text-fg/50 mb-1">Vehicle Type</label>
          <select value={form.vehicle_type} onChange={e => setForm({ ...form, vehicle_type: e.target.value })} className={fieldClass}>
            {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-fg/50 mb-1">Make</label>
          <input value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} className={fieldClass} />
        </div>
        <div>
          <label className="block text-xs text-fg/50 mb-1">Model</label>
          <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className={fieldClass} />
        </div>
        <div>
          <label className="block text-xs text-fg/50 mb-1">Registration #</label>
          <input value={form.registration_number} onChange={e => setForm({ ...form, registration_number: e.target.value })} className={fieldClass} />
        </div>
        <div>
          <label className="block text-xs text-fg/50 mb-1">Registration Expiry</label>
          <input type="date" value={form.registration_expiry} onChange={e => setForm({ ...form, registration_expiry: e.target.value })} className={fieldClass} />
        </div>
        <div>
          <label className="block text-xs text-fg/50 mb-1">Current Odometer</label>
          <input type="number" value={form.current_odometer} onChange={e => setForm({ ...form, current_odometer: e.target.value })} className={fieldClass} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-fg/70">
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded accent-brand-600" />
            Active
          </label>
        </div>
      </div>
    </div>
  )
}

export default function Fleet() {
  const { vehicles, loading, refresh } = useVehicles()
  const { profile } = useAuth()

  const [sheet, setSheet] = useState(null) // 'add' | 'detail'
  // Store just the id and derive `selected` from the live `vehicles` list on
  // every render (rather than a snapshot copy) so it automatically reflects
  // a refresh() after adding a maintenance record — e.g. the newly-added log
  // and any current_odometer roll-forward show up in the still-open detail
  // sheet without a setState-in-effect sync.
  const [selectedId, setSelectedId] = useState(null)
  const selected = selectedId ? vehicles.find(v => v.id === selectedId) ?? null : null
  const [form, setForm] = useState(emptyVehicleForm())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)

  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const [mForm, setMForm] = useState(emptyMaintenanceForm())
  const [mSaving, setMSaving] = useState(false)
  const [mErr, setMErr] = useState('')
  const [mSaved, setMSaved] = useState(false)

  function openAdd() {
    setForm(emptyVehicleForm())
    setSelectedId(null)
    setErr('')
    setSaved(false)
    setSheet('add')
  }

  function openDetail(vehicle) {
    setSelectedId(vehicle.id)
    setForm(vehicleToForm(vehicle))
    setErr('')
    setSaved(false)
    setShowMaintenanceForm(false)
    setMForm(emptyMaintenanceForm(vehicle))
    setMErr('')
    setMSaved(false)
    setSheet('detail')
  }

  function closeSheet() {
    setSheet(null)
    setSelectedId(null)
  }

  async function saveVehicle() {
    if (!form.name) return
    setSaving(true)
    setErr('')
    const payload = {
      name: form.name,
      plate: form.plate || null,
      vin: form.vin || null,
      year: form.year ? Number(form.year) : null,
      make: form.make || null,
      model: form.model || null,
      vehicle_type: form.vehicle_type || null,
      registration_number: form.registration_number || null,
      registration_expiry: form.registration_expiry || null,
      current_odometer: form.current_odometer === '' ? null : Number(form.current_odometer),
      active: form.active,
    }
    try {
      if (selected) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', selected.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('vehicles').insert({ ...payload, company_id: profile.company_id })
        if (error) throw error
      }
      setSaved(true)
      refresh()
      setTimeout(() => { setSaved(false); closeSheet() }, 1200)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveMaintenance() {
    if (!selected || !mForm.service_type || !mForm.performed_at) return
    setMSaving(true)
    setMErr('')
    try {
      const odometerAtService = mForm.odometer_at_service === '' ? null : Number(mForm.odometer_at_service)
      const { error } = await supabase.from('maintenance_logs').insert({
        company_id: profile.company_id,
        vehicle_id: selected.id,
        service_type: mForm.service_type,
        description: mForm.description || null,
        cost: mForm.cost === '' ? null : Number(mForm.cost),
        odometer_at_service: odometerAtService,
        performed_at: mForm.performed_at,
        next_due_date: mForm.next_due_date || null,
        next_due_miles: mForm.next_due_miles === '' ? null : Number(mForm.next_due_miles),
      })
      if (error) throw error

      // A logged service reading is the freshest known odometer value for
      // this vehicle — if it's higher than what's on file, roll the
      // vehicle's current_odometer forward too so the fleet list and other
      // pages (mileage/IFTA) don't keep showing a stale, lower number. Never
      // move it backward (a bad/older entry shouldn't erase a newer one).
      if (odometerAtService != null && odometerAtService > (selected.current_odometer ?? -Infinity)) {
        await supabase.from('vehicles').update({ current_odometer: odometerAtService }).eq('id', selected.id)
      }

      setMSaved(true)
      refresh()
      setTimeout(() => {
        setMSaved(false)
        setShowMaintenanceForm(false)
        setMForm(emptyMaintenanceForm(selected))
      }, 1200)
    } catch (e) {
      setMErr(e.message)
    } finally {
      setMSaving(false)
    }
  }

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Fleet" />
      <div className="px-4 pt-4 space-y-3 md:px-8 md:pt-6">

        <button
          onClick={openAdd}
          className="w-full bg-brand-600/20 border border-brand-500/30 text-brand-300 font-semibold py-3 rounded-xl text-sm"
        >
          + Add Vehicle
        </button>

        {!loading && vehicles.length === 0 && <p className="text-sm text-fg/40 text-center py-8">No vehicles yet</p>}

        {vehicles.map(v => (
          <button
            key={v.id}
            onClick={() => openDetail(v)}
            className="w-full text-left bg-navy-700 rounded-2xl p-4 border border-fg/[0.07]"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-fg">{v.name}</p>
                <p className="text-xs text-fg/40">
                  {[v.year, v.make, v.model].filter(Boolean).join(' ') || 'No details'}
                  {v.plate ? ` · ${v.plate}` : ''}
                </p>
              </div>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${v.active ? 'text-green-400 bg-green-500/20' : 'text-fg/40 bg-fg/10'}`}>
                {v.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center justify-between bg-navy-800 rounded-lg px-2 py-1.5">
                <span className="text-xs text-fg/50">Type</span>
                <span className="text-xs text-fg/70">{v.vehicle_type ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between bg-navy-800 rounded-lg px-2 py-1.5">
                <span className="text-xs text-fg/50">Registration</span>
                <ExpiryBadge date={v.registration_expiry} />
              </div>
              <div className="flex items-center justify-between bg-navy-800 rounded-lg px-2 py-1.5">
                <span className="text-xs text-fg/50">Odometer</span>
                <span className="text-xs text-fg/70">{v.current_odometer != null ? `${Number(v.current_odometer).toLocaleString()} mi` : '—'}</span>
              </div>
              <div className="flex items-center justify-between bg-navy-800 rounded-lg px-2 py-1.5">
                <span className="text-xs text-fg/50">Trips</span>
                <span className="text-xs text-fg/70">{v.deliveredCount} delivered / {v.tripCount} total</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {sheet === 'add' && (
        <Sheet title="Add Vehicle" onClose={closeSheet}>
          <VehicleForm form={form} setForm={setForm} />
          {err && <p className="text-red-400 text-xs font-medium">{err}</p>}
          <button
            onClick={saveVehicle}
            disabled={saving || !form.name}
            className={`w-full font-bold py-3 rounded-xl disabled:opacity-50 transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-brand-600 text-white'}`}
          >
            {saving ? 'Saving…' : saved ? '✓ Vehicle Saved' : 'Save Vehicle'}
          </button>
        </Sheet>
      )}

      {sheet === 'detail' && selected && (
        <Sheet title={selected.name} onClose={closeSheet}>
          <VehicleForm form={form} setForm={setForm} />
          {err && <p className="text-red-400 text-xs font-medium">{err}</p>}
          <button
            onClick={saveVehicle}
            disabled={saving || !form.name}
            className={`w-full font-bold py-3 rounded-xl disabled:opacity-50 transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-brand-600 text-white'}`}
          >
            {saving ? 'Saving…' : saved ? '✓ Changes Saved' : 'Save Changes'}
          </button>

          <div className="pt-2 border-t border-fg/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-fg">Maintenance History</p>
              <button
                onClick={() => setShowMaintenanceForm(v => !v)}
                className="text-xs text-brand-300 font-medium bg-brand-500/20 px-2 py-1 rounded-lg"
              >
                {showMaintenanceForm ? 'Cancel' : '+ Record'}
              </button>
            </div>

            {showMaintenanceForm && (
              <div className="bg-navy-800 rounded-xl p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-fg/50 mb-1">Service Type</label>
                    <select value={mForm.service_type} onChange={e => setMForm({ ...mForm, service_type: e.target.value })} className={fieldClass}>
                      {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-fg/50 mb-1">Date Performed</label>
                    <input type="date" value={mForm.performed_at} onChange={e => setMForm({ ...mForm, performed_at: e.target.value })} className={fieldClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-fg/50 mb-1">Cost</label>
                    <input type="number" value={mForm.cost} onChange={e => setMForm({ ...mForm, cost: e.target.value })} className={fieldClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-fg/50 mb-1">Odometer at Service</label>
                    <input type="number" value={mForm.odometer_at_service} onChange={e => setMForm({ ...mForm, odometer_at_service: e.target.value })} className={fieldClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-fg/50 mb-1">Next Due Date</label>
                    <input type="date" value={mForm.next_due_date} onChange={e => setMForm({ ...mForm, next_due_date: e.target.value })} className={fieldClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-fg/50 mb-1">Next Due Miles</label>
                    <input type="number" value={mForm.next_due_miles} onChange={e => setMForm({ ...mForm, next_due_miles: e.target.value })} className={fieldClass} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-fg/50 mb-1">Description</label>
                    <input value={mForm.description} onChange={e => setMForm({ ...mForm, description: e.target.value })} className={fieldClass} />
                  </div>
                </div>
                {mErr && <p className="text-red-400 text-xs font-medium">{mErr}</p>}
                <button
                  onClick={saveMaintenance}
                  disabled={mSaving || !mForm.service_type || !mForm.performed_at}
                  className={`w-full font-bold py-2.5 rounded-xl disabled:opacity-50 transition-colors ${mSaved ? 'bg-green-600 text-white' : 'bg-brand-600 text-white'}`}
                >
                  {mSaving ? 'Saving…' : mSaved ? '✓ Record Saved' : 'Save Record'}
                </button>
              </div>
            )}

            {(selected.maintenance_logs ?? []).length === 0 && (
              <p className="text-xs text-fg/40 text-center py-4">No maintenance recorded yet</p>
            )}
            {(selected.maintenance_logs ?? []).map(log => (
              <div key={log.id} className="bg-navy-800 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-fg">{log.service_type}</p>
                  <span className="text-sm text-fg/70">{fmt(log.cost)}</span>
                </div>
                {log.description && <p className="text-xs text-fg/50">{log.description}</p>}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-fg/40">{safeFormatDate(log.performed_at, 'MMM d, yyyy')}</span>
                  {log.odometer_at_service != null && (
                    <span className="text-[11px] text-fg/40">{Number(log.odometer_at_service).toLocaleString()} mi</span>
                  )}
                  {log.next_due_date && (
                    <span className="flex items-center gap-1 text-[11px] text-fg/40">
                      Next due {safeFormatDate(log.next_due_date, 'MMM d, yyyy')} <ExpiryBadge date={log.next_due_date} />
                    </span>
                  )}
                  {log.next_due_miles != null && (
                    <span className="flex items-center gap-1 text-[11px] text-fg/40">
                      Due at {Number(log.next_due_miles).toLocaleString()} mi
                      <MilesDueBadge currentOdometer={selected.current_odometer} nextDueMiles={log.next_due_miles} />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}
