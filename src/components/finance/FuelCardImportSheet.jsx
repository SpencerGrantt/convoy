import { useState, useMemo } from 'react'
import Papa from 'papaparse'
import { supabase } from '../../lib/supabase'
import { parseISO, isValid, format as formatDateFns } from 'date-fns'

const fieldClass = 'w-full bg-navy-800 border border-fg/10 text-fg rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-fg/30'

function guessColumn(headers, pattern) {
  return headers.find(h => pattern.test(h)) ?? ''
}

// Fuel card exports (WEX, Fuelman, Comdata, etc.) all use different column
// names and date formats, so this parses generously rather than requiring
// an exact schema: parseISO first, then falls back to the browser's native
// Date parser, which — unlike a hand-rolled regex — already handles the
// MM/DD/YYYY and MM/DD/YY variants these exports commonly use.
function parseFlexibleDate(raw) {
  if (!raw) return null
  const trimmed = String(raw).trim()
  const iso = parseISO(trimmed)
  if (isValid(iso)) return iso
  const native = new Date(trimmed)
  return isValid(native) ? native : null
}

function parseAmount(raw) {
  if (raw == null) return null
  const cleaned = String(raw).replace(/[^0-9.-]/g, '')
  if (!cleaned || cleaned === '-') return null
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

export default function FuelCardImportSheet({ companyId, onSaved, onClose }) {
  const [step, setStep] = useState('upload') // upload -> map -> preview
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState([])
  const [rawRows, setRawRows] = useState([])
  const [parseErr, setParseErr] = useState('')

  const [dateCol, setDateCol] = useState('')
  const [amountCol, setAmountCol] = useState('')
  const [vehicleCol, setVehicleCol] = useState('')
  const [merchantCol, setMerchantCol] = useState('')

  const [excluded, setExcluded] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [importedCount, setImportedCount] = useState(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseErr('')
    setFileName(file.name)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const cols = results.meta.fields ?? []
        if (cols.length === 0 || results.data.length === 0) {
          setParseErr('No rows found in that file — check it has a header row.')
          return
        }
        setHeaders(cols)
        setRawRows(results.data)
        setDateCol(guessColumn(cols, /date/i))
        setAmountCol(guessColumn(cols, /amount|total|cost|charge|price/i))
        setVehicleCol(guessColumn(cols, /vehicle|unit|truck|van|asset/i))
        setMerchantCol(guessColumn(cols, /merchant|location|site|vendor|station/i))
        setStep('map')
      },
      error: (err) => setParseErr(err.message ?? 'Could not read that file'),
    })
  }

  const parsedRows = useMemo(() => {
    if (step !== 'preview' && step !== 'map') return []
    if (!dateCol || !amountCol) return []
    return rawRows.map((row, i) => {
      const date = parseFlexibleDate(row[dateCol])
      const amount = parseAmount(row[amountCol])
      const vehicle = vehicleCol ? row[vehicleCol]?.trim() : ''
      const merchant = merchantCol ? row[merchantCol]?.trim() : ''
      const description = [vehicle, merchant].filter(Boolean).join(' — ') || 'Fuel card import'
      const error = !date ? 'Unreadable date' : amount == null ? 'Unreadable amount' : null
      return {
        i,
        entry_date: date ? formatDateFns(date, 'yyyy-MM-dd') : null,
        amount,
        description,
        error,
      }
    })
  }, [step, rawRows, dateCol, amountCol, vehicleCol, merchantCol])

  const validRows = parsedRows.filter(r => !r.error)
  const errorRows = parsedRows.filter(r => r.error)
  const includedRows = validRows.filter(r => !excluded.has(r.i))
  const includedTotal = includedRows.reduce((s, r) => s + r.amount, 0)

  function toggleRow(i) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  async function runImport() {
    if (includedRows.length === 0) return
    setSaving(true)
    setSaveErr('')
    try {
      const payload = includedRows.map(r => ({
        company_id: companyId,
        category: 'fuel',
        amount: r.amount,
        description: r.description,
        entry_date: r.entry_date,
      }))
      const { error } = await supabase.from('expense_entries').insert(payload)
      if (error) throw error
      setImportedCount(payload.length)
      onSaved()
    } catch (e) {
      setSaveErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (importedCount != null) {
    return (
      <div className="space-y-4 text-center py-4">
        <p className="text-3xl">⛽</p>
        <p className="text-fg font-semibold">Imported {importedCount} fuel expense{importedCount === 1 ? '' : 's'}</p>
        <button onClick={onClose} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl">
          Done
        </button>
      </div>
    )
  }

  if (step === 'upload') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-fg/50">
          Upload a CSV export from your fuel card provider (WEX, Fuelman, Comdata, etc). Each row is
          added as a fuel expense — you'll map columns and preview before anything is saved.
        </p>
        <label className="block border-2 border-dashed border-fg/15 rounded-xl px-4 py-8 text-center cursor-pointer hover:border-fg/25 transition-colors">
          <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          <p className="text-fg/60 text-sm font-medium">Tap to choose a CSV file</p>
          <p className="text-fg/30 text-xs mt-1">{fileName || 'No file selected'}</p>
        </label>
        {parseErr && <p className="text-red-400 text-xs font-medium">{parseErr}</p>}
      </div>
    )
  }

  if (step === 'map') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-fg/50">{rawRows.length} rows found in {fileName}. Match the columns below.</p>
        <div>
          <label className="block text-xs text-fg/50 mb-1">Date column *</label>
          <select value={dateCol} onChange={e => setDateCol(e.target.value)} className={fieldClass}>
            <option value="">Select column</option>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-fg/50 mb-1">Amount column *</label>
          <select value={amountCol} onChange={e => setAmountCol(e.target.value)} className={fieldClass}>
            <option value="">Select column</option>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-fg/50 mb-1">Vehicle / unit column (optional)</label>
          <select value={vehicleCol} onChange={e => setVehicleCol(e.target.value)} className={fieldClass}>
            <option value="">None</option>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-fg/50 mb-1">Merchant / location column (optional)</label>
          <select value={merchantCol} onChange={e => setMerchantCol(e.target.value)} className={fieldClass}>
            <option value="">None</option>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setExcluded(new Set()); setStep('preview') }}
          disabled={!dateCol || !amountCol}
          className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          Preview Import
        </button>
      </div>
    )
  }

  // step === 'preview'
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-fg/50">{includedRows.length} of {validRows.length} rows selected · {errorRows.length} skipped (unreadable)</p>
        <button onClick={() => setStep('map')} className="text-xs font-semibold text-brand-300">Edit mapping</button>
      </div>

      <div className="bg-navy-800 rounded-xl max-h-64 overflow-y-auto divide-y divide-white/[0.06]">
        {validRows.map(r => (
          <label key={r.i} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!excluded.has(r.i)}
              onChange={() => toggleRow(r.i)}
              className="shrink-0 accent-brand-500"
            />
            <span className="flex-1 min-w-0 text-xs text-fg/70 truncate">{r.description}</span>
            <span className="text-xs text-fg/40 shrink-0">{r.entry_date}</span>
            <span className="text-xs font-semibold text-fg shrink-0 w-14 text-right">${r.amount.toFixed(2)}</span>
          </label>
        ))}
      </div>

      {errorRows.length > 0 && (
        <p className="text-[10px] text-yellow-400/80">
          Skipped rows with an unreadable date or amount: {errorRows.slice(0, 5).map(r => `#${r.i + 2}`).join(', ')}{errorRows.length > 5 ? '…' : ''}
        </p>
      )}

      <div className="flex items-center justify-between bg-navy-800 rounded-xl px-3 py-2.5">
        <span className="text-xs font-semibold text-fg/60">Total to import</span>
        <span className="text-sm font-bold text-fg">${includedTotal.toFixed(2)}</span>
      </div>

      {saveErr && <p className="text-red-400 text-xs font-medium">{saveErr}</p>}
      <button
        onClick={runImport}
        disabled={saving || includedRows.length === 0}
        className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {saving ? 'Importing…' : `Import ${includedRows.length} Fuel Expense${includedRows.length === 1 ? '' : 's'}`}
      </button>
    </div>
  )
}
