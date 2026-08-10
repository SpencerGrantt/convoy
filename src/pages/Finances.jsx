import { useState, useEffect, useMemo } from 'react'
import { useFinances } from '../hooks/useFinances'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import MetricCard from '../components/ui/MetricCard'
import StatusPill from '../components/ui/StatusPill'
import TopBar from '../components/layout/TopBar'
import {
  BarChart, Bar, LineChart, Line, Legend,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { safeFormatDate } from '../lib/dates'
import {
  subDays, startOfYear, startOfWeek, parseISO, isValid,
  differenceInCalendarDays, format as formatDateFns,
} from 'date-fns'

const EXPENSE_CATEGORIES = ['fuel','driver_pay','insurance','maintenance','tolls','supplies','other']

function fmt(n) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const fieldClass = 'w-full bg-navy-800 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/30'

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-navy-700 rounded-t-3xl px-4 pt-4 pb-8 space-y-4 max-h-[85vh] overflow-y-auto border-t border-white/[0.08]">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-white">{title}</p>
          <button onClick={onClose} className="text-white/40 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function RevenueForm({ companyId, contracts, onSave, onClose }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [contractId, setContractId] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!amount) return
    setSaving(true)
    setErr('')
    try {
      const { error } = await supabase.from('revenue_entries').insert({
        company_id: companyId,
        amount: parseFloat(amount),
        description,
        contract_id: contractId || null,
        entry_date: new Date().toISOString().slice(0, 10),
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
        <label className="block text-xs text-white/50 mb-1">Amount *</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={fieldClass} />
      </div>
      <div>
        <label className="block text-xs text-white/50 mb-1">Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Lab specimen courier" className={fieldClass} />
      </div>
      <div>
        <label className="block text-xs text-white/50 mb-1">Contract</label>
        <select value={contractId} onChange={e => setContractId(e.target.value)} className={fieldClass}>
          <option value="">None</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {err && <p className="text-red-400 text-xs font-medium">{err}</p>}
      <button onClick={save} disabled={saving || !amount} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
        {saving ? 'Saving…' : 'Add Revenue'}
      </button>
    </div>
  )
}

function ExpenseForm({ companyId, onSave, onClose }) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('fuel')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!amount) return
    setSaving(true)
    setErr('')
    try {
      const { error } = await supabase.from('expense_entries').insert({
        company_id: companyId,
        amount: parseFloat(amount),
        category,
        description,
        entry_date: new Date().toISOString().slice(0, 10),
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
        <label className="block text-xs text-white/50 mb-1">Category *</label>
        <select value={category} onChange={e => setCategory(e.target.value)} className={fieldClass}>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-white/50 mb-1">Amount *</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={fieldClass} />
      </div>
      <div>
        <label className="block text-xs text-white/50 mb-1">Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Gas — Van 01" className={fieldClass} />
      </div>
      {err && <p className="text-red-400 text-xs font-medium">{err}</p>}
      <button onClick={save} disabled={saving || !amount} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
        {saving ? 'Saving…' : 'Add Expense'}
      </button>
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
        <label className="block text-xs text-white/50 mb-1">Contract *</label>
        <select value={contractId} onChange={e => setContractId(e.target.value)} className={fieldClass}>
          <option value="">Select contract</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-white/50 mb-1">Period Start</label>
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">Period End</label>
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={fieldClass} />
        </div>
      </div>
      <button onClick={fetchRuns} className="w-full bg-white/10 text-white/80 font-semibold py-2.5 rounded-xl text-sm">
        Load Completed Runs
      </button>
      {fetched && (
        <div className="bg-navy-800 rounded-xl p-3 space-y-1">
          <p className="text-xs font-semibold text-white/50">{runs.length} runs found</p>
          {runs.map(r => (
            <div key={r.id} className="flex justify-between text-xs text-white/60">
              <span className="truncate flex-1">{r.dropoff_address}</span>
              <span className="shrink-0 ml-2">{fmt(r.revenue_entries?.[0]?.amount ?? 0)}</span>
            </div>
          ))}
          <div className="border-t border-white/10 pt-1 flex justify-between text-sm font-bold text-white">
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

function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8 // earth radius, miles
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
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
            preset === p.key ? 'bg-brand-600 text-white' : 'bg-navy-800 text-white/50'
          }`}
        >
          {p.label}
        </button>
      ))}
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            className="bg-navy-800 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <span className="text-white/30 text-xs">to</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            className="bg-navy-800 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
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
        supabase.from('revenue_entries').select('amount, entry_date')
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

      {loading && <p className="text-sm text-white/40 text-center py-6">Loading analytics…</p>}

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

          <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07]">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">Revenue vs Expenses</p>
            {trendData.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-6">No revenue or expense entries in this range</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
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
              </ResponsiveContainer>
            )}
          </div>

          {expenseByCategory.length > 0 && (
            <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07]">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">Expenses by Category</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={expenseByCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                  <Tooltip
                    formatter={v => fmt(v)}
                    contentStyle={{ background: '#1A0B47', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                  />
                  <Bar dataKey="amount" fill="#3393E8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-navy-700 rounded-2xl border border-white/[0.07] overflow-hidden">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wide px-4 pt-4 pb-3">Crew Utilization</p>
            {driverRows.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-6">No completed runs in this range</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-white/35 uppercase tracking-wide border-t border-white/[0.06]">
                      <th className="text-left font-semibold px-4 py-2">Crew</th>
                      <th className="text-right font-semibold px-4 py-2">Completed Runs</th>
                      <th className="text-right font-semibold px-4 py-2">Avg Turnaround</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverRows.map(d => (
                      <tr key={d.driverId} className="border-t border-white/[0.06]">
                        <td className="px-4 py-2.5 text-white/80 truncate max-w-[10rem]">{d.name}</td>
                        <td className="px-4 py-2.5 text-right text-white font-semibold">{d.count}</td>
                        <td className="px-4 py-2.5 text-right text-white/60">{formatDuration(d.avgTurnaroundMs)}</td>
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

export default function Finances() {
  const { profile } = useAuth()
  const { revenue, expenses, invoices, contracts, totalRevenue, totalExpenses, netProfit, outstanding, refresh } = useFinances()
  const [sheet, setSheet] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const companyId = profile?.company_id
  const tabs = ['overview', 'analytics']

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Finances" />

      <div className="flex border-b border-white/[0.08] bg-navy-900 px-4 gap-4 md:px-8">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`py-3 text-xs font-semibold capitalize transition-colors border-b-2
              ${activeTab === t ? 'border-white text-white' : 'border-transparent text-white/40'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard label="Revenue MTD"  value={fmt(totalRevenue)}  color="green"  />
              <MetricCard label="Expenses MTD" value={fmt(totalExpenses)} color="yellow" />
              <MetricCard label="Net Profit"   value={fmt(netProfit)}     color={netProfit >= 0 ? 'green' : 'red'} />
              <MetricCard label="Outstanding"  value={fmt(outstanding)}   color="red"    />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setSheet('revenue')} className="bg-green-500/20 text-green-300 font-semibold py-2.5 rounded-xl text-xs active:bg-green-500/30">+ Revenue</button>
              <button onClick={() => setSheet('expense')} className="bg-yellow-500/20 text-yellow-300 font-semibold py-2.5 rounded-xl text-xs active:bg-yellow-500/30">+ Expense</button>
              <button onClick={() => setSheet('invoice')} className="bg-brand-500/20 text-brand-300 font-semibold py-2.5 rounded-xl text-xs active:bg-brand-500/30">+ Invoice</button>
            </div>

            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Recent Revenue</p>
              {revenue.length === 0 && <p className="text-sm text-white/40 text-center py-2">No entries this month</p>}
              {revenue.slice(0, 5).map(r => (
                <div key={r.id} className="bg-navy-700 rounded-xl px-4 py-3 border border-white/[0.07] flex items-center justify-between mb-2">
                  <p className="text-sm text-white/80 truncate flex-1">{r.description || 'Revenue entry'}</p>
                  <p className="text-sm font-bold text-green-400 ml-3">{fmt(r.amount)}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Recent Expenses</p>
              {expenses.length === 0 && <p className="text-sm text-white/40 text-center py-2">No entries this month</p>}
              {expenses.slice(0, 5).map(e => (
                <div key={e.id} className="bg-navy-700 rounded-xl px-4 py-3 border border-white/[0.07] flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-white/80">{e.description || e.category.replace('_', ' ')}</p>
                    <p className="text-xs text-white/40 capitalize">{e.category.replace('_', ' ')}</p>
                  </div>
                  <p className="text-sm font-bold text-red-400 ml-3">{fmt(e.amount)}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Invoices</p>
              {invoices.length === 0 && <p className="text-sm text-white/40 text-center py-2">No invoices yet</p>}
              {invoices.map(inv => (
                <div key={inv.id} className="bg-navy-700 rounded-xl p-4 border border-white/[0.07] flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">#{inv.invoice_number ?? inv.id.slice(0, 8)}</p>
                    <p className="text-xs text-white/50">{inv.contracts?.name ?? '—'}</p>
                    {inv.period_start && (
                      <p className="text-xs text-white/40">{safeFormatDate(inv.period_start, 'MMM d')} – {safeFormatDate(inv.period_end, 'MMM d, yyyy')}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{fmt(inv.total_amount ?? 0)}</p>
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
        <Sheet title="Add Revenue" onClose={() => setSheet(null)}>
          <RevenueForm companyId={companyId} contracts={contracts} onSave={refresh} onClose={() => setSheet(null)} />
        </Sheet>
      )}
      {sheet === 'expense' && (
        <Sheet title="Add Expense" onClose={() => setSheet(null)}>
          <ExpenseForm companyId={companyId} onSave={refresh} onClose={() => setSheet(null)} />
        </Sheet>
      )}
      {sheet === 'invoice' && (
        <Sheet title="Generate Invoice" onClose={() => setSheet(null)}>
          <InvoiceForm companyId={companyId} contracts={contracts} onSave={refresh} onClose={() => setSheet(null)} />
        </Sheet>
      )}
    </div>
  )
}
