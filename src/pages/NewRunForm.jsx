import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { geocodeAddress } from '../lib/geocode'
import { haversineMiles } from '../lib/geo'
import TopBar from '../components/layout/TopBar'

const fieldClass = 'w-full bg-navy-800 border border-fg/10 text-fg rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-fg/30'

const ACTIVE_STATUSES = ['assigned', 'in_transit']

// Ranks drivers for the "Suggested Crew" panel by availability first, then
// proximity. Proximity has no live GPS feed to work from — the app doesn't
// track driver location continuously — so "where a driver probably is" is
// approximated as the dropoff point of their most recent run (falling back
// to that run's pickup point if it was never geocoded), i.e. wherever
// they'll likely be free from next. Drivers with no run history, or whose
// past runs were never geocoded, simply sort after everyone with a known
// distance rather than being excluded.
function rankDrivers(drivers, recentRuns, pickupCoords) {
  const lastPointByDriver = new Map()
  const activeCountByDriver = new Map()

  for (const r of recentRuns) {
    if (!r.driver_id) continue
    if (ACTIVE_STATUSES.includes(r.status)) {
      activeCountByDriver.set(r.driver_id, (activeCountByDriver.get(r.driver_id) ?? 0) + 1)
    }
    if (!lastPointByDriver.has(r.driver_id)) {
      const point = (r.dropoff_lat != null && r.dropoff_lng != null)
        ? { lat: r.dropoff_lat, lng: r.dropoff_lng }
        : (r.pickup_lat != null && r.pickup_lng != null)
          ? { lat: r.pickup_lat, lng: r.pickup_lng }
          : null
      if (point) lastPointByDriver.set(r.driver_id, point)
    }
  }

  return drivers
    .map(d => {
      const activeCount = activeCountByDriver.get(d.id) ?? 0
      const point = lastPointByDriver.get(d.id) ?? null
      const distance = point && pickupCoords
        ? haversineMiles(pickupCoords.lat, pickupCoords.lng, point.lat, point.lng)
        : null
      return { ...d, activeCount, distance }
    })
    .sort((a, b) => {
      if ((a.activeCount === 0) !== (b.activeCount === 0)) return a.activeCount === 0 ? -1 : 1
      if (a.distance == null && b.distance == null) return a.activeCount - b.activeCount
      if (a.distance == null) return 1
      if (b.distance == null) return -1
      return a.distance - b.distance
    })
}

export default function NewRunForm() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [form, setForm] = useState({
    pickup_address: '', dropoff_address: '', cargo_description: '',
    temp_sensitive: false, driver_id: '', vehicle_id: '', contract_id: '', scheduled_at: '',
    broker_name: '', bol_number: '', rate_per_mile: '', loaded_miles: '', deadhead_miles: '',
  })
  const [pickupCoords, setPickupCoords] = useState(null)
  const [dropoffCoords, setDropoffCoords] = useState(null)
  const [geocodingField, setGeocodingField] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [contracts, setContracts] = useState([])
  const [recentRuns, setRecentRuns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id, full_name').eq('role', 'driver'),
      supabase.from('vehicles').select('id, name, plate').eq('active', true),
      supabase.from('contracts').select('id, name').eq('status', 'active'),
      // Recent runs only, not the full history — enough to establish each
      // driver's current workload and last known dropoff point without
      // pulling the company's entire run archive into a creation form.
      supabase.from('runs')
        .select('driver_id, status, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, created_at')
        .not('driver_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200),
    ]).then(([d, v, c, r]) => {
      setDrivers(d.data ?? [])
      setVehicles(v.data ?? [])
      setContracts(c.data ?? [])
      setRecentRuns(r.data ?? [])
    })
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function geocodeField(addressKey, setCoords) {
    const address = form[addressKey]
    if (!address?.trim()) { setCoords(null); return }
    setGeocodingField(addressKey)
    const coords = await geocodeAddress(address)
    setCoords(coords)
    setGeocodingField(null)
  }

  const suggestedDrivers = useMemo(
    () => rankDrivers(drivers, recentRuns, pickupCoords),
    [drivers, recentRuns, pickupCoords]
  )

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error: insertError } = await supabase.from('runs').insert({
        ...form,
        company_id: profile.company_id,
        status: form.driver_id ? 'assigned' : 'pending',
        driver_id: form.driver_id || null,
        vehicle_id: form.vehicle_id || null,
        contract_id: form.contract_id || null,
        scheduled_at: form.scheduled_at || null,
        broker_name: form.broker_name || null,
        bol_number: form.bol_number || null,
        rate_per_mile: form.rate_per_mile ? parseFloat(form.rate_per_mile) : null,
        loaded_miles: form.loaded_miles ? parseFloat(form.loaded_miles) : null,
        deadhead_miles: form.deadhead_miles ? parseFloat(form.deadhead_miles) : null,
        pickup_lat: pickupCoords?.lat ?? null,
        pickup_lng: pickupCoords?.lng ?? null,
        dropoff_lat: dropoffCoords?.lat ?? null,
        dropoff_lng: dropoffCoords?.lng ?? null,
      }).select().single()

      if (insertError) throw insertError

      await supabase.from('custody_events').insert({
        run_id: data.id, company_id: profile.company_id,
        actor_id: profile.id, event_type: 'created',
      })
      navigate(`/runs/${data.id}`)
    } catch (e) {
      setError(e.message ?? 'Failed to create run')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="New Run" />
      <form onSubmit={submit} className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">
        <div className="bg-navy-700 rounded-2xl p-4 border border-fg/[0.07] space-y-3">
          <h2 className="text-xs font-semibold text-fg/40 uppercase tracking-wide">Addresses</h2>
          <div>
            <label className="block text-xs text-fg/50 mb-1">Pickup Address *</label>
            <input
              required value={form.pickup_address}
              onChange={e => { set('pickup_address', e.target.value); setPickupCoords(null) }}
              onBlur={() => geocodeField('pickup_address', setPickupCoords)}
              className={fieldClass} placeholder="123 Main St, City, ST"
            />
            {geocodingField === 'pickup_address' && <p className="text-[10px] text-fg/30 mt-1">Locating…</p>}
          </div>
          <div>
            <label className="block text-xs text-fg/50 mb-1">Dropoff Address *</label>
            <input
              required value={form.dropoff_address}
              onChange={e => { set('dropoff_address', e.target.value); setDropoffCoords(null) }}
              onBlur={() => geocodeField('dropoff_address', setDropoffCoords)}
              className={fieldClass} placeholder="456 Oak Ave, City, ST"
            />
            {geocodingField === 'dropoff_address' && <p className="text-[10px] text-fg/30 mt-1">Locating…</p>}
          </div>
        </div>

        <div className="bg-navy-700 rounded-2xl p-4 border border-fg/[0.07] space-y-3">
          <h2 className="text-xs font-semibold text-fg/40 uppercase tracking-wide">Cargo</h2>
          <textarea value={form.cargo_description} onChange={e => set('cargo_description', e.target.value)} className={fieldClass} rows={2} placeholder="Lab specimens, blood draw kit…" />
          <label className="flex items-center gap-3">
            <div
              className={`w-12 h-6 rounded-full transition-colors ${form.temp_sensitive ? 'bg-brand-600' : 'bg-fg/20'} relative cursor-pointer`}
              onClick={() => set('temp_sensitive', !form.temp_sensitive)}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.temp_sensitive ? 'translate-x-6' : ''}`} />
            </div>
            <span className="text-sm text-fg/70">Temperature sensitive</span>
          </label>
        </div>

        <div className="bg-navy-700 rounded-2xl p-4 border border-fg/[0.07] space-y-3">
          <h2 className="text-xs font-semibold text-fg/40 uppercase tracking-wide">Assignment</h2>

          {suggestedDrivers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-fg/50">
                Suggested Crew
                {!pickupCoords && ', ranked by availability (enter a pickup address to also rank by distance)'}
              </p>
              {suggestedDrivers.slice(0, 3).map(d => (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => set('driver_id', d.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-colors ${
                    form.driver_id === d.id ? 'bg-brand-500/20 border border-brand-500/40' : 'bg-navy-800 border border-fg/10'
                  }`}
                >
                  <span className="text-sm text-fg font-medium truncate">{d.full_name}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${d.activeCount === 0 ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                      {d.activeCount === 0 ? 'Available' : `On ${d.activeCount} run${d.activeCount === 1 ? '' : 's'}`}
                    </span>
                    <span className="text-[10px] text-fg/40 w-20 text-right">
                      {d.distance != null ? `${d.distance.toFixed(1)} mi away` : 'Location unknown'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs text-fg/50 mb-1">Crew</label>
            <select value={form.driver_id} onChange={e => set('driver_id', e.target.value)} className={fieldClass}>
              <option value="">Unassigned</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg/50 mb-1">Vehicle</label>
            <select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)} className={fieldClass}>
              <option value="">None</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} · {v.plate}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg/50 mb-1">Contract</label>
            <select value={form.contract_id} onChange={e => set('contract_id', e.target.value)} className={fieldClass}>
              <option value="">None, commercial/broker run</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg/50 mb-1">Scheduled Time</label>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} className={fieldClass} />
          </div>
        </div>

        <div className="bg-navy-700 rounded-2xl p-4 border border-fg/[0.07] space-y-3">
          <h2 className="text-xs font-semibold text-fg/40 uppercase tracking-wide">Load Details</h2>
          {!form.contract_id && (
            <div>
              <label className="block text-xs text-fg/50 mb-1">Broker / Customer</label>
              <input value={form.broker_name} onChange={e => set('broker_name', e.target.value)} className={fieldClass} placeholder="e.g. ABC Logistics" />
            </div>
          )}
          <div>
            <label className="block text-xs text-fg/50 mb-1">BOL #</label>
            <input value={form.bol_number} onChange={e => set('bol_number', e.target.value)} className={fieldClass} placeholder="Bill of lading number" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-fg/50 mb-1">Rate/mile</label>
              <input type="number" step="0.01" min="0" value={form.rate_per_mile} onChange={e => set('rate_per_mile', e.target.value)} className={fieldClass} placeholder="$" />
            </div>
            <div>
              <label className="block text-xs text-fg/50 mb-1">Loaded mi</label>
              <input type="number" step="0.1" min="0" value={form.loaded_miles} onChange={e => set('loaded_miles', e.target.value)} className={fieldClass} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-fg/50 mb-1">Deadhead mi</label>
              <input type="number" step="0.1" min="0" value={form.deadhead_miles} onChange={e => set('deadhead_miles', e.target.value)} className={fieldClass} placeholder="0" />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-600/30 rounded-xl px-4 py-3">
            <p className="text-red-300 text-sm font-medium">Error</p>
            <p className="text-red-400 text-xs mt-0.5">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 active:bg-brand-700"
        >
          {loading ? 'Creating…' : 'Create Run'}
        </button>
      </form>
    </div>
  )
}
