import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { uploadPhoto } from '../lib/storage'
import TopBar from '../components/layout/TopBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function Photos() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const runId = params.get('runId')

  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!runId) { setLoading(false); return }
    supabase.from('runs')
      .select('id, status, pickup_address, dropoff_address, company_id')
      .eq('id', runId)
      .single()
      .then(({ data }) => { setRun(data); setLoading(false) })
  }, [runId])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('Uploading…')
    try {
      const path = await uploadPhoto(file, runId, 'pickup_before', null)
      await supabase.from('photos').insert({
        run_id: runId,
        company_id: run?.company_id ?? profile?.company_id,
        driver_id: profile?.id,
        photo_type: 'pickup_before',
        storage_path: path,
      })
      setStatus('✅ Photo saved!')
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    }
  }

  if (!runId) {
    return (
      <div className="pb-24">
        <TopBar title="Photos" />
        <div className="px-4 pt-12 text-center space-y-4">
          <p className="text-4xl">📸</p>
          <p className="text-gray-500 font-medium">No run selected</p>
          <button onClick={() => navigate('/runs')} className="bg-brand-900 text-brand-50 font-semibold px-6 py-3 rounded-xl text-sm">
            Go to Runs
          </button>
        </div>
      </div>
    )
  }

  if (loading) return <div className="pb-24"><TopBar title="Photos" /><LoadingSpinner /></div>

  return (
    <div className="pb-24">
      <TopBar title="Photos" />
      <div className="px-4 pt-6 space-y-4">
        {run && (
          <div className="bg-brand-900 text-brand-50 rounded-2xl p-4">
            <p className="text-sm font-semibold">{run.dropoff_address}</p>
            <p className="text-xs text-brand-400 mt-0.5">From: {run.pickup_address}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-gray-800">Test — Take a Photo</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="text-sm text-gray-600"
          />
          {status && <p className="text-sm font-medium text-gray-700">{status}</p>}
        </div>
      </div>
    </div>
  )
}
