import { useState } from 'react'
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
  const [previewUrl, setPreviewUrl] = useState(null)
  const [blob, setBlob] = useState(null)
  const [mode, setMode] = useState(existingPath ? 'done' : 'idle')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const label = LABELS[photoType]

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBlob(file)
    setPreviewUrl(URL.createObjectURL(file))
    setMode('preview')
  }

  async function confirm() {
    setUploading(true)
    setError('')
    try {
      const position = await getCurrentPosition()
      const path = await uploadPhoto(blob, runId, photoType, position)

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

  function retake() {
    setPreviewUrl(null)
    setBlob(null)
    setMode('idle')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-50">
        <span className="text-lg">{label.icon}</span>
        <span className="text-sm font-semibold text-gray-800">{label.title}</span>
        {mode === 'done' && <span className="ml-auto text-xs text-green-600 font-medium">✓ Captured</span>}
      </div>

      {/* Preview */}
      {mode === 'preview' && previewUrl && (
        <div className="aspect-video bg-black">
          <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
        </div>
      )}

      {/* Done */}
      {mode === 'done' && (
        <div className="aspect-video bg-brand-50 flex items-center justify-center">
          <span className="text-4xl">✅</span>
        </div>
      )}

      {/* Idle placeholder */}
      {mode === 'idle' && (
        <div className="aspect-video bg-gray-50 flex items-center justify-center">
          <span className="text-5xl opacity-10">📷</span>
        </div>
      )}

      <div className="px-4 py-3">
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

        {mode === 'idle' && (
          <label className="block w-full bg-brand-900 text-brand-50 font-semibold py-2.5 rounded-xl text-sm text-center cursor-pointer active:bg-brand-800">
            Take Photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}

        {mode === 'preview' && (
          <div className="flex gap-2">
            <button onClick={retake} className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2.5 rounded-xl text-sm">
              Retake
            </button>
            <button onClick={confirm} disabled={uploading} className="flex-1 bg-brand-900 text-brand-50 font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
              {uploading ? 'Uploading…' : 'Use Photo'}
            </button>
          </div>
        )}

        {mode === 'done' && (
          <button onClick={retake} className="w-full bg-gray-100 text-gray-500 font-medium py-2 rounded-xl text-xs">
            Retake
          </button>
        )}
      </div>
    </div>
  )
}
