import { supabase } from './supabase'

export async function uploadPhoto(blob, runId, photoType, position) {
  const ext = 'jpg'
  const path = `${runId}/${photoType}_${Date.now()}.${ext}`
  const { data, error } = await supabase.storage
    .from('run-photos')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return data.path
}

export async function uploadSignature(blob, runId) {
  const path = `${runId}/signature_${Date.now()}.png`
  const { data, error } = await supabase.storage
    .from('signatures')
    .upload(path, blob, { contentType: 'image/png', upsert: false })
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
