import { useState, useEffect } from 'react'
import { useRuns } from '../hooks/useRuns'
import { useContracts } from '../hooks/useContracts'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { requestNotificationPermission, scheduleOverdueRunCheck, checkContractRenewals } from '../lib/notifications'
import MetricCard from '../components/ui/MetricCard'
import AlertBanner from '../components/ui/AlertBanner'
import StatusPill from '../components/ui/StatusPill'
import SegmentedToggle from '../components/ui/SegmentedToggle'
import TopBar from '../components/layout/TopBar'
import { Search, Truck, PackageCheck, FileText, ShieldCheck, Route, ArrowLeftRight, FileSignature, Briefcase } from 'lucide-react'
import { differenceInMinutes, startOfMonth, startOfYear } from 'date-fns'
import { safeFormatDate, safeDifferenceInDays } from '../lib/dates'
import { useNavigate } from 'react-router-dom'

const DISMISSED_KEY = 'vantar-dismissed-alerts'

const RUN_BADGE_COLORS = {
  pending:    'bg-yellow-500/15 text-yellow-300',
  assigned:   'bg-brand-500/15 text-brand-300',
  in_transit: 'bg-blue-500/15 text-blue-300',
  delivered:  'bg-green-500/15 text-green-300',
  cancelled:  'bg-fg/10 text-fg/40',
}

const PERIOD_OPTIONS = [
  { value: 'mtd', label: 'MTD' },
  { value: 'ytd', label: 'YTD' },
  { value: 'all', label: 'All Time' },
]

// Keyed by a fingerprint of the alert's content (e.g. contract id + end_date,
// not just contract id), not just the entity id — so if a dismissed
// "expiring in 12 days" alert later becomes "expired 3 days ago", that's a
// materially different warning and reappears rather than staying silenced
// forever from one earlier dismissal.
function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function loadDismissed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

export default function Dashboard() {
  const { profile } = useAuth()
  const { runs, loading: runsLoading } = useRuns({ limit: 5 })
  const { contracts } = useContracts()
  const navigate = useNavigate()
  const [anomalies, setAnomalies] = useState([])
  const [period, setPeriod] = useState(() => localStorage.getItem('vantar_dashboard_period') || 'mtd')
  useEffect(() => { localStorage.setItem('vantar_dashboard_period', period) }, [period])
  const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label ?? 'MTD'
  const [periodStats, setPeriodStats] = useState({
    activeRuns: 0, delivered: 0, totalMiles: 0, deadheadMiles: 0, contractRuns: 0, commercialRuns: 0,
  })
  const [dismissed, setDismissed] = useState(loadDismissed)

  function dismiss(key) {
    setDismissed(prev => {
      const next = new Set(prev).add(key)
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]))
      return next
    })
  }

  useEffect(() => {
    requestNotificationPermission().then(granted => {
      if (!granted) return
      if (runs.length) scheduleOverdueRunCheck(runs)
      if (contracts.length) checkContractRenewals(contracts)
    })
  }, [runs, contracts])

  useEffect(() => {
    if (!profile?.company_id) return
    async function detectAnomalies() {
      const cid = profile.company_id
      const { data: recent } = await supabase
        .from('runs')
        .select('id, status, pickup_address, dropoff_address, picked_up_at, delivered_at')
        .eq('company_id', cid)
        .eq('status', 'delivered')
        .not('picked_up_at', 'is', null)
        .not('delivered_at', 'is', null)
        .order('delivered_at', { ascending: false })
        .limit(30)

      if (!recent?.length) return

      const durations = recent.map(r => differenceInMinutes(new Date(r.delivered_at), new Date(r.picked_up_at)))
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      const threshold = avg * 1.4

      const { data: inTransit } = await supabase
        .from('runs')
        .select('id, dropoff_address, picked_up_at')
        .eq('company_id', cid)
        .eq('status', 'in_transit')
        .not('picked_up_at', 'is', null)

      const flagged = (inTransit ?? []).filter(r => {
        const elapsed = differenceInMinutes(new Date(), new Date(r.picked_up_at))
        return elapsed > threshold
      })

      setAnomalies(flagged)
    }
    detectAnomalies()
  }, [profile?.company_id])

  useEffect(() => {
    if (!profile?.company_id) return
    // useRuns({ limit: 5 }) above is only for the "Recent Runs" list — every
    // other Overview/Miles tile needs the full set of runs in the selected
    // period, not just the 5 most recent, so this queries directly rather
    // than widening that hook's limit for everyone. Previously Active Runs
    // and Delivered MTD were (incorrectly) derived from that same 5-row
    // array — fixed here to come from this properly period-scoped query.
    async function loadPeriodStats() {
      let query = supabase
        .from('runs')
        .select('status, contract_id, loaded_miles, deadhead_miles')
        .eq('company_id', profile.company_id)
      if (period === 'mtd') query = query.gte('created_at', startOfMonth(new Date()).toISOString())
      else if (period === 'ytd') query = query.gte('created_at', startOfYear(new Date()).toISOString())
      const { data } = await query
      const rows = data ?? []
      setPeriodStats({
        activeRuns: rows.filter(r => r.status === 'in_transit').length,
        delivered: rows.filter(r => r.status === 'delivered').length,
        totalMiles: rows.reduce((s, r) => s + Number(r.loaded_miles ?? 0) + Number(r.deadhead_miles ?? 0), 0),
        deadheadMiles: rows.reduce((s, r) => s + Number(r.deadhead_miles ?? 0), 0),
        contractRuns: rows.filter(r => r.contract_id).length,
        commercialRuns: rows.filter(r => !r.contract_id).length,
      })
    }
    loadPeriodStats()
  }, [profile?.company_id, period])

  const company = profile?.companies
  const today = new Date()

  const openContracts = contracts.filter(c => c.status === 'active').length

  const samDaysLeft = company?.sam_expiry ? safeDifferenceInDays(company.sam_expiry, today) : null
  const samKey = `sam-${profile?.company_id}-${company?.sam_expiry}`
  const expiredContracts = contracts
    .filter(c => {
      const days = safeDifferenceInDays(c.end_date, today)
      return days !== null && days < 0
    })
    .map(c => ({ ...c, alertKey: `expired-${c.id}-${c.end_date}` }))
    .filter(c => !dismissed.has(c.alertKey))
  const expiringContracts = contracts
    .filter(c => {
      const days = safeDifferenceInDays(c.end_date, today)
      return days !== null && days >= 0 && days <= 30
    })
    .map(c => ({ ...c, alertKey: `expiring-${c.id}-${c.end_date}` }))
    .filter(c => !dismissed.has(c.alertKey))
  const visibleAnomalies = anomalies
    .map(r => ({ ...r, alertKey: `anomaly-${r.id}` }))
    .filter(r => !dismissed.has(r.alertKey))

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Dashboard" />
      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-8">
        <p className="text-fg/50 text-sm">
          {greeting()}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          <span className="hidden sm:inline"> — here's what's happening today.</span>
        </p>

        {samDaysLeft !== null && samDaysLeft <= 30 && !dismissed.has(samKey) && (
          <AlertBanner
            type={samDaysLeft <= 7 ? 'error' : 'warning'}
            message={`SAM.gov expires in ${samDaysLeft} day${samDaysLeft === 1 ? '' : 's'} — renew immediately to keep government contracts active.`}
            onDismiss={() => dismiss(samKey)}
          />
        )}
        {expiredContracts.map(c => (
          <AlertBanner
            key={c.alertKey}
            type="error"
            message={`Contract "${c.name}" expired ${safeFormatDate(c.end_date, 'MMM d')} — ${Math.abs(safeDifferenceInDays(c.end_date, today))} days ago.`}
            onDismiss={() => dismiss(c.alertKey)}
          />
        ))}
        {expiringContracts.map(c => (
          <AlertBanner
            key={c.alertKey}
            type="warning"
            message={`Contract "${c.name}" expires ${safeFormatDate(c.end_date, 'MMM d')} — ${safeDifferenceInDays(c.end_date, today)} days remaining.`}
            onDismiss={() => dismiss(c.alertKey)}
          />
        ))}
        {visibleAnomalies.map(r => (
          <AlertBanner
            key={r.alertKey}
            type="error"
            message={`Run to ${r.dropoff_address} is running 40%+ over average delivery time.`}
            onDismiss={() => dismiss(r.alertKey)}
          />
        ))}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-fg/40 uppercase tracking-wide">Overview</h2>
            <a
              href="https://loadboard.truckerpath.com/carrier/loads/home"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-400 font-medium flex items-center gap-1"
            >
              <Search size={12} /> Find Backhaul
            </a>
          </div>
          <div className="max-w-xs mb-3">
            <SegmentedToggle options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Active Runs"    value={periodStats.activeRuns} color="blue" icon={Truck} />
            <MetricCard label={`Delivered ${periodLabel}`}  value={periodStats.delivered}  color="green" icon={PackageCheck} />
            <MetricCard label="Open Contracts" value={openContracts} color="yellow" icon={FileText} />
            <MetricCard
              label="SAM Expiry"
              value={samDaysLeft !== null ? `${samDaysLeft}d` : '—'}
              sub={company?.sam_expiry ? safeFormatDate(company.sam_expiry, 'MMM d, yyyy') : 'Not set'}
              color={samDaysLeft !== null && samDaysLeft <= 30 ? 'red' : 'navy'}
              icon={ShieldCheck}
            />
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-fg/40 uppercase tracking-wide mb-2">Miles &amp; Run Type ({periodLabel})</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Total Miles"    value={periodStats.totalMiles.toLocaleString()} color="navy" icon={Route} />
            <MetricCard label="Deadhead Miles" value={periodStats.deadheadMiles.toLocaleString()} sub={periodStats.totalMiles ? `${Math.round(periodStats.deadheadMiles / periodStats.totalMiles * 100)}% of total` : undefined} color="red" icon={ArrowLeftRight} />
            <MetricCard label="Contract Runs"  value={periodStats.contractRuns}  color="blue" icon={FileSignature} />
            <MetricCard label="Commercial Runs" value={periodStats.commercialRuns} color="yellow" icon={Briefcase} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-fg/40 uppercase tracking-wide">Recent Runs</h2>
            <button onClick={() => navigate('/runs')} className="text-xs text-brand-400 font-medium">View all →</button>
          </div>
          <div className="space-y-2">
            {!runsLoading && runs.length === 0 && (
              <p className="text-sm text-fg/40 text-center py-4">No runs yet</p>
            )}
            {runs.map(run => (
              <div
                key={run.id}
                onClick={() => navigate(`/runs/${run.id}`)}
                className="bg-navy-700 rounded-xl p-3 border border-fg/[0.07] shadow-sm shadow-black/5 hover:shadow-md hover:shadow-black/10 transition-all flex items-center gap-3 active:bg-navy-600 cursor-pointer"
              >
                <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${RUN_BADGE_COLORS[run.status] ?? 'bg-fg/10 text-fg/40'}`}>
                  <Truck size={15} strokeWidth={2.25} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{run.dropoff_address}</p>
                  <p className="text-xs text-fg/40 truncate">{run.profiles?.full_name ?? 'Unassigned'}</p>
                </div>
                <StatusPill status={run.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
