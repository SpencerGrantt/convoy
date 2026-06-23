const styles = {
  pending:    'bg-yellow-500/20 text-yellow-300',
  assigned:   'bg-brand-500/20 text-brand-300',
  in_transit: 'bg-blue-500/20 text-blue-300',
  delivered:  'bg-green-500/20 text-green-300',
  cancelled:  'bg-white/10 text-white/50',
  active:     'bg-green-500/20 text-green-300',
  expired:    'bg-red-500/20 text-red-300',
  renewal:    'bg-orange-500/20 text-orange-300',
  draft:      'bg-white/10 text-white/50',
  sent:       'bg-brand-500/20 text-brand-300',
  paid:       'bg-green-500/20 text-green-300',
  overdue:    'bg-red-500/20 text-red-300',
}

const labels = {
  in_transit: 'In Transit',
}

export default function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-white/10 text-white/50'}`}>
      {labels[status] ?? status?.replace('_', ' ')}
    </span>
  )
}
