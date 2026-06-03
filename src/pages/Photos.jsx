import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { uploadPhoto, uploadSignature } from '../lib/storage'
import TopBar from '../components/layout/TopBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import StatusPill from '../components/ui/StatusPill'
import CustodyLog from '../components/photos/CustodyLog'
import ReactSignatureCanvas from 'react-signature-canvas'

const SLOTS = [
  { type: 'pickup_before',    icon: '📦', title: 'Pickup — Before Loading' },
  { type: 'pickup_sealed',    icon: '🔒', title: 'Pickup — Sealed Package' },
  { type: 'delivery_arrived', icon: '🚪', title: 'Delivery — Arrived' },
]

function PhotoSlot({ slot, runId, companyId, profile, existingPath, onCaptured }) {
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(!!existingPath)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    setUploading(true)
    setError('')
    try {
      const pos = await getPosition()
      const path = await uploadPhoto(file, runId, slot.type, pos)
      await supabase.from('photos').insert({
        run_id: runId, company_id: companyId, driver_id: profile?.id,
        photo_type: slot.type, storage_path: path,
        lat: pos?.lat ?? null, lng: pos?.lng ?? null,
      })
      await supabase.from('custody_events').insert({
        run_id: runId, company_id: companyId, actor_id: profile?.id,
        event_type: `photo_${slot.type}`, lat: pos?.lat ?? null, lng: pos?.lng ?? null,
      })
      setDone(true)
      onCaptured?.(path)
    } catch (err) {
      setError(err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-50">
        <span className="text-lg">{slot.icon}</span>
        <span className="text-sm font-semibold text-gray-800">{slot.title}</span>
        {done && <span className="ml-auto text-xs text-green-600 font-medium">✓ Captured</span>}
      </div>

      {preview && (
        <div className="aspect-video bg-black">
          <img src={preview} className="w-full h-full object-cover" alt="preview" />
        </div>
      )}
      {!preview && (
        <div className="aspect-video bg-gray-50 flex items-center justify-center">
          <span className="text-5xl opacity-10">📷</span>
        </div>
      )}

      <div className="px-4 py-3">
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        {uploading && <p className="text-xs text-brand-700 mb-2">Uploading…</p>}
        {done && !uploading && <p className="text-xs text-green-600 mb-2">Photo saved ✓</p>}
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          disabled={uploading}
          className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-900 file:text-brand-50 disabled:opacity-50"
        />
      </div>
    </div>
  )
}

function getPosition() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 }
    )
  })
}

export default function Photos() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const runId = params.get('runId')
  const sigRef = useRef(null)

  const [run, setRun] = useState(null)
  const [photos, setPhotos] = useState([])
  const [signatures, setSignatures] = useState([])
  const [custody, setCustody] = useState([])
  const [loading, setLoading] = useState(true)
  const [signerName, setSignerName] = useState('')
  const [signerLocation, setSignerLocation] = useState('')
  const [savingSig, setSavingSig] = useState(false)
  const [sigDone, setSigDone] = useState(false)

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
      setSigDone((sigs ?? []).length > 0)
      setCustody(ev ?? [])
      setLoading(false)
    }
    load()
  }, [runId])

  const companyId = run?.company_id ?? profile?.company_id

  async function saveSignature() {
    if (sigRef.current?.isEmpty()) return
    setSavingSig(true)
    try {
      const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png')
      const blob = await (await fetch(dataUrl)).blob()
      const path = await uploadSignature(blob, runId)
      await supabase.from('signatures').insert({ run_id: runId, company_id: companyId, signer_name: signerName, storage_path: path })
      const note = [signerName && `Signed by ${signerName}`, signerLocation && `at ${signerLocation}`].filter(Boolean).join(' ')
      await supabase.from('custody_events').insert({ run_id: runId, company_id: companyId, actor_id: profile?.id, event_type: 'signature_captured', note: note || null })
      setSigDone(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingSig(false)
    }
  }

  if (!runId) {
    return (
      <div className="pb-24">
        <TopBar title="Photos" />
        <div className="px-4 pt-12 text-center space-y-4">
          <p className="text-4xl">📸</p>
          <p className="text-gray-500 font-medium">No run selected</p>
          <button onClick={() => navigate('/runs')} className="bg-brand-900 text-brand-50 font-semibold px-6 py-3 rounded-xl text-sm">Go to Runs</button>
        </div>
      </div>
    )
  }

  if (loading) return <div className="pb-24"><TopBar title="Photos" /><LoadingSpinner /></div>

  const capturedCount = SLOTS.filter(s => photos.find(p => p.photo_type === s.type)).length + (sigDone ? 1 : 0)

  return (
    <div className="pb-24">
      <TopBar title="Photos" />
      <div className="px-4 pt-4 space-y-4">

        {run && (
          <div className="bg-brand-900 text-brand-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-brand-400 uppercase tracking-wide font-medium">Active Run</p>
              <StatusPill status={run.status} />
            </div>
            <p className="text-sm font-semibold truncate">{run.dropoff_address}</p>
            <p className="text-xs text-brand-400 mt-0.5 truncate">From: {run.pickup_address}</p>
          </div>
        )}

        {/* Progress */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Progress</p>
          <div className="flex gap-1.5 mb-2">
            {[...SLOTS, { type: 'sig' }].map((s, i) => {
              const done = s.type === 'sig' ? sigDone : !!photos.find(p => p.photo_type === s.type)
              return <div key={i} className={`flex-1 h-1.5 rounded-full ${done ? 'bg-brand-900' : 'bg-gray-200'}`} />
            })}
          </div>
          <p className="text-xs text-gray-400">{capturedCount} / 4 complete</p>
        </div>

        {/* Photo slots */}
        {SLOTS.map(slot => (
          <PhotoSlot
            key={slot.type}
            slot={slot}
            runId={runId}
            companyId={companyId}
            profile={profile}
            existingPath={photos.find(p => p.photo_type === slot.type)?.storage_path}
            onCaptured={path => setPhotos(prev => [...prev, { photo_type: slot.type, storage_path: path }])}
          />
        ))}

        {/* Signature */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-50">
            <span className="text-lg">✍️</span>
            <span className="text-sm font-semibold text-gray-800">Recipient Signature</span>
            {sigDone && <span className="ml-auto text-xs text-green-600 font-medium">✓ Signed</span>}
          </div>
          {sigDone ? (
            <div className="px-4 py-6 text-center text-green-600 font-medium text-sm">Signature captured ✓</div>
          ) : (
            <div className="px-4 py-3 space-y-3">
              <input
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Recipient name (optional)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
              <input
                value={signerLocation}
                onChange={e => setSignerLocation(e.target.value)}
                placeholder="Delivery location (optional)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
              <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                <ReactSignatureCanvas
                  ref={sigRef}
                  penColor="#1a2332"
                  canvasProps={{ className: 'w-full', height: 140 }}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => sigRef.current?.clear()} className="flex-1 bg-gray-100 text-gray-600 font-semibold py-2.5 rounded-xl text-sm">Clear</button>
                <button onClick={saveSignature} disabled={savingSig} className="flex-1 bg-brand-900 text-brand-50 font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {savingSig ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>

        <CustodyLog events={custody} />
      </div>
    </div>
  )
}
