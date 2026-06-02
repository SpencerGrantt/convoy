import { useRef, useState } from 'react'
import ReactSignatureCanvas from 'react-signature-canvas'
import { uploadSignature } from '../../lib/storage'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function SignaturePad({ runId, companyId, onSigned, alreadySigned }) {
  const { profile } = useAuth()
  const sigRef = useRef(null)
  const [signerName, setSignerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(alreadySigned ?? false)

  async function save() {
    if (sigRef.current?.isEmpty()) {
      setError('Please provide a signature')
      return
    }
    setSaving(true)
    setError('')
    try {
      const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png')
      const blob = await (await fetch(dataUrl)).blob()
      const path = await uploadSignature(blob, runId)

      await supabase.from('signatures').insert({
        run_id: runId,
        company_id: companyId,
        signer_name: signerName,
        storage_path: path,
      })

      await supabase.from('custody_events').insert({
        run_id: runId,
        company_id: companyId,
        actor_id: profile.id,
        event_type: 'signature_captured',
        note: signerName ? `Signed by ${signerName}` : null,
      })

      setDone(true)
      onSigned?.(path)
    } catch (e) {
      setError(e.message ?? 'Failed to save signature')
    }
    setSaving(false)
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <span className="text-2xl">✍️</span>
        <div>
          <p className="text-sm font-semibold text-gray-800">Signature Captured</p>
          {signerName && <p className="text-xs text-gray-400">{signerName}</p>}
        </div>
        <span className="ml-auto text-xs text-green-600 font-medium">✓ Done</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
        <span className="text-lg">✍️</span>
        <span className="text-sm font-semibold text-gray-800">Recipient Signature</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Recipient Name (optional)</label>
          <input
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            placeholder="John Smith"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Signature</p>
          <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50">
            <ReactSignatureCanvas
              ref={sigRef}
              penColor="#1a2332"
              canvasProps={{ className: 'w-full', height: 140 }}
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={() => sigRef.current?.clear()}
            className="flex-1 bg-gray-100 text-gray-600 font-semibold py-2.5 rounded-xl text-sm"
          >
            Clear
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-brand-900 text-brand-50 font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Confirm Signature'}
          </button>
        </div>
      </div>
    </div>
  )
}
