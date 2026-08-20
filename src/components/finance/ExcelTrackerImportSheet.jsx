import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { isValid, format as formatDateFns } from 'date-fns'

const LOADS_SHEET_PATTERN = /miles.*load|load.*miles/i
const EXPENSE_SHEET_PATTERN = /expense/i

// Column names come from the client's own workbook and could drift slightly
// between exports (extra spaces, renamed units), so columns are detected by
// pattern rather than hardcoded, same approach as FuelCardImportSheet.
function findCol(sampleRow, patterns) {
  const keys = Object.keys(sampleRow ?? {})
  for (const p of patterns) {
    const k = keys.find(k => p.test(k))
    if (k) return k
  }
  return null
}

function toDateStr(raw) {
  if (!raw) return null
  const d = raw instanceof Date ? raw : new Date(raw)
  return isValid(d) ? formatDateFns(d, 'yyyy-MM-dd') : null
}

function toAmount(raw) {
  if (raw == null || raw === '') return 0
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

const EXPENSE_CATEGORY_MAP = [
  [/fuel|gas/, 'fuel'],
  [/driver.*pay/, 'driver_pay'],
  [/insurance/, 'insurance'],
  [/maintenance|repair/, 'maintenance'],
  [/toll/, 'tolls'],
  [/suppl/, 'supplies'],
]

function normalizeCategory(raw) {
  const key = String(raw ?? '').toLowerCase()
  const match = EXPENSE_CATEGORY_MAP.find(([pattern]) => pattern.test(key))
  return match ? match[1] : 'other'
}

function parseWorkbook(XLSX, workbook) {
  const loadsSheetName = workbook.SheetNames.find(n => LOADS_SHEET_PATTERN.test(n))
  const expenseSheetName = workbook.SheetNames.find(n => EXPENSE_SHEET_PATTERN.test(n))

  let loads = []
  if (loadsSheetName) {
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[loadsSheetName], { defval: null })
    const sample = rawRows.find(r => r['Origin'] || r['Destination']) ?? rawRows[0]
    const cols = {
      pickupDate: findCol(sample, [/pickup.*date/i]),
      deliveryDate: findCol(sample, [/deliver.*date/i]),
      origin: findCol(sample, [/^origin/i]),
      destination: findCol(sample, [/destination/i]),
      bol: findCol(sample, [/bol/i]),
      broker: findCol(sample, [/broker|customer/i]),
      revenue: findCol(sample, [/gross.*revenue/i, /^revenue/i]),
      fuel: findCol(sample, [/fuel.*cost/i]),
      driverPay: findCol(sample, [/driver.*pay/i]),
      tolls: findCol(sample, [/toll/i]),
    }
    loads = rawRows
      .filter(r => cols.origin && cols.destination && r[cols.origin] && r[cols.destination])
      .map((r, i) => {
        const entryDate = toDateStr(r[cols.deliveryDate]) ?? toDateStr(r[cols.pickupDate])
        return {
          i,
          origin: r[cols.origin],
          destination: r[cols.destination],
          bol: cols.bol ? r[cols.bol] : null,
          broker: cols.broker ? r[cols.broker] : null,
          entryDate,
          revenue: cols.revenue ? toAmount(r[cols.revenue]) : 0,
          fuel: cols.fuel ? toAmount(r[cols.fuel]) : 0,
          driverPay: cols.driverPay ? toAmount(r[cols.driverPay]) : 0,
          tolls: cols.tolls ? toAmount(r[cols.tolls]) : 0,
          error: !entryDate ? 'Unreadable date' : null,
        }
      })
  }

  let expenses = []
  if (expenseSheetName) {
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[expenseSheetName], { defval: null })
    const sample = rawRows.find(r => r['Date'] && (r['Amount ($)'] != null || r['Amount'] != null)) ?? rawRows[0]
    const cols = {
      date: findCol(sample, [/^date$/i]),
      category: findCol(sample, [/category/i]),
      description: findCol(sample, [/description/i]),
      amount: findCol(sample, [/amount/i]),
      paymentMethod: findCol(sample, [/payment/i]),
    }
    expenses = rawRows
      .filter(r => cols.date && cols.amount && r[cols.date] && r[cols.amount] != null && r[cols.amount] !== '')
      .map((r, i) => {
        const entryDate = toDateStr(r[cols.date])
        const rawCategory = cols.category ? r[cols.category] : null
        return {
          i,
          entryDate,
          amount: toAmount(r[cols.amount]),
          rawCategory,
          category: normalizeCategory(rawCategory),
          description: cols.description ? r[cols.description] : null,
          error: !entryDate ? 'Unreadable date' : null,
        }
      })
  }

  return { loadsSheetName, expenseSheetName, loads, expenses }
}

export default function ExcelTrackerImportSheet({ companyId, onSaved, onClose }) {
  const [step, setStep] = useState('upload') // upload -> preview
  const [fileName, setFileName] = useState('')
  const [parseErr, setParseErr] = useState('')
  const [parsed, setParsed] = useState(null)

  const [excludedLoads, setExcludedLoads] = useState(() => new Set())
  const [excludedExpenses, setExcludedExpenses] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [result, setResult] = useState(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseErr('')
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(evt.target.result, { type: 'array', cellDates: true })
        const result = parseWorkbook(XLSX, workbook)
        if (!result.loadsSheetName && !result.expenseSheetName) {
          setParseErr("Couldn't find a \"Miles & Loads\" or \"Expense Tracker\" sheet in that file.")
          return
        }
        if (result.loads.length === 0 && result.expenses.length === 0) {
          setParseErr('Found the sheets, but no filled-in rows to import.')
          return
        }
        setParsed(result)
        setExcludedLoads(new Set())
        setExcludedExpenses(new Set())
        setStep('preview')
      } catch (err) {
        setParseErr(err.message ?? 'Could not read that file')
      }
    }
    reader.onerror = () => setParseErr('Could not read that file')
    reader.readAsArrayBuffer(file)
  }

  const validLoads = useMemo(() => (parsed?.loads ?? []).filter(r => !r.error), [parsed])
  const validExpenses = useMemo(() => (parsed?.expenses ?? []).filter(r => !r.error), [parsed])
  const includedLoads = validLoads.filter(r => !excludedLoads.has(r.i))
  const includedExpenses = validExpenses.filter(r => !excludedExpenses.has(r.i))

  const loadsRevenueTotal = includedLoads.reduce((s, r) => s + r.revenue, 0)
  const loadsCostTotal = includedLoads.reduce((s, r) => s + r.fuel + r.driverPay + r.tolls, 0)
  const expensesTotal = includedExpenses.reduce((s, r) => s + r.amount, 0)

  function toggleLoad(i) {
    setExcludedLoads(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }
  function toggleExpense(i) {
    setExcludedExpenses(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  async function runImport() {
    if (includedLoads.length === 0 && includedExpenses.length === 0) return
    setSaving(true)
    setSaveErr('')
    try {
      const revenuePayload = includedLoads
        .filter(r => r.revenue > 0)
        .map(r => ({
          company_id: companyId,
          amount: r.revenue,
          description: [r.origin, r.destination].filter(Boolean).join(' → ') + (r.broker ? ` — ${r.broker}` : ''),
          entry_date: r.entryDate,
        }))

      const loadExpenseRows = []
      for (const r of includedLoads) {
        const desc = [r.origin, r.destination].filter(Boolean).join(' → ') + (r.broker ? ` — ${r.broker}` : '')
        if (r.fuel > 0) loadExpenseRows.push({ company_id: companyId, category: 'fuel', amount: r.fuel, description: desc, entry_date: r.entryDate })
        if (r.driverPay > 0) loadExpenseRows.push({ company_id: companyId, category: 'driver_pay', amount: r.driverPay, description: desc, entry_date: r.entryDate })
        if (r.tolls > 0) loadExpenseRows.push({ company_id: companyId, category: 'tolls', amount: r.tolls, description: desc, entry_date: r.entryDate })
      }

      const trackerExpenseRows = includedExpenses
        .filter(r => r.amount > 0)
        .map(r => ({
          company_id: companyId,
          category: r.category,
          amount: r.amount,
          description: [r.rawCategory, r.description].filter(Boolean).join(' — ') || null,
          entry_date: r.entryDate,
        }))

      if (revenuePayload.length > 0) {
        const { error } = await supabase.from('revenue_entries').insert(revenuePayload)
        if (error) throw error
      }
      const allExpenseRows = [...loadExpenseRows, ...trackerExpenseRows]
      if (allExpenseRows.length > 0) {
        const { error } = await supabase.from('expense_entries').insert(allExpenseRows)
        if (error) throw error
      }

      setResult({ revenue: revenuePayload.length, expenses: allExpenseRows.length })
      onSaved()
    } catch (e) {
      setSaveErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-4 text-center py-4">
        <p className="text-3xl">📊</p>
        <p className="text-white font-semibold">
          Imported {result.revenue} revenue {result.revenue === 1 ? 'entry' : 'entries'} and {result.expenses} expense {result.expenses === 1 ? 'entry' : 'entries'}
        </p>
        <button onClick={onClose} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl">
          Done
        </button>
      </div>
    )
  }

  if (step === 'upload') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-white/50">
          Upload your Miles &amp; Expense Tracker (.xlsx). Loads become revenue + fuel/driver pay/tolls
          expenses, and tracked expenses are added as expenses — you'll review everything before it's saved.
          Mileage totals aren't logged to the IFTA mileage report since this file doesn't break miles out by state.
        </p>
        <label className="block border-2 border-dashed border-white/15 rounded-xl px-4 py-8 text-center cursor-pointer hover:border-white/25 transition-colors">
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
          <p className="text-white/60 text-sm font-medium">Tap to choose an Excel file</p>
          <p className="text-white/30 text-xs mt-1">{fileName || 'No file selected'}</p>
        </label>
        {parseErr && <p className="text-red-400 text-xs font-medium">{parseErr}</p>}
      </div>
    )
  }

  // step === 'preview'
  return (
    <div className="space-y-4">
      <p className="text-xs text-white/50">{fileName}</p>

      {parsed.loadsSheetName && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Loads — {includedLoads.length} of {validLoads.length}</p>
            <p className="text-xs text-white/40">+{`$${loadsRevenueTotal.toFixed(0)}`} rev / −{`$${loadsCostTotal.toFixed(0)}`} cost</p>
          </div>
          <div className="bg-navy-800 rounded-xl max-h-48 overflow-y-auto divide-y divide-white/[0.06]">
            {validLoads.map(r => (
              <label key={r.i} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={!excludedLoads.has(r.i)} onChange={() => toggleLoad(r.i)} className="shrink-0 accent-brand-500" />
                <span className="flex-1 min-w-0 text-xs text-white/70 truncate">{r.origin} → {r.destination}</span>
                <span className="text-xs text-white/40 shrink-0">{r.entryDate}</span>
                <span className="text-xs font-semibold text-green-400 shrink-0 w-14 text-right">${r.revenue.toFixed(0)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {parsed.expenseSheetName && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Expenses — {includedExpenses.length} of {validExpenses.length}</p>
            <p className="text-xs text-white/40">−${expensesTotal.toFixed(0)}</p>
          </div>
          <div className="bg-navy-800 rounded-xl max-h-48 overflow-y-auto divide-y divide-white/[0.06]">
            {validExpenses.map(r => (
              <label key={r.i} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={!excludedExpenses.has(r.i)} onChange={() => toggleExpense(r.i)} className="shrink-0 accent-brand-500" />
                <span className="flex-1 min-w-0 text-xs text-white/70 truncate">{r.rawCategory ?? r.category} — {r.description || 'Expense'}</span>
                <span className="text-xs text-white/40 shrink-0">{r.entryDate}</span>
                <span className="text-xs font-semibold text-white shrink-0 w-14 text-right">${r.amount.toFixed(0)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {saveErr && <p className="text-red-400 text-xs font-medium">{saveErr}</p>}
      <button
        onClick={runImport}
        disabled={saving || (includedLoads.length === 0 && includedExpenses.length === 0)}
        className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {saving ? 'Importing…' : `Import ${includedLoads.length + includedExpenses.length} Entries`}
      </button>
    </div>
  )
}
