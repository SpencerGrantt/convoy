// Shared camera-capture UI: idle (take photo) -> preview (retake/confirm) ->
// done. Presentational only — callers own the upload/insert side effects.
// Originally lived inline in PhotoCapture.jsx; extracted so the vehicle
// inspection checklist can reuse the identical capture UX instead of
// duplicating it.
export default function CameraCapture({
  icon,
  title,
  mode,
  previewUrl,
  uploading,
  error,
  onFileChange,
  onRetake,
  onConfirm,
  confirmLabel = 'Use Photo',
  doneIcon = '✅',
}) {
  return (
    <div className="bg-navy-700 rounded-2xl border border-fg/[0.07] overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-fg/[0.06]">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-fg">{title}</span>
        {mode === 'done' && <span className="ml-auto text-xs text-green-400 font-medium">✓ Captured</span>}
      </div>

      {mode === 'preview' && previewUrl && (
        <div className="aspect-video bg-black">
          <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
        </div>
      )}

      {mode === 'done' && (
        <div className="aspect-video bg-navy-800 flex items-center justify-center">
          <span className="text-4xl">{doneIcon}</span>
        </div>
      )}

      {mode === 'idle' && (
        <div className="aspect-video bg-navy-800 flex items-center justify-center">
          <span className="text-5xl opacity-10">📷</span>
        </div>
      )}

      <div className="px-4 py-3">
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

        {mode === 'idle' && (
          <label className="block w-full bg-brand-600 text-white font-semibold py-2.5 rounded-xl text-sm text-center cursor-pointer active:bg-brand-700">
            Take Photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
          </label>
        )}

        {mode === 'preview' && (
          <div className="flex gap-2">
            <button onClick={onRetake} className="flex-1 bg-fg/10 text-fg/70 font-semibold py-2.5 rounded-xl text-sm">
              Retake
            </button>
            <button onClick={onConfirm} disabled={uploading} className="flex-1 bg-brand-600 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
              {uploading ? 'Uploading…' : confirmLabel}
            </button>
          </div>
        )}

        {mode === 'done' && (
          <button onClick={onRetake} className="w-full bg-fg/10 text-fg/50 font-medium py-2 rounded-xl text-xs">
            Retake
          </button>
        )}
      </div>
    </div>
  )
}
