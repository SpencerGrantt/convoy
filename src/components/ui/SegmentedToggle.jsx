export default function SegmentedToggle({ options, value, onChange }) {
  return (
    <div className="flex gap-1 bg-navy-800 rounded-xl p-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1 px-2.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
            value === opt.value ? 'bg-brand-600 text-white' : 'text-white/40'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
