import { jsPDF } from 'jspdf'
import { format } from 'date-fns'

export function generateCustodyPDF(run, photos, signatures, custody) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 20

  function line() { doc.setDrawColor(220); doc.line(15, y, pageW - 15, y); y += 6 }
  function heading(text, size = 11) {
    doc.setFontSize(size)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 35, 50)
    doc.text(text, 15, y)
    y += size * 0.5 + 2
  }
  function body(text, indent = 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const lines = doc.splitTextToSize(text, pageW - 30 - indent)
    doc.text(lines, 15 + indent, y)
    y += lines.length * 4.5 + 1
  }
  function kv(label, value, indent = 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text(label + ':', 15 + indent, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 40)
    doc.text(String(value ?? '—'), 55 + indent, y)
    y += 5
  }

  // Header
  doc.setFillColor(26, 35, 50)
  doc.rect(0, 0, pageW, 18, 'F')
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(240, 244, 248)
  doc.text('CONVOY', 15, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Chain of Custody Report', 15, 16.5)
  doc.setTextColor(150, 170, 190)
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, pageW - 15, 12, { align: 'right' })

  y = 28

  // Run details
  heading('Run Details', 12)
  line()
  kv('Run ID', run.id?.slice(0, 8).toUpperCase())
  kv('Status', run.status?.replace('_', ' ').toUpperCase())
  kv('Pickup', run.pickup_address)
  kv('Dropoff', run.dropoff_address)
  if (run.cargo_description) kv('Cargo', run.cargo_description)
  kv('Temp Sensitive', run.temp_sensitive ? 'Yes' : 'No')
  if (run.scheduled_at) kv('Scheduled', format(new Date(run.scheduled_at), 'MMM d, yyyy h:mm a'))
  if (run.picked_up_at)  kv('Picked Up',  format(new Date(run.picked_up_at),  'MMM d, yyyy h:mm a'))
  if (run.delivered_at)  kv('Delivered',  format(new Date(run.delivered_at),  'MMM d, yyyy h:mm a'))
  y += 4

  // Photos
  heading('Photo Proof')
  line()
  if (!photos.length) {
    body('No photos captured.')
  } else {
    const typeLabels = {
      pickup_before: 'Pickup — Before Loading',
      pickup_sealed: 'Pickup — Sealed Package',
      delivery_arrived: 'Delivery — Arrived',
      delivery_signed: 'Delivery — Signed',
    }
    photos.forEach(p => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(40, 40, 40)
      doc.text(`✓ ${typeLabels[p.photo_type] ?? p.photo_type}`, 15, y)
      if (p.lat) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120, 120, 120)
        doc.text(`GPS: ${Number(p.lat).toFixed(5)}, ${Number(p.lng).toFixed(5)}`, 80, y)
      }
      y += 5
    })
  }
  y += 4

  // Signatures
  heading('Recipient Signature')
  line()
  if (!signatures.length) {
    body('No signature captured.')
  } else {
    signatures.forEach(s => {
      kv('Signer', s.signer_name || 'Unknown')
      kv('Time', format(new Date(s.signed_at), 'MMM d, yyyy h:mm a'))
    })
  }
  y += 4

  // Chain of custody log
  heading('Chain of Custody Log')
  line()
  if (!custody.length) {
    body('No custody events recorded.')
  } else {
    custody.forEach(e => {
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(40, 40, 40)
      doc.text(e.event_type.replace(/_/g, ' ').toUpperCase(), 15, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      doc.text(format(new Date(e.created_at), 'MMM d, h:mm a'), 80, y)
      y += 4
      if (e.note) { body(e.note, 4); y -= 1 }
      if (e.lat)  { body(`GPS: ${Number(e.lat).toFixed(5)}, ${Number(e.lng).toFixed(5)}`, 4); y -= 1 }
      y += 1

      // New page if needed
      if (y > 270) { doc.addPage(); y = 20 }
    })
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(180, 180, 180)
    doc.text(`CONVOY Chain of Custody · Page ${i} of ${pageCount} · CONFIDENTIAL`, pageW / 2, 292, { align: 'center' })
  }

  return doc
}
