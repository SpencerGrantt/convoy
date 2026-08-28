export default function MetricCard({ label, value, sub, color = 'navy', icon: Icon }) {
  const valueColors = {
    navy:   'text-fg',
    green:  'text-green-400',
    yellow: 'text-yellow-400',
    red:    'text-red-400',
    blue:   'text-brand-400',
  }
  const badgeColors = {
    navy:   'bg-fg/[0.06] text-fg/50',
    green:  'bg-green-400/10 text-green-400',
    yellow: 'bg-yellow-400/10 text-yellow-400',
    red:    'bg-red-400/10 text-red-400',
    blue:   'bg-brand-400/10 text-brand-400',
  }
  return (
    <div className="relative bg-navy-700 rounded-xl p-3 border border-fg/[0.07] shadow-sm shadow-black/5 hover:shadow-md hover:shadow-black/10 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-fg/[0.03] to-transparent pointer-events-none" />
      <div className="relative flex items-start justify-between gap-2 mb-1">
        <p className="text-[10px] font-semibold text-fg/40 uppercase tracking-wide">{label}</p>
        {Icon && (
          <span className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${badgeColors[color]}`}>
            <Icon size={13} strokeWidth={2.25} />
          </span>
        )}
      </div>
      <p className={`relative text-xl font-semibold ${valueColors[color]}`}>{value}</p>
      {sub && <p className="relative text-[10px] text-fg/30 mt-0.5">{sub}</p>}
    </div>
  )
}
