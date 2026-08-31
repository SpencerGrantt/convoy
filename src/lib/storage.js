import { supabase } from './supabase'

// storage.upload() has no built-in timeout or AbortSignal support (unlike
// supabase.functions.invoke(), see invokeFn in ./supabase.js) — on a weak
// mobile connection the request can stall indefinitely with the caller's
// promise never settling, leaving the UI stuck on "Uploading…" forever with
// no error to react to. This doesn't cancel the underlying request (the SDK
// gives us no handle to do that), but it does guarantee the caller gets a
// result to react to either way.
function withTimeout(promise, ms, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out. Check your connection and try again`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// Phone camera photos routinely run 3-12MB at full resolution. Uploaded raw
// over a driver's cellular connection, that's exactly what tends to stall —
// downscaling client-side before upload makes the request both smaller and
// far more likely to finish inside the timeout above. Falls back to the
// original file if the browser can't decode it (compression is an
// optimization, not a requirement — never block the upload on it).
export async function compressImage(file, { maxDimension = 1600, quality = 0.75 } = {}) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    return blob ?? file
  } catch {
    return file
  }
}

export async function uploadPhoto(blob, runId, photoType, position) {
  const ext = 'jpg'
  const path = `${runId}/${photoType}_${Date.now()}.${ext}`
  const { data, error } = await withTimeout(
    supabase.storage.from('run-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false }),
    45000, 'Photo upload'
  )
  if (error) throw error
  return data.path
}

export async function uploadInspectionPhoto(blob, driverId) {
  const ext = 'jpg'
  const path = `${driverId}/${Date.now()}.${ext}`
  const { data, error } = await withTimeout(
    supabase.storage.from('vehicle-inspections').upload(path, blob, { contentType: 'image/jpeg', upsert: false }),
    45000, 'Photo upload'
  )
  if (error) throw error
  return data.path
}

export async function uploadSignature(blob, runId) {
  const path = `${runId}/signature_${Date.now()}.png`
  const { data, error } = await withTimeout(
    supabase.storage.from('signatures').upload(path, blob, { contentType: 'image/png', upsert: false }),
    45000, 'Signature upload'
  )
  if (error) throw error
  return data.path
}

export function getPhotoUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function getSignedUrl(bucket, path) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}
