import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'
import MetricCard from '../components/ui/MetricCard'
import { safeFormatDate } from '../lib/dates'
import { subDays, startOfYear, parseISO, isValid, format as formatDateFns } from 'date-fns'
import { DollarSign, MapPin } from 'lucide-react'

function fmt(n) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ─────────────────────────────────────────────────────────────────────────
// Date range control — same pattern as Finances.jsx's Analytics tab
// (useDateRange/DateRangeControl/RANGE_PRESETS). Not imported from there
// since that file doesn't export them; duplicated rather than refactoring
// Finances.jsx to export shared internals. granularity is dropped since
// this page is a totals + list view, not a bucketed trend chart.
// ─────────────────────────────────────────────────────────────────────────

const RANGE_PRESETS = [
  { key: '30d',   label: 'Last 30 Days' },
  { key: '90d',   label: 'Last 90 Days' },
  { key: 'year',  label: 'This Year' },
  { key: 'custom', label: 'Custom' },
]

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
    return {
      startStr,
      endStr,
      startISO: `${startStr}T00:00:00`,
      endISO: `${endStr}T23:59:59`,
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

// ─────────────────────────────────────────────────────────────────────────

function useMyRuns(driverId, range) {
  const [state, setState] = useState({ loading: true, runs: [] })

  useEffect(() => {
    if (!driverId) return
    let cancelled = false
    async function load() {
      setState(s => ({ ...s, loading: true }))
      const { data } = await supabase
        .from('runs')
        .select('id, pickup_address, dropoff_address, delivered_at, revenue_entries(amount)')
        .eq('driver_id', driverId)
        .eq('status', 'delivered')
        .gte('delivered_at', range.startISO)
        .lte('delivered_at', range.endISO)
        .order('delivered_at', { ascending: false })
      if (cancelled) return
      setState({ loading: false, runs: data ?? [] })
    }
    load()
    return () => { cancelled = true }
  }, [driverId, range.startISO, range.endISO])

  return state
}

// A run with no linked revenue_entries row is a genuinely different state
// than one confirmed at $0 (revenue_entries.run_id is optional and often
// just not populated yet) — this helper keeps "no data" and "computed $0"
// from ever collapsing into the same number down the line.
function runEarnings(run, payPercent) {
  const hasRevenue = Array.isArray(run.revenue_entries) && run.revenue_entries.length > 0
  const revenueAmount = hasRevenue ? Number(run.revenue_entries[0].amount) : null
  const earnings = hasRevenue ? (revenueAmount * payPercent) / 100 : null
  return { hasRevenue, revenueAmount, earnings }
}

function routeLabel(run) {
  return `${run.pickup_address} → ${run.dropoff_address}`
}

export default function MyEarnings() {
  const { profile } = useAuth()
  const { preset, setPreset, customStart, setCustomStart, customEnd, setCustomEnd, range } = useDateRange()
  const payPercent = profile?.pay_percent
  const hasPayRate = payPercent != null
  const { loading, runs } = useMyRuns(hasPayRate ? profile?.id : null, range)

  // Owner hasn't set a pay rate yet — nothing below this can be computed
  // honestly, so show the explanation instead of a page full of numbers
  // that would look real but aren't.
  if (!hasPayRate) {
    return (
      <div className="pb-24 md:pb-8">
        <TopBar title="My Earnings" />
        <div className="px-4 pt-4 md:px-8 md:pt-6">
          <div className="bg-navy-700 rounded-2xl border border-white/[0.07] p-8 text-center space-y-2">
            <DollarSign size={32} className="text-white/20 mx-auto" />
            <p className="text-white font-semibold">Your pay rate hasn't been set yet</p>
            <p className="text-white/40 text-sm">Ask your admin to set it in Settings.</p>
          </div>
        </div>
      </div>
    )
  }

  const rows = runs.map(run => ({ run, ...runEarnings(run, payPercent) }))
  const totalEarned = rows.reduce((sum, r) => sum + (r.hasRevenue ? r.earnings : 0), 0)
  const missingRevenueCount = rows.filter(r => !r.hasRevenue).length

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="My Earnings" />
      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">

        <DateRangeControl
          preset={preset} setPreset={setPreset}
          customStart={customStart} setCustomStart={setCustomStart}
          customEnd={customEnd} setCustomEnd={setCustomEnd}
        />

        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Total Earned"
            value={fmt(totalEarned)}
            color="green"
            sub={`At your ${payPercent}% pay rate — runs with no revenue logged yet count as $0 here`}
          />
          <MetricCard
            label="Completed Runs"
            value={rows.length}
            sub={missingRevenueCount > 0 ? `${missingRevenueCount} with no revenue logged yet` : 'All have revenue logged'}
          />
        </div>

        {loading && <p className="text-sm text-white/40 text-center py-6">Loading your earnings…</p>}

        {!loading && rows.length === 0 && (
          <div className="bg-navy-700 rounded-2xl border border-white/[0.07] p-8 text-center space-y-2">
            <MapPin size={32} className="text-white/20 mx-auto" />
            <p className="text-white font-semibold">No completed runs in this period</p>
            <p className="text-white/40 text-sm">Delivered runs in the selected range will show up here.</p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="space-y-2">
            {rows.map(({ run, hasRevenue, revenueAmount, earnings }) => (
              <div key={run.id} className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-white/80 truncate flex-1">{routeLabel(run)}</p>
                  <p className="text-xs text-white/40 shrink-0">{safeFormatDate(run.delivered_at, 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-white/[0.06]">
                  <div>
                    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">Revenue</p>
                    {hasRevenue ? (
                      <p className="text-sm text-white/70 mt-0.5">{fmt(revenueAmount)}</p>
                    ) : (
                      <p className="text-sm text-white/30 italic mt-0.5">No revenue logged yet</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">Your Earnings</p>
                    {hasRevenue ? (
                      <p className="text-sm font-bold text-green-400 mt-0.5">{fmt(earnings)}</p>
                    ) : (
                      <p className="text-sm font-semibold text-white/30 mt-0.5">—</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
