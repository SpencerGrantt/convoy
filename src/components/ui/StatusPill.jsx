const styles = {
  pending:    'bg-yellow-100 text-yellow-800',
  assigned:   'bg-blue-100 text-blue-800',
  in_transit: 'bg-indigo-100 text-indigo-800',
  delivered:  'bg-green-100 text-green-800',
  cancelled:  'bg-gray-100 text-gray-500',
  active:     'bg-green-100 text-green-800',
  expired:    'bg-red-100 text-red-700',
  renewal:    'bg-orange-100 text-orange-700',
  draft:      'bg-gray-100 text-gray-600',
  sent:       'bg-blue-100 text-blue-800',
  paid:       'bg-green-100 text-green-800',
  overdue:    'bg-red-100 text-red-700',
}

const labels = {
  in_transit: 'In Transit',
}

export default function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status?.replace('_', ' ')}
    </span>
  )
}
