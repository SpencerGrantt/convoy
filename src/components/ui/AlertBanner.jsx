export default function AlertBanner({ message, type = 'warning', onDismiss }) {
  const styles = {
    warning: 'bg-yellow-900/40 border-yellow-600/40 text-yellow-200',
    error:   'bg-red-900/40 border-red-600/40 text-red-200',
    info:    'bg-brand-900/40 border-brand-600/40 text-brand-200',
  }
  const icons = { warning: '⚠', error: '✕', info: 'ℹ' }
  return (
    <div className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${styles[type]}`}>
      <span className="text-lg mt-0.5">{icons[type]}</span>
      <p className="text-sm flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 text-lg leading-none">×</button>
      )}
    </div>
  )
}
