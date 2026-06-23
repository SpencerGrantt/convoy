export default function MetricCard({ label, value, sub, color = 'navy' }) {
  const valueColors = {
    navy:   'text-white',
    green:  'text-green-400',
    yellow: 'text-yellow-400',
    red:    'text-red-400',
    blue:   'text-brand-400',
  }
  return (
    <div className="bg-navy-700 rounded-xl p-3 border border-white/[0.07]">
      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-semibold ${valueColors[color]}`}>{value}</p>
      {sub && <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>}
    </div>
  )
}
