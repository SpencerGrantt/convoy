import { safeDifferenceInDays } from '../../lib/dates'

// Expiry color-coding shared by the owner/dispatcher Drivers page and the
// driver's own read-only compliance docs view — red inside 30 days, yellow
// inside 60, green otherwise. Kept in one place so both surfaces always
// agree on the thresholds.
export default function ExpiryBadge({ date }) {
  const d = safeDifferenceInDays(date, new Date())
  if (d === null) return <span className="text-white/20 text-xs">—</span>
  const color = d <= 30 ? 'text-red-400 bg-red-500/20' : d <= 60 ? 'text-yellow-400 bg-yellow-500/20' : 'text-green-400 bg-green-500/20'
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>
      {d < 0 ? 'Expired' : `${d}d`}
    </span>
  )
}
