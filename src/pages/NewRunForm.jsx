import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import TopBar from '../components/layout/TopBar'

const fieldClass = 'w-full bg-navy-800 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/30'

export default function NewRunForm() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [form, setForm] = useState({
    pickup_address: '', dropoff_address: '', cargo_description: '',
    temp_sensitive: false, driver_id: '', vehicle_id: '', contract_id: '', scheduled_at: '',
  })
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id, full_name').eq('role', 'driver'),
      supabase.from('vehicles').select('id, name, plate').eq('active', true),
      supabase.from('contracts').select('id, name').eq('status', 'active'),
    ]).then(([d, v, c]) => {
      setDrivers(d.data ?? [])
      setVehicles(v.data ?? [])
      setContracts(c.data ?? [])
    })
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

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
        <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Addresses</h2>
          <div>
            <label className="block text-xs text-white/50 mb-1">Pickup Address *</label>
            <input required value={form.pickup_address} onChange={e => set('pickup_address', e.target.value)} className={fieldClass} placeholder="123 Main St, City, ST" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Dropoff Address *</label>
            <input required value={form.dropoff_address} onChange={e => set('dropoff_address', e.target.value)} className={fieldClass} placeholder="456 Oak Ave, City, ST" />
          </div>
        </div>

        <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Cargo</h2>
          <textarea value={form.cargo_description} onChange={e => set('cargo_description', e.target.value)} className={fieldClass} rows={2} placeholder="Lab specimens, blood draw kit…" />
          <label className="flex items-center gap-3">
            <div
              className={`w-12 h-6 rounded-full transition-colors ${form.temp_sensitive ? 'bg-brand-600' : 'bg-white/20'} relative cursor-pointer`}
              onClick={() => set('temp_sensitive', !form.temp_sensitive)}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.temp_sensitive ? 'translate-x-6' : ''}`} />
            </div>
            <span className="text-sm text-white/70">Temperature sensitive</span>
          </label>
        </div>

        <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Assignment</h2>
          <div>
            <label className="block text-xs text-white/50 mb-1">Driver</label>
            <select value={form.driver_id} onChange={e => set('driver_id', e.target.value)} className={fieldClass}>
              <option value="">Unassigned</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Vehicle</label>
            <select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)} className={fieldClass}>
              <option value="">None</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} · {v.plate}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Contract</label>
            <select value={form.contract_id} onChange={e => set('contract_id', e.target.value)} className={fieldClass}>
              <option value="">None</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Scheduled Time</label>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} className={fieldClass} />
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
