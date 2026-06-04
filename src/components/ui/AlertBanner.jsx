export default function AlertBanner({ message, type = 'warning', onDismiss }) {
  const styles = {
    warning: 'bg-[#FAEEDA] border-[#EF9F27] text-[#633806]',
    error:   'bg-red-50 border-red-200 text-red-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  }
  return (
    <div className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${styles[type]}`}>
      <span className="text-lg mt-0.5">{type === 'warning' ? '⚠' : type === 'error' ? '✕' : 'ℹ'}</span>
      <p className="text-sm flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 text-lg leading-none">×</button>
      )}
    </div>
  )
}
