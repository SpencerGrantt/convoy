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

  useEffect(() => {
    if (mode === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [mode])

  useEffect(() => () => stopCamera(), [])

  async function startCamera() {
    setError('')

    // Check API availability first
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera not available — use Chrome or Safari on iOS 14.3+')
      return
    }

    try {
      // Use minimal constraints — iOS rejects overly specific ones
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      setMode('camera')
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied — allow access in your browser settings')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device')
      } else {
        setError(`Camera error: ${err.message}`)
      }
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
    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) { setError('Capture failed — try again'); return }
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
        driver_id: profile?.id,
        photo_type: photoType,
        storage_path: path,
        lat: position?.lat ?? null,
        lng: position?.lng ?? null,
      })

      await supabase.from('custody_events').insert({
        run_id: runId,
        company_id: companyId,
        actor_id: profile?.id,
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

      {/* Video always in DOM so ref is never null */}
      <div className={`relative bg-black aspect-video ${mode === 'camera' ? '' : 'hidden'}`}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <button
          onPointerDown={capture}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-brand-50 border-4 border-white shadow-lg active:scale-95 transition-transform"
        />
      </div>

      {mode === 'preview' && previewUrl && (
        <div className="aspect-video bg-black">
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
          <span className="text-5xl opacity-10">📷</span>
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
