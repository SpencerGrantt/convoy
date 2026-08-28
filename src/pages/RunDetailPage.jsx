import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateCustodyPDF } from '../lib/pdf'
import { useAuth } from '../hooks/useAuth'
import StatusPill from '../components/ui/StatusPill'
import TopBar from '../components/layout/TopBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { safeFormatDate } from '../lib/dates'

const STATUS_FLOW = ['pending', 'assigned', 'in_transit', 'delivered']

export default function RunDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [run, setRun] = useState(null)
  const [custody, setCustody] = useState([])
  const [photos, setPhotos] = useState([])
  const [signatures, setSignatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [updateErr, setUpdateErr] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [pdfMsg, setPdfMsg] = useState('')

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
    setUpdateErr('')
    try {
      const update = { status: nextStatus }
      if (nextStatus === 'in_transit') update.picked_up_at = new Date().toISOString()
      if (nextStatus === 'delivered')  update.delivered_at  = new Date().toISOString()
      const { error } = await supabase.from('runs').update(update).eq('id', id)
      if (error) throw error
      await supabase.from('custody_events').insert({ run_id: id, company_id: run.company_id, event_type: nextStatus })
      setRun(r => ({ ...r, ...update }))
      setAdvanced(true)
      setTimeout(() => setAdvanced(false), 2000)
    } catch (err) {
      setUpdateErr(err.message)
    } finally {
      setUpdating(false)
    }
  }

  function downloadPDF() {
    try {
      const doc = generateCustodyPDF(run, photos, signatures, custody)
      doc.save(`vantar-run-${id.slice(0, 8)}.pdf`)
      setPdfMsg('success')
    } catch (err) {
      setPdfMsg(`Error: ${err.message}`)
    } finally {
      setTimeout(() => setPdfMsg(''), 3000)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Run Detail" />
      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">
        <div className="bg-navy-700 rounded-2xl p-4 border border-fg/[0.07] space-y-3">
          <div className="flex items-center justify-between">
            <StatusPill status={run?.status} />
            {run?.temp_sensitive && <span className="text-xs bg-brand-500/20 text-brand-300 px-2 py-1 rounded-lg">❄️ Temp Sensitive</span>}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-fg/40">Pickup</p>
            <p className="font-medium text-fg">{run?.pickup_address}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-fg/40">Dropoff</p>
            <p className="font-medium text-fg">{run?.dropoff_address}</p>
          </div>
          {run?.cargo_description && (
            <div className="space-y-1">
              <p className="text-xs text-fg/40">Cargo</p>
              <p className="text-sm text-fg/70">{run.cargo_description}</p>
            </div>
          )}
          <div className="flex gap-4 text-xs text-fg/50 pt-1 border-t border-fg/[0.06]">
            <span>Crew: <strong className="text-fg/80">{run?.profiles?.full_name ?? '—'}</strong></span>
            <span>Vehicle: <strong className="text-fg/80">{run?.vehicles?.name ?? '—'}</strong></span>
          </div>
        </div>

        {(run?.contracts?.name || run?.broker_name || run?.bol_number || run?.rate_per_mile || run?.loaded_miles || run?.deadhead_miles) && (
          <div className="bg-navy-700 rounded-2xl p-4 border border-fg/[0.07] space-y-2">
            <h3 className="text-xs font-semibold text-fg/40 uppercase tracking-wide">Load Details</h3>
            {run?.contracts?.name ? (
              <div className="flex justify-between text-sm"><span className="text-fg/40">Contract</span><span className="text-fg font-medium">{run.contracts.name}</span></div>
            ) : run?.broker_name ? (
              <div className="flex justify-between text-sm"><span className="text-fg/40">Broker/Customer</span><span className="text-fg font-medium">{run.broker_name}</span></div>
            ) : null}
            {run?.bol_number && (
              <div className="flex justify-between text-sm"><span className="text-fg/40">BOL #</span><span className="text-fg font-medium">{run.bol_number}</span></div>
            )}
            {run?.rate_per_mile != null && (
              <div className="flex justify-between text-sm"><span className="text-fg/40">Rate/mile</span><span className="text-fg font-medium">${Number(run.rate_per_mile).toFixed(2)}</span></div>
            )}
            {(run?.loaded_miles != null || run?.deadhead_miles != null) && (
              <div className="flex justify-between text-sm">
                <span className="text-fg/40">Miles (loaded / deadhead)</span>
                <span className="text-fg font-medium">{run?.loaded_miles ?? 0} / {run?.deadhead_miles ?? 0}</span>
              </div>
            )}
          </div>
        )}

        {run?.status !== 'delivered' && run?.status !== 'cancelled' &&
          (profile?.role === 'owner' || profile?.role === 'dispatcher' || run?.driver_id === profile?.id) && (
          <button
            onClick={advanceStatus}
            disabled={updating}
            className={`w-full font-bold py-3 rounded-xl disabled:opacity-50 transition-colors ${advanced ? 'bg-green-600 text-white' : 'bg-brand-600 text-white active:bg-brand-700'}`}
          >
            {updating ? 'Updating…' : advanced ? '✓ Status Updated' : `Mark as ${STATUS_FLOW[STATUS_FLOW.indexOf(run?.status) + 1]?.replace('_', ' ')}`}
          </button>
        )}
        {updateErr && <p className="text-red-400 text-xs font-medium text-center">{updateErr}</p>}

        <button
          onClick={() => navigate(`/photos?runId=${id}`)}
          className="w-full bg-fg/10 text-fg/80 font-semibold py-3 rounded-xl active:bg-fg/15 transition-colors"
        >
          📸 View / Add Photos
        </button>

        <button
          onClick={downloadPDF}
          className={`w-full font-semibold py-3 rounded-xl transition-colors ${pdfMsg === 'success' ? 'bg-green-500/20 text-green-300' : pdfMsg ? 'bg-red-500/20 text-red-300' : 'bg-fg/10 text-fg/80 active:bg-fg/15'}`}
        >
          {pdfMsg === 'success' ? '✓ PDF Downloaded' : pdfMsg || '📄 Download Chain of Custody PDF'}
        </button>

        {custody.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-fg/40 uppercase tracking-wide mb-2">Chain of Custody</h3>
            <div className="space-y-2">
              {custody.map(event => (
                <div key={event.id} className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-fg/80 capitalize">{event.event_type.replace('_', ' ')}</p>
                    <p className="text-xs text-fg/40">{safeFormatDate(event.created_at, 'MMM d, h:mm a')} · {event.profiles?.full_name ?? 'System'}</p>
                    {event.note && <p className="text-xs text-fg/50 mt-0.5">{event.note}</p>}
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
