export default function MetricCard({ label, value, sub, color = 'navy' }) {
  const valueColors = {
    navy:   'text-gray-900',
    green:  'text-[#3B6D11]',
    yellow: 'text-[#854F0B]',
    red:    'text-[#A32D2D]',
    blue:   'text-[#185FA5]',
  }
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-semibold ${valueColors[color]}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
