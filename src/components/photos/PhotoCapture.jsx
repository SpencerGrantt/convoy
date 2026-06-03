import { useRef, useState, useEffect } from 'react'
import { uploadPhoto } from '../../lib/storage'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 }
    )
  })
}

const LABELS = {
  pickup_before:    { title: 'Pickup — Before Loading', icon: '📦' },
  pickup_sealed:    { title: 'Pickup — Sealed Package',  icon: '🔒' },
  delivery_arrived: { title: 'Delivery — Arrived',       icon: '🚪' },
  delivery_signed:  { title: 'Delivery — Signed',        icon: '✅' },
}

export default function PhotoCapture({ runId, companyId, photoType, existingPath, onCaptured }) {
  const { profile } = useAuth()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [mode, setMode] = useState(existingPath ? 'done' : 'idle')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [capturedBlob, setCapturedBlob] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const label = LABELS[photoType]

  // Attach stream to video element after it mounts in 'camera' mode
  useEffect(() => {
    if (mode === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [mode])

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [])

  async function startCamera() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      setMode('camera') // video element now renders → useEffect attaches stream
    } catch {
      setError('Camera access denied — check browser permissions and try again.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      setCapturedBlob(blob)
      setPreviewUrl(URL.createObjectURL(blob))
      stopCamera()
      setMode('preview')
    }, 'image/jpeg', 0.85)
  }

  function retake() {
    setPreviewUrl(null)
    setCapturedBlob(null)
    startCamera()
  }

  async function confirm() {
    setUploading(true)
    setError('')
    try {
      const position = await getCurrentPosition()
      const path = await uploadPhoto(capturedBlob, runId, photoType, position)

      await supabase.from('photos').insert({
        run_id: runId,
        company_id: companyId,
        driver_id: profile.id,
        photo_type: photoType,
        storage_path: path,
        lat: position?.lat ?? null,
        lng: position?.lng ?? null,
      })

      await supabase.from('custody_events').insert({
        run_id: runId,
        company_id: companyId,
        actor_id: profile.id,
        event_type: `photo_${photoType}`,
        lat: position?.lat ?? null,
        lng: position?.lng ?? null,
      })

      setMode('done')
      onCaptured?.(path)
    } catch (e) {
      setError(e.message ?? 'Upload failed — check your connection')
      setMode('preview')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-50">
        <span className="text-lg">{label.icon}</span>
        <span className="text-sm font-semibold text-gray-800">{label.title}</span>
        {mode === 'done' && <span className="ml-auto text-xs text-green-600 font-medium">✓ Captured</span>}
      </div>

      {/* Always in DOM so ref is always set; visibility toggled by mode */}
      <div className={`relative bg-black aspect-video ${mode === 'camera' ? 'block' : 'hidden'}`}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <button
          onClick={capture}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-brand-50 border-4 border-white shadow-lg active:scale-95 transition-transform"
        />
      </div>

      {mode === 'preview' && previewUrl && (
        <div className="relative bg-black aspect-video">
          <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
        </div>
      )}

      {mode === 'done' && (
        <div className="aspect-video bg-brand-50 flex items-center justify-center">
          <span className="text-4xl">✅</span>
        </div>
      )}

      {mode === 'idle' && (
        <div className="aspect-video bg-gray-50 flex items-center justify-center">
          <span className="text-4xl opacity-20">📷</span>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <div className="px-4 py-3">
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

        {mode === 'idle' && (
          <button onClick={startCamera} className="w-full bg-brand-900 text-brand-50 font-semibold py-2.5 rounded-xl text-sm active:bg-brand-800">
            Open Camera
          </button>
        )}

        {mode === 'camera' && (
          <button onClick={() => { stopCamera(); setMode('idle') }} className="w-full bg-gray-100 text-gray-600 font-semibold py-2.5 rounded-xl text-sm">
            Cancel
          </button>
        )}

        {mode === 'preview' && (
          <div className="flex gap-2">
            <button onClick={retake} className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2.5 rounded-xl text-sm">Retake</button>
            <button onClick={confirm} disabled={uploading} className="flex-1 bg-brand-900 text-brand-50 font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
              {uploading ? 'Uploading…' : 'Use Photo'}
            </button>
          </div>
        )}

        {mode === 'done' && (
          <button onClick={() => { setMode('idle'); setPreviewUrl(null) }} className="w-full bg-gray-100 text-gray-500 font-medium py-2 rounded-xl text-xs">
            Retake
          </button>
        )}
      </div>
    </div>
  )
}
