import { useState, useEffect, useMemo } from 'react'
import { useFinances } from '../hooks/useFinances'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import MetricCard from '../components/ui/MetricCard'
import StatusPill from '../components/ui/StatusPill'
import SegmentedToggle from '../components/ui/SegmentedToggle'
import TopBar from '../components/layout/TopBar'
import FuelCardImportSheet from '../components/finance/FuelCardImportSheet'
import ExcelTrackerImportSheet from '../components/finance/ExcelTrackerImportSheet'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { safeFormatDate } from '../lib/dates'
import { haversineMiles } from '../lib/geo'
import {
  subDays, startOfYear, startOfWeek, parseISO, isValid,
  differenceInCalendarDays, format as formatDateFns,
} from 'date-fns'

const EXPENSE_CATEGORIES = ['fuel','driver_pay','insurance','maintenance','tolls','supplies','other']

function fmt(n) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const fieldClass = 'w-full bg-navy-800 border border-fg/10 text-fg rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-fg/30'

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-navy-700 rounded-t-3xl px-4 pt-4 pb-8 space-y-4 max-h-[85vh] overflow-y-auto border-t border-fg/[0.08]">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-fg">{title}</p>
          <button onClick={onClose} className="text-fg/40 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const PAYMENT_METHODS = ['cash', 'check', 'ach', 'credit_card', 'other']

function EnteredOnNote({ entry }) {
  if (!entry?.created_at) return null
  return (
    <p className="text-[10px] text-fg/30">
      Entered {safeFormatDate(entry.created_at, "MMM d, yyyy 'at' h:mm a")}
    </p>
  )
}

function RevenueForm({ companyId, contracts, entry, onSave, onClose }) {
  const isEdit = Boolean(entry)
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '')
  const [description, setDescription] = useState(entry?.description ?? '')
  const [contractId, setContractId] = useState(entry?.contract_id ?? '')
  const [paymentMethod, setPaymentMethod] = useState(entry?.payment_method ?? '')
  const [entryDate, setEntryDate] = useState(entry?.entry_date ?? new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!amount) return
    setSaving(true)
    setErr('')
    try {
      const payload = {
        amount: parseFloat(amount),
        description,
        contract_id: contractId || null,
        payment_method: paymentMethod || null,
        entry_date: entryDate,
      }
      const { error } = isEdit
        ? await supabase.from('revenue_entries').update(payload).eq('id', entry.id)
        : await supabase.from('revenue_entries').insert({ ...payload, company_id: companyId })
      if (error) throw error
      onSave()
      onClose()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm('Delete this revenue entry? This cannot be undone.')) return
    setSaving(true)
    setErr('')
    try {
      const { error } = await supabase.from('revenue_entries').delete().eq('id', entry.id)
      if (error) throw error
      onSave()
      onClose()
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-fg/50 mb-1">Amount *</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={fieldClass} />
      </div>
      <div>
        <label className="block text-xs text-fg/50 mb-1">Date</label>
        <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className={fieldClass} />
      </div>
      <div>
        <label className="block text-xs text-fg/50 mb-1">Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Lab specimen courier" className={fieldClass} />
      </div>
      <div>
        <label className="block text-xs text-fg/50 mb-1">Contract</label>
        <select value={contractId} onChange={e => setContractId(e.target.value)} className={fieldClass}>
          <option value="">None</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-fg/50 mb-1">Payment Method</label>
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={fieldClass}>
          <option value="">Unspecified</option>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
        </select>
      </div>
      {isEdit && <EnteredOnNote entry={entry} />}
      {err && <p className="text-red-400 text-xs font-medium">{err}</p>}
      <button onClick={save} disabled={saving || !amount} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Revenue'}
      </button>
      {isEdit && (
        <button onClick={remove} disabled={saving} className="w-full bg-red-500/10 text-red-400 font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
          Delete Entry
        </button>
      )}
    </div>
  )
}

function ExpenseForm({ companyId, entry, onSave, onClose }) {
  const isEdit = Boolean(entry)
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '')
  const [category, setCategory] = useState(entry?.category ?? 'fuel')
  const [description, setDescription] = useState(entry?.description ?? '')
  const [entryDate, setEntryDate] = useState(entry?.entry_date ?? new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!amount) return
    setSaving(true)
    setErr('')
    try {
      const payload = {
        amount: parseFloat(amount),
        category,
        description,
        entry_date: entryDate,
      }
      const { error } = isEdit
        ? await supabase.from('expense_entries').update(payload).eq('id', entry.id)
        : await supabase.from('expense_entries').insert({ ...payload, company_id: companyId })
      if (error) throw error
      onSave()
      onClose()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm('Delete this expense entry? This cannot be undone.')) return
    setSaving(true)
    setErr('')
    try {
      const { error } = await supabase.from('expense_entries').delete().eq('id', entry.id)
      if (error) throw error
      onSave()
      onClose()
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-fg/50 mb-1">Category *</label>
        <select value={category} onChange={e => setCategory(e.target.value)} className={fieldClass}>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-fg/50 mb-1">Amount *</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={fieldClass} />
      </div>
      <div>
        <label className="block text-xs text-fg/50 mb-1">Date</label>
        <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className={fieldClass} />
      </div>
      <div>
        <label className="block text-xs text-fg/50 mb-1">Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Gas — Van 01" className={fieldClass} />
      </div>
      {isEdit && <EnteredOnNote entry={entry} />}
      {err && <p className="text-red-400 text-xs font-medium">{err}</p>}
      <button onClick={save} disabled={saving || !amount} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Expense'}
      </button>
      {isEdit && (
        <button onClick={remove} disabled={saving} className="w-full bg-red-500/10 text-red-400 font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
          Delete Entry
        </button>
      )}
    </div>
  )
}

function InvoiceForm({ companyId, contracts, onSave, onClose }) {
  const [contractId, setContractId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [runs, setRuns] = useState([])
  const [fetched, setFetched] = useState(false)
  const [err, setErr] = useState('')

  async function fetchRuns() {
    if (!contractId || !periodStart || !periodEnd) return
    const { data } = await supabase
      .from('runs')
      .select('id, dropoff_address, delivered_at, revenue_entries(amount)')
      .eq('contract_id', contractId)
      .eq('status', 'delivered')
      .gte('delivered_at', periodStart)
      .lte('delivered_at', periodEnd + 'T23:59:59')
    setRuns(data ?? [])
    setFetched(true)
  }

  const total = runs.reduce((sum, r) => sum + (r.revenue_entries?.[0]?.amount ?? 0), 0)

  async function generate() {
    setSaving(true)
    setErr('')
    try {
      const num = `INV-${Date.now().toString().slice(-6)}`
      const { error } = await supabase.from('invoices').insert({
        company_id: companyId,
        contract_id: contractId || null,
        invoice_number: num,
        period_start: periodStart,
        period_end: periodEnd,
        total_amount: total,
        status: 'draft',
      })
      if (error) throw error
      onSave()
      onClose()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-fg/50 mb-1">Contract *</label>
        <select value={contractId} onChange={e => setContractId(e.target.value)} className={fieldClass}>
          <option value="">Select contract</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-fg/50 mb-1">Period Start</label>
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="block text-xs text-fg/50 mb-1">Period End</label>
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={fieldClass} />
        </div>
      </div>
      <button onClick={fetchRuns} className="w-full bg-fg/10 text-fg/80 font-semibold py-2.5 rounded-xl text-sm">
        Load Completed Runs
      </button>
      {fetched && (
        <div className="bg-navy-800 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-fg/50">{runs.length} runs found</p>
          {runs.map(r => (
            <div key={r.id} className="flex justify-between text-xs text-fg/60">
              <span className="truncate flex-1">{r.dropoff_address}</span>
              <span className="shrink-0 ml-2">{fmt(r.revenue_entries?.[0]?.amount ?? 0)}</span>
            </div>
          ))}
          <div className="border-t border-fg/10 pt-1 flex justify-between text-sm font-bold text-fg">
            <span>Total</span><span>{fmt(total)}</span>
          </div>
        </div>
      )}
      {err && <p className="text-red-400 text-xs font-medium">{err}</p>}
      {fetched && (
        <button onClick={generate} disabled={saving || !contractId} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
          {saving ? 'Generating…' : 'Generate Invoice'}
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Analytics tab
// ─────────────────────────────────────────────────────────────────────────

const RANGE_PRESETS = [
  { key: '30d',   label: 'Last 30 Days' },
  { key: '90d',   label: 'Last 90 Days' },
  { key: 'year',  label: 'This Year' },
  { key: 'custom', label: 'Custom' },
]

// Trend-chart series colors — validated as a colorblind-safe categorical
// pair (dataviz skill: validate_palette.js, dark-mode, ALL CHECKS PASS).
// Deliberately distinct from the green/yellow/red "status" colors used on
// the MetricCard tiles so identity (Revenue vs Expenses) never gets read
// as a good/bad status signal.
const TREND_COLORS = { revenue: '#3987e5', expenses: '#d95926' }

// Fixed per-category colors so switching the Expenses by Category chart
// between Bar and Pie never reshuffles which color means which category.
const CATEGORY_COLORS = {
  fuel: '#d95926',
  driver_pay: '#3987e5',
  insurance: '#7c6ae8',
  maintenance: '#3aa66b',
  tolls: '#d4a72c',
  supplies: '#3ab6c9',
  other: '#8b8f9a',
}

function formatDuration(ms) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'
  const totalMinutes = Math.round(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h === 0 ? `${m}m` : `${h}h ${m}m`
}

// Guarded start-of-week — mirrors lib/dates.js's toDate() pattern (isValid
// check before ever handing the Date to date-fns' formatter) since entry_date
// values here are grouped, not just displayed, so a raw parseISO/format
// couldn't fall back through safeFormatDate the way display-only dates do.
function safeWeekStartKey(dateStr) {
  const d = parseISO(dateStr ?? '')
  if (!isValid(d)) return null
  return formatDateFns(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

function useDateRange() {
  const [preset, setPreset] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const range = useMemo(() => {
    const today = new Date()
    let start, end
    if (preset === '90d') {
      start = subDays(today, 89); end = today
    } else if (preset === 'year') {
      start = startOfYear(today); end = today
    } else if (preset === 'custom') {
      const s = customStart ? parseISO(customStart) : null
      const e = customEnd ? parseISO(customEnd) : null
      start = s && isValid(s) ? s : subDays(today, 29)
      end = e && isValid(e) ? e : today
      if (end < start) { const t = start; start = end; end = t }
    } else {
      start = subDays(today, 29); end = today
    }
    const startStr = formatDateFns(start, 'yyyy-MM-dd')
    const endStr = formatDateFns(end, 'yyyy-MM-dd')
    const spanDays = differenceInCalendarDays(end, start) + 1
    return {
      startStr,
      endStr,
      startISO: `${startStr}T00:00:00`,
      endISO: `${endStr}T23:59:59`,
      granularity: spanDays <= 31 ? 'day' : 'week',
    }
  }, [preset, customStart, customEnd])

  return { preset, setPreset, customStart, setCustomStart, customEnd, setCustomEnd, range }
}

function DateRangeControl({ preset, setPreset, customStart, setCustomStart, customEnd, setCustomEnd }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {RANGE_PRESETS.map(p => (
        <button
          key={p.key}
          onClick={() => setPreset(p.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            preset === p.key ? 'bg-brand-600 text-white' : 'bg-navy-800 text-fg/50'
          }`}
        >
          {p.label}
        </button>
      ))}
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            className="bg-navy-800 border border-fg/10 text-fg rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <span className="text-fg/30 text-xs">to</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            className="bg-navy-800 border border-fg/10 text-fg rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      )}
    </div>
  )
}

function useAnalyticsData(range) {
  const [state, setState] = useState({ loading: true, revenue: [], expenses: [], runs: [] })

  useEffect(() => {
    let cancelled = false
    async function load() {
      setState(s => ({ ...s, loading: true }))
      const [rev, exp, runs] = await Promise.all([
        supabase.from('revenue_entries').select('amount, entry_date, description, payment_method')
          .gte('entry_date', range.startStr).lte('entry_date', range.endStr),
        supabase.from('expense_entries').select('amount, category, entry_date')
          .gte('entry_date', range.startStr).lte('entry_date', range.endStr),
        supabase.from('runs')
          .select('id, driver_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, picked_up_at, delivered_at, profiles(full_name)')
          .eq('status', 'delivered')
          .gte('delivered_at', range.startISO)
          .lte('delivered_at', range.endISO),
      ])
      if (cancelled) return
      setState({
        loading: false,
        revenue: rev.data ?? [],
        expenses: exp.data ?? [],
        runs: runs.data ?? [],
      })
    }
    load()
    return () => { cancelled = true }
  }, [range.startStr, range.endStr, range.startISO, range.endISO])

  return state
}

function bucketize(entries, granularity) {
  const map = new Map()
  for (const e of entries) {
    const key = granularity === 'day' ? e.entry_date : safeWeekStartKey(e.entry_date)
    if (!key) continue
    map.set(key, (map.get(key) ?? 0) + Number(e.amount))
  }
  return map
}

function AnalyticsTab() {
  const { preset, setPreset, customStart, setCustomStart, customEnd, setCustomEnd, range } = useDateRange()
  const { loading, revenue, expenses, runs } = useAnalyticsData(range)

  // Per-device display preference, not company data — doesn't belong in the DB.
  const [trendChartType, setTrendChartType] = useState(
    () => localStorage.getItem('vantar_analytics_trend_chart') || 'line'
  )
  const [categoryChartType, setCategoryChartType] = useState(
    () => localStorage.getItem('vantar_analytics_category_chart') || 'bar'
  )
  useEffect(() => {
    localStorage.setItem('vantar_analytics_trend_chart', trendChartType)
  }, [trendChartType])
  useEffect(() => {
    localStorage.setItem('vantar_analytics_category_chart', categoryChartType)
  }, [categoryChartType])

  const completedCount = runs.length
  const periodRevenue = revenue.reduce((s, r) => s + Number(r.amount), 0)
  const periodExpense = expenses.reduce((s, e) => s + Number(e.amount), 0)

  // Every "Avg … / Completed Run" tile below is a blended figure — period
  // total ÷ completed-run count — never a per-run lookup. That's unavoidably
  // true for cost (expense_entries has no run_id at all) and, in practice,
  // for revenue too (revenue_entries.run_id is optional and not populated on
  // every row), so both numerators are period-wide sums, not sums restricted
  // to revenue/expense rows tied to these specific runs.
  const avgRevenuePerRun = completedCount ? periodRevenue / completedCount : null
  const avgCostPerRun = completedCount ? periodExpense / completedCount : null
  const avgProfitPerRun = completedCount ? (periodRevenue - periodExpense) / completedCount : null

  const milesEligibleRuns = runs.filter(
    r => r.pickup_lat != null && r.pickup_lng != null && r.dropoff_lat != null && r.dropoff_lng != null
  )
  const totalMiles = milesEligibleRuns.reduce(
    (s, r) => s + haversineMiles(r.pickup_lat, r.pickup_lng, r.dropoff_lat, r.dropoff_lng), 0
  )
  const estCostPerMile = totalMiles > 0 ? periodExpense / totalMiles : null

  const trendData = useMemo(() => {
    const revByBucket = bucketize(revenue, range.granularity)
    const expByBucket = bucketize(expenses, range.granularity)
    const keys = Array.from(new Set([...revByBucket.keys(), ...expByBucket.keys()])).sort()
    return keys.map(k => ({
      key: k,
      label: safeFormatDate(k, 'MMM d'),
      revenue: revByBucket.get(k) ?? 0,
      expenses: expByBucket.get(k) ?? 0,
    }))
  }, [revenue, expenses, range.granularity])

  const expenseByCategory = useMemo(() => {
    const acc = {}
    for (const e of expenses) acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
    return Object.entries(acc).map(([name, amount]) => ({ name, amount }))
  }, [expenses])

  const driverRows = useMemo(() => {
    const map = new Map()
    for (const r of runs) {
      const key = r.driver_id ?? 'unassigned'
      if (!map.has(key)) {
        map.set(key, { driverId: key, name: r.profiles?.full_name || 'Unassigned', count: 0, totalMs: 0, withTurnaround: 0 })
      }
      const entry = map.get(key)
      entry.count += 1
      if (r.picked_up_at && r.delivered_at) {
        const pu = parseISO(r.picked_up_at)
        const del = parseISO(r.delivered_at)
        if (isValid(pu) && isValid(del) && del > pu) {
          entry.totalMs += del - pu
          entry.withTurnaround += 1
        }
      }
    }
    return Array.from(map.values())
      .map(d => ({ ...d, avgTurnaroundMs: d.withTurnaround ? d.totalMs / d.withTurnaround : null }))
      .sort((a, b) => b.count - a.count)
  }, [runs])

  const xInterval = trendData.length > 12 ? Math.ceil(trendData.length / 8) - 1 : 0

  return (
    <div className="space-y-4">
      <DateRangeControl
        preset={preset} setPreset={setPreset}
        customStart={customStart} setCustomStart={setCustomStart}
        customEnd={customEnd} setCustomEnd={setCustomEnd}
      />

      {loading && <p className="text-sm text-fg/40 text-center py-6">Loading analytics…</p>}

      {!loading && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard
              label="Avg Revenue / Completed Run"
              value={avgRevenuePerRun != null ? fmt(avgRevenuePerRun) : '—'}
              color="green"
              sub="Blended average — total revenue ÷ completed runs, not tracked per-run"
            />
            <MetricCard
              label="Avg Cost / Completed Run"
              value={avgCostPerRun != null ? fmt(avgCostPerRun) : '—'}
              color="yellow"
              sub="Blended average — total expenses ÷ completed runs, not tracked per-run"
            />
            <MetricCard
              label="Avg Profit / Completed Run"
              value={avgProfitPerRun != null ? fmt(avgProfitPerRun) : '—'}
              color={avgProfitPerRun != null && avgProfitPerRun < 0 ? 'red' : 'green'}
              sub="Blended average — total revenue minus expenses, not tracked per-run"
            />
            <MetricCard
              label="Est. Cost / Mile"
              value={estCostPerMile != null ? fmt(estCostPerMile) : '—'}
              color="blue"
              sub="Estimated from straight-line pickup→dropoff distance, not actual route mileage"
            />
          </div>

          <div className="bg-navy-700 rounded-2xl p-4 border border-fg/[0.07]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-xs font-semibold text-fg/40 uppercase tracking-wide">Revenue vs Expenses</p>
              <div className="w-40">
                <SegmentedToggle
                  options={[{ value: 'line', label: 'Line' }, { value: 'bar', label: 'Bar' }, { value: 'area', label: 'Area' }]}
                  value={trendChartType}
                  onChange={setTrendChartType}
                />
              </div>
            </div>
            {trendData.length === 0 ? (
              <p className="text-sm text-fg/40 text-center py-6">No revenue or expense entries in this range</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                {trendChartType === 'bar' ? (
                  <BarChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} interval={xInterval} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                    <Tooltip
                      formatter={v => fmt(v)}
                      contentStyle={{ background: '#1A0B47', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}
                      formatter={v => v === 'revenue' ? 'Revenue' : 'Expenses'}
                    />
                    <Bar dataKey="revenue" fill={TREND_COLORS.revenue} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill={TREND_COLORS.expenses} radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : trendChartType === 'area' ? (
                  <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} interval={xInterval} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                    <Tooltip
                      formatter={v => fmt(v)}
                      contentStyle={{ background: '#1A0B47', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}
                      formatter={v => v === 'revenue' ? 'Revenue' : 'Expenses'}
                    />
                    <Area type="monotone" dataKey="revenue" stroke={TREND_COLORS.revenue} fill={TREND_COLORS.revenue} fillOpacity={0.25} strokeWidth={2} />
                    <Area type="monotone" dataKey="expenses" stroke={TREND_COLORS.expenses} fill={TREND_COLORS.expenses} fillOpacity={0.25} strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} interval={xInterval} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                    <Tooltip
                      formatter={v => fmt(v)}
                      contentStyle={{ background: '#1A0B47', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}
                      formatter={v => v === 'revenue' ? 'Revenue' : 'Expenses'}
                    />
                    <Line type="monotone" dataKey="revenue" stroke={TREND_COLORS.revenue} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="expenses" stroke={TREND_COLORS.expenses} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {expenseByCategory.length > 0 && (
            <div className="bg-navy-700 rounded-2xl p-4 border border-fg/[0.07]">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-xs font-semibold text-fg/40 uppercase tracking-wide">Expenses by Category</p>
                <div className="w-28">
                  <SegmentedToggle
                    options={[{ value: 'bar', label: 'Bar' }, { value: 'pie', label: 'Pie' }]}
                    value={categoryChartType}
                    onChange={setCategoryChartType}
                  />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={categoryChartType === 'pie' ? 220 : 160}>
                {categoryChartType === 'pie' ? (
                  <PieChart>
                    <Tooltip
                      formatter={v => fmt(v)}
                      contentStyle={{ background: '#1A0B47', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}
                      formatter={v => v.replace('_', ' ')}
                    />
                    <Pie data={expenseByCategory} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={false}>
                      {expenseByCategory.map(entry => (
                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? '#8b8f9a'} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart data={expenseByCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                    <Tooltip
                      formatter={v => fmt(v)}
                      contentStyle={{ background: '#1A0B47', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {expenseByCategory.map(entry => (
                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? '#3393E8'} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-navy-700 rounded-2xl border border-fg/[0.07] overflow-hidden">
            <p className="text-xs font-semibold text-fg/40 uppercase tracking-wide px-4 pt-4 pb-3">Crew Utilization</p>
            {driverRows.length === 0 ? (
              <p className="text-sm text-fg/40 text-center py-6">No completed runs in this range</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-fg/35 uppercase tracking-wide border-t border-fg/[0.06]">
                      <th className="text-left font-semibold px-4 py-2">Crew</th>
                      <th className="text-right font-semibold px-4 py-2">Completed Runs</th>
                      <th className="text-right font-semibold px-4 py-2">Avg Turnaround</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverRows.map(d => (
                      <tr key={d.driverId} className="border-t border-fg/[0.06]">
                        <td className="px-4 py-2.5 text-fg/80 truncate max-w-[10rem]">{d.name}</td>
                        <td className="px-4 py-2.5 text-right text-fg font-semibold">{d.count}</td>
                        <td className="px-4 py-2.5 text-right text-fg/60">{formatDuration(d.avgTurnaroundMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: 'mtd', label: 'MTD' },
  { value: 'ytd', label: 'YTD' },
  { value: 'all', label: 'All Time' },
]

export default function Finances() {
  const { profile } = useAuth()
  const [period, setPeriod] = useState(() => localStorage.getItem('vantar_finances_period') || 'mtd')
  useEffect(() => { localStorage.setItem('vantar_finances_period', period) }, [period])
  const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label ?? 'MTD'
  const { revenue, expenses, invoices, contracts, totalRevenue, totalExpenses, netProfit, outstanding, refresh } = useFinances(period)
  const [sheet, setSheet] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  function openSheet(name, entry = null) {
    setEditingEntry(entry)
    setSheet(name)
  }
  function closeSheet() {
    setSheet(null)
    setEditingEntry(null)
  }
  const companyId = profile?.company_id
  const tabs = ['overview', 'analytics']

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Finances" />

      <div className="flex border-b border-fg/[0.08] bg-navy-900 px-4 gap-4 md:px-8">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`py-3 text-xs font-semibold capitalize transition-colors border-b-2
              ${activeTab === t ? 'border-fg text-fg' : 'border-transparent text-fg/40'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">

        {activeTab === 'overview' && (
          <>
            <div className="w-full max-w-xs">
              <SegmentedToggle options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard label={`Revenue ${periodLabel}`}  value={fmt(totalRevenue)}  color="green"  />
              <MetricCard label={`Expenses ${periodLabel}`} value={fmt(totalExpenses)} color="yellow" />
              <MetricCard label="Net Profit"   value={fmt(netProfit)}     color={netProfit >= 0 ? 'green' : 'red'} />
              <MetricCard label="Outstanding"  value={fmt(outstanding)}   color="red"    />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => openSheet('revenue')} className="bg-green-500/20 text-green-300 font-semibold py-2.5 rounded-xl text-xs active:bg-green-500/30">+ Revenue</button>
              <button onClick={() => openSheet('expense')} className="bg-yellow-500/20 text-yellow-300 font-semibold py-2.5 rounded-xl text-xs active:bg-yellow-500/30">+ Expense</button>
              <button onClick={() => openSheet('invoice')} className="bg-brand-500/20 text-brand-300 font-semibold py-2.5 rounded-xl text-xs active:bg-brand-500/30">+ Invoice</button>
            </div>
            <button onClick={() => openSheet('fuel-import')} className="w-full bg-navy-700 border border-fg/[0.08] text-fg/70 font-semibold py-2.5 rounded-xl text-xs active:bg-navy-800">
              ⛽ Import Fuel Card CSV
            </button>
            <button onClick={() => openSheet('excel-import')} className="w-full bg-navy-700 border border-fg/[0.08] text-fg/70 font-semibold py-2.5 rounded-xl text-xs active:bg-navy-800">
              📊 Import Miles & Expense Tracker (.xlsx)
            </button>

            <div>
              <p className="text-xs font-semibold text-fg/40 uppercase tracking-wide mb-2">Recent Revenue</p>
              {revenue.length === 0 && <p className="text-sm text-fg/40 text-center py-2">No entries this month</p>}
              {revenue.slice(0, 5).map(r => (
                <button key={r.id} onClick={() => openSheet('revenue', r)} className="w-full text-left bg-navy-700 rounded-xl px-4 py-3 border border-fg/[0.07] flex items-center justify-between mb-2 active:bg-navy-800">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg/80 truncate">{r.description || 'Revenue entry'}</p>
                    <p className="text-[10px] text-fg/30">
                      {safeFormatDate(r.entry_date, 'MMM d, yyyy')}
                      {r.payment_method && <span className="capitalize"> · {r.payment_method.replace('_', ' ')}</span>}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-green-400 ml-3">{fmt(r.amount)}</p>
                </button>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold text-fg/40 uppercase tracking-wide mb-2">Recent Expenses</p>
              {expenses.length === 0 && <p className="text-sm text-fg/40 text-center py-2">No entries this month</p>}
              {expenses.slice(0, 5).map(e => (
                <button key={e.id} onClick={() => openSheet('expense', e)} className="w-full text-left bg-navy-700 rounded-xl px-4 py-3 border border-fg/[0.07] flex items-center justify-between mb-2 active:bg-navy-800">
                  <div>
                    <p className="text-sm text-fg/80">{e.description || e.category.replace('_', ' ')}</p>
                    <p className="text-xs text-fg/40 capitalize">{e.category.replace('_', ' ')}</p>
                    <p className="text-[10px] text-fg/30">{safeFormatDate(e.entry_date, 'MMM d, yyyy')}</p>
                  </div>
                  <p className="text-sm font-bold text-red-400 ml-3">{fmt(e.amount)}</p>
                </button>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold text-fg/40 uppercase tracking-wide mb-2">Invoices</p>
              {invoices.length === 0 && <p className="text-sm text-fg/40 text-center py-2">No invoices yet</p>}
              {invoices.map(inv => (
                <div key={inv.id} className="bg-navy-700 rounded-xl p-4 border border-fg/[0.07] flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-fg">#{inv.invoice_number ?? inv.id.slice(0, 8)}</p>
                    <p className="text-xs text-fg/50">{inv.contracts?.name ?? '—'}</p>
                    {inv.period_start && (
                      <p className="text-xs text-fg/40">{safeFormatDate(inv.period_start, 'MMM d')} – {safeFormatDate(inv.period_end, 'MMM d, yyyy')}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-fg">{fmt(inv.total_amount ?? 0)}</p>
                    <StatusPill status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>

      {sheet === 'revenue' && (
        <Sheet title={editingEntry ? 'Edit Revenue' : 'Add Revenue'} onClose={closeSheet}>
          <RevenueForm companyId={companyId} contracts={contracts} entry={editingEntry} onSave={refresh} onClose={closeSheet} />
        </Sheet>
      )}
      {sheet === 'expense' && (
        <Sheet title={editingEntry ? 'Edit Expense' : 'Add Expense'} onClose={closeSheet}>
          <ExpenseForm companyId={companyId} entry={editingEntry} onSave={refresh} onClose={closeSheet} />
        </Sheet>
      )}
      {sheet === 'invoice' && (
        <Sheet title="Generate Invoice" onClose={closeSheet}>
          <InvoiceForm companyId={companyId} contracts={contracts} onSave={refresh} onClose={closeSheet} />
        </Sheet>
      )}
      {sheet === 'fuel-import' && (
        <Sheet title="Import Fuel Card CSV" onClose={closeSheet}>
          <FuelCardImportSheet companyId={companyId} onSaved={refresh} onClose={closeSheet} />
        </Sheet>
      )}
      {sheet === 'excel-import' && (
        <Sheet title="Import Miles & Expense Tracker" onClose={closeSheet}>
          <ExcelTrackerImportSheet companyId={companyId} onSaved={refresh} onClose={closeSheet} />
        </Sheet>
      )}
    </div>
  )
}
