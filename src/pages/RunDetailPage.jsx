import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateCustodyPDF } from '../lib/pdf'
import StatusPill from '../components/ui/StatusPill'
import TopBar from '../components/layout/TopBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { format } from 'date-fns'

const STATUS_FLOW = ['pending', 'assigned', 'in_transit', 'delivered']

export default function RunDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(null)
  const [custody, setCustody] = useState([])
  const [photos, setPhotos] = useState([])
  const [signatures, setSignatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: run }, { data: events }, { data: ph }, { data: sigs }] = await Promise.all([
        supabase
          .from('runs')
          .select('*, profiles!driver_id(full_name), vehicles(name, plate), contracts(name)')
          .eq('id', id)
          .single(),
        supabase
          .from('custody_events')
          .select('*, profiles!actor_id(full_name)')
          .eq('run_id', id)
          .order('created_at', { ascending: true }),
        supabase.from('photos').select('*').eq('run_id', id),
        supabase.from('signatures').select('*').eq('run_id', id),
      ])
      setRun(run)
      setPhotos(ph ?? [])
      setSignatures(sigs ?? [])
      setCustody(events ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  async function advanceStatus() {
    const idx = STATUS_FLOW.indexOf(run.status)
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return
    const nextStatus = STATUS_FLOW[idx + 1]
    setUpdating(true)
    const update = { status: nextStatus }
    if (nextStatus === 'in_transit') update.picked_up_at = new Date().toISOString()
    if (nextStatus === 'delivered')  update.delivered_at  = new Date().toISOString()
    await supabase.from('runs').update(update).eq('id', id)
    await supabase.from('custody_events').insert({ run_id: id, company_id: run.company_id, event_type: nextStatus })
    setRun(r => ({ ...r, ...update }))
    setUpdating(false)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="pb-24">
      <TopBar title="Run Detail" />
      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <StatusPill status={run?.status} />
            {run?.temp_sensitive && <span className="text-xs bg-brand-50 text-brand-800 px-2 py-1 rounded-lg">❄️ Temp Sensitive</span>}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Pickup</p>
            <p className="font-medium text-gray-900">{run?.pickup_address}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Dropoff</p>
            <p className="font-medium text-gray-900">{run?.dropoff_address}</p>
          </div>
          {run?.cargo_description && (
            <div className="space-y-1">
              <p className="text-xs text-gray-400">Cargo</p>
              <p className="text-sm text-gray-700">{run.cargo_description}</p>
            </div>
          )}
          <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t border-gray-50">
            <span>Driver: <strong>{run?.profiles?.full_name ?? '—'}</strong></span>
            <span>Vehicle: <strong>{run?.vehicles?.name ?? '—'}</strong></span>
          </div>
        </div>

        {run?.status !== 'delivered' && run?.status !== 'cancelled' && (
          <button
            onClick={advanceStatus}
            disabled={updating}
            className="w-full bg-brand-900 text-brand-50 font-bold py-3 rounded-xl disabled:opacity-50 active:bg-brand-800 transition-colors"
          >
            {updating ? 'Updating…' : `Mark as ${STATUS_FLOW[STATUS_FLOW.indexOf(run?.status) + 1]?.replace('_', ' ')}`}
          </button>
        )}

        <button
          onClick={() => navigate(`/photos?runId=${id}`)}
          className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl active:bg-gray-200 transition-colors"
        >
          📸 View / Add Photos
        </button>

        <button
          onClick={() => {
            const doc = generateCustodyPDF(run, photos, signatures, custody)
            doc.save(`convoy-run-${id.slice(0, 8)}.pdf`)
          }}
          className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl active:bg-gray-200 transition-colors"
        >
          📄 Download Chain of Custody PDF
        </button>

        {custody.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Chain of Custody</h3>
            <div className="space-y-2">
              {custody.map(event => (
                <div key={event.id} className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 capitalize">{event.event_type.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-400">{format(new Date(event.created_at), 'MMM d, h:mm a')} · {event.profiles?.full_name ?? 'System'}</p>
                    {event.note && <p className="text-xs text-gray-500 mt-0.5">{event.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
