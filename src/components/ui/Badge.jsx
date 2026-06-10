export default function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-white/10 text-white/60',
    blue:   'bg-blue-500/20 text-blue-300',
    green:  'bg-green-500/20 text-green-300',
    red:    'bg-red-500/20 text-red-300',
    yellow: 'bg-yellow-500/20 text-yellow-300',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}
