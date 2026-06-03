import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import TopBar from '../components/layout/TopBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import StatusPill from '../components/ui/StatusPill'
import PhotoCapture from '../components/photos/PhotoCapture'
import SignaturePad from '../components/photos/SignaturePad'
import CustodyLog from '../components/photos/CustodyLog'
import ErrorBoundary from '../components/ui/ErrorBoundary'

const PHOTO_TYPES = ['pickup_before', 'pickup_sealed', 'delivery_arrived', 'delivery_signed']

export default function Photos() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const runId = params.get('runId')

  const [run, setRun] = useState(null)
  const [photos, setPhotos] = useState([])
  const [signatures, setSignatures] = useState([])
  const [custody, setCustody] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!runId) { setLoading(false); return }
    async function load() {
      const [{ data: run }, { data: ph }, { data: sigs }, { data: ev }] = await Promise.all([
        supabase.from('runs').select('id, status, pickup_address, dropoff_address, company_id').eq('id', runId).single(),
        supabase.from('photos').select('*').eq('run_id', runId),
        supabase.from('signatures').select('*').eq('run_id', runId),
        supabase.from('custody_events').select('*, profiles!actor_id(full_name)').eq('run_id', runId).order('created_at'),
      ])
      setRun(run)
      setPhotos(ph ?? [])
      setSignatures(sigs ?? [])
      setCustody(ev ?? [])
      setLoading(false)
    }
    load()
  }, [runId])

  function getPhoto(type) {
    return photos.find(p => p.photo_type === type)
  }

  if (!runId) {
    return (
      <div className="pb-24">
        <TopBar title="Photos" />
        <div className="px-4 pt-12 text-center space-y-4">
          <p className="text-4xl">📸</p>
          <p className="text-gray-500 font-medium">No run selected</p>
          <button
            onClick={() => navigate('/runs')}
            className="bg-brand-900 text-brand-50 font-semibold px-6 py-3 rounded-xl text-sm"
          >
            Go to Runs
          </button>
        </div>
      </div>
    )
  }

  if (loading) return <div className="pb-24"><TopBar title="Photos" /><LoadingSpinner /></div>

  const companyId = run?.company_id ?? profile?.company_id

  return (
    <div className="pb-24">
      <TopBar title="Photos" />
      <div className="px-4 pt-4 space-y-4">

        {/* Run summary */}

        {run && (
          <div className="bg-brand-900 text-brand-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-brand-400 font-medium uppercase tracking-wide">Active Run</p>
              <StatusPill status={run.status} />
            </div>
            <p className="text-sm font-semibold truncate">{run.dropoff_address}</p>
            <p className="text-xs text-brand-400 mt-0.5 truncate">From: {run.pickup_address}</p>
          </div>
        )}

        {/* Progress bar */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Proof of Delivery Progress</p>
          <div className="flex gap-1.5">
            {PHOTO_TYPES.map(type => {
              const captured = type === 'delivery_signed'
                ? signatures.length > 0
                : !!getPhoto(type)
              return (
                <div key={type} className="flex-1">
                  <div className={`h-1.5 rounded-full ${captured ? 'bg-brand-900' : 'bg-gray-200'}`} />
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {[...PHOTO_TYPES.filter(t => t !== 'delivery_signed').map(t => !!getPhoto(t)), signatures.length > 0].filter(Boolean).length} / 4 complete
          </p>
        </div>

        {/* Photo capture slots */}
        {['pickup_before','pickup_sealed','delivery_arrived'].map(type => (
          <ErrorBoundary key={type}>
            <PhotoCapture
              runId={runId}
              companyId={companyId}
              photoType={type}
              existingPath={getPhoto(type)?.storage_path}
              onCaptured={path => setPhotos(prev => [...prev, { photo_type: type, storage_path: path }])}
            />
          </ErrorBoundary>
        ))}

        {/* Signature pad */}
        <SignaturePad
          runId={runId}
          companyId={companyId}
          alreadySigned={signatures.length > 0}
          onSigned={() => setSignatures(prev => [...prev, { id: Date.now() }])}
        />

        {/* Chain of custody */}
        <CustodyLog events={custody} />
      </div>
    </div>
  )
}
