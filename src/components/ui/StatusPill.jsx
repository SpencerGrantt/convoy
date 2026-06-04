const styles = {
  pending:    'bg-[#FAC775] text-[#633806]',
  assigned:   'bg-[#B5D4F4] text-[#0C447C]',
  in_transit: 'bg-[#B5D4F4] text-[#0C447C]',
  delivered:  'bg-[#C0DD97] text-[#27500A]',
  cancelled:  'bg-gray-100 text-gray-500',
  active:     'bg-[#C0DD97] text-[#27500A]',
  expired:    'bg-red-100 text-red-700',
  renewal:    'bg-orange-100 text-orange-700',
  draft:      'bg-gray-100 text-gray-600',
  sent:       'bg-[#B5D4F4] text-[#0C447C]',
  paid:       'bg-[#C0DD97] text-[#27500A]',
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
