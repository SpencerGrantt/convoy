import { useState } from 'react'
import { uploadPhoto } from '../../lib/storage'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import CameraCapture from './CameraCapture'

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
  pickup_before:    { title: 'Pickup: Before Loading', icon: '📦' },
  pickup_sealed:    { title: 'Pickup: Sealed Package',  icon: '🔒' },
  delivery_arrived: { title: 'Delivery: Arrived',       icon: '🚪' },
  delivery_signed:  { title: 'Delivery: Signed',        icon: '✅' },
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
      setError(e.message ?? 'Upload failed. Check your connection')
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
    <CameraCapture
      icon={label.icon}
      title={label.title}
      mode={mode}
      previewUrl={previewUrl}
      uploading={uploading}
      error={error}
      onFileChange={handleFileChange}
      onRetake={retake}
      onConfirm={confirm}
    />
  )
}
