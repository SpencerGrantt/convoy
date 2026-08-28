import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { uploadInspectionPhoto, compressImage } from '../lib/storage'
import TopBar from '../components/layout/TopBar'
import CameraCapture from '../components/photos/CameraCapture'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

const fieldClass = 'w-full bg-navy-800 border border-fg/10 text-fg rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-fg/30'

// Standard checklist for a medical courier vehicle — covers roadworthiness
// (tires/lights/brakes/mirrors/fluids) plus the two items specific to this
// business: a secure, clean cargo area and an intact cold-chain seal for
// temperature-sensitive specimens.
const CHECKLIST_ITEMS = [
  { key: 'tires',          label: 'Tires & Tire Pressure' },
  { key: 'lights',         label: 'Lights & Turn Signals' },
  { key: 'brakes',         label: 'Brakes' },
  { key: 'mirrors',        label: 'Mirrors & Windshield' },
  { key: 'fluids',         label: 'Fluid Levels (oil, coolant, washer)' },
  { key: 'cargo_area',     label: 'Cargo Area — Clean & Secure' },
  { key: 'seatbelts_horn', label: 'Seatbelts & Horn' },
  { key: 'cold_chain',     label: 'Cooler / Temp-Sensitive Storage Seal' },
]

const ANSWERS = [
  { value: 'pass', label: 'Pass', on: 'bg-green-600 text-white', off: 'bg-navy-800 text-fg/40' },
  { value: 'fail', label: 'Fail', on: 'bg-red-600 text-white',   off: 'bg-navy-800 text-fg/40' },
  { value: 'na',   label: 'N/A',  on: 'bg-fg/20 text-fg',  off: 'bg-navy-800 text-fg/40' },
]

function ChecklistRow({ item, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-fg/[0.06] last:border-b-0">
      <span className="text-sm text-fg/80 flex-1 min-w-0">{item.label}</span>
      <div className="flex gap-1 shrink-0">
        {ANSWERS.map(a => (
          <button
            key={a.value}
            type="button"
            onClick={() => onChange(item.key, a.value)}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${value === a.value ? a.on : a.off}`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function VehicleInspection() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const runId = params.get('runId') || null

  const [inspectionType, setInspectionType] = useState('pre_trip')
  const [vehicles, setVehicles] = useState([])
  const [vehicleId, setVehicleId] = useState('')
  const [checklist, setChecklist] = useState({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const [photoMode, setPhotoMode] = useState('idle')
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoBlob, setPhotoBlob] = useState(null)
  const [photoPath, setPhotoPath] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')

  useEffect(() => {
    supabase.from('vehicles').select('id, name, plate, make, model').eq('active', true)
      .then(({ data }) => setVehicles(data ?? []))
  }, [])

  function setAnswer(key, value) {
    setChecklist(c => ({ ...c, [key]: value }))
  }

  function handlePhotoFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoBlob(file)
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoMode('preview')
  }

  function retakePhoto() {
    setPhotoPreview(null)
    setPhotoBlob(null)
    setPhotoPath(null)
    setPhotoMode('idle')
  }

  async function confirmPhoto() {
    setPhotoUploading(true)
    setPhotoError('')
    try {
      const compressed = await compressImage(photoBlob)
      const path = await uploadInspectionPhoto(compressed, profile.id)
      setPhotoPath(path)
      setPhotoMode('done')
    } catch (err) {
      setPhotoError(err.message ?? 'Upload failed — check your connection')
      setPhotoMode('preview')
    } finally {
      setPhotoUploading(false)
    }
  }

  const allAnswered = CHECKLIST_ITEMS.every(item => checklist[item.key])
  const hasFail = CHECKLIST_ITEMS.some(item => checklist[item.key] === 'fail')
  const canSubmit = vehicleId && allAnswered && !saving

  async function submit() {
    if (!canSubmit) return
    setSaving(true)
    setError('')
    try {
      const { error: insertError } = await supabase.from('vehicle_inspections').insert({
        company_id: profile.company_id,
        driver_id: profile.id,
        vehicle_id: vehicleId,
        run_id: runId,
        inspection_type: inspectionType,
        checklist,
        notes: notes || null,
        photo_path: photoPath,
      })
      if (insertError) throw insertError
      setDone(true)
      setTimeout(() => navigate('/'), 1400)
    } catch (err) {
      setError(err.message ?? 'Failed to save inspection')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="pb-24 md:pb-8">
        <TopBar title="Vehicle Inspection" />
        <div className="px-4 pt-16 text-center space-y-3">
          <CheckCircle2 size={40} className="text-green-400 mx-auto" />
          <p className="text-fg font-semibold text-lg">Inspection submitted</p>
          <p className="text-fg/40 text-sm">Returning to your dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Vehicle Inspection" />
      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">

        {/* Type toggle */}
        <div className="bg-navy-700 rounded-2xl p-1.5 border border-fg/[0.07] flex gap-1.5">
          {[
            { value: 'pre_trip',  label: 'Pre-Trip' },
            { value: 'post_trip', label: 'Post-Trip' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setInspectionType(t.value)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                inspectionType === t.value ? 'bg-brand-600 text-white' : 'text-fg/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Vehicle picker */}
        <div className="bg-navy-700 rounded-2xl p-4 border border-fg/[0.07] space-y-2">
          <label className="block text-xs text-fg/50">Vehicle *</label>
          <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={fieldClass}>
            <option value="">Select a vehicle…</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name || `${v.make} ${v.model}`}{v.plate ? ` · ${v.plate}` : ''}</option>
            ))}
          </select>
        </div>

        {/* Checklist */}
        <div className="bg-navy-700 rounded-2xl p-4 border border-fg/[0.07]">
          <h2 className="text-xs font-semibold text-fg/40 uppercase tracking-wide mb-1">Checklist</h2>
          {CHECKLIST_ITEMS.map(item => (
            <ChecklistRow key={item.key} item={item} value={checklist[item.key]} onChange={setAnswer} />
          ))}
        </div>

        {hasFail && (
          <div className="flex items-center gap-2 text-xs text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2.5">
            <AlertTriangle size={14} className="shrink-0" />
            One or more items failed — add details in notes below before submitting.
          </div>
        )}

        {/* Notes */}
        <div className="bg-navy-700 rounded-2xl p-4 border border-fg/[0.07] space-y-2">
          <label className="block text-xs text-fg/50">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className={fieldClass}
            rows={3}
            placeholder="Anything the dispatcher should know…"
          />
        </div>

        {/* Optional photo */}
        <CameraCapture
          icon="🚐"
          title="Vehicle Photo (optional)"
          mode={photoMode}
          previewUrl={photoPreview}
          uploading={photoUploading}
          error={photoError}
          onFileChange={handlePhotoFile}
          onRetake={retakePhoto}
          onConfirm={confirmPhoto}
        />

        {error && (
          <div className="bg-red-900/30 border border-red-600/30 rounded-xl px-4 py-3">
            <p className="text-red-300 text-sm font-medium">Error</p>
            <p className="text-red-400 text-xs mt-0.5">{error}</p>
          </div>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 active:bg-brand-700 transition-colors"
        >
          {saving ? 'Submitting…' : !vehicleId ? 'Select a vehicle to continue' : !allAnswered ? 'Answer every checklist item' : 'Submit Inspection'}
        </button>
      </div>
    </div>
  )
}
