import { useState, useEffect } from 'react'
import { useRuns } from '../hooks/useRuns'
import { useContracts } from '../hooks/useContracts'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { requestNotificationPermission, scheduleOverdueRunCheck, checkContractRenewals } from '../lib/notifications'
import MetricCard from '../components/ui/MetricCard'
import AlertBanner from '../components/ui/AlertBanner'
import StatusPill from '../components/ui/StatusPill'
import TopBar from '../components/layout/TopBar'
import { differenceInMinutes, startOfMonth } from 'date-fns'
import { safeFormatDate, safeDifferenceInDays } from '../lib/dates'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { profile } = useAuth()
  const { runs, loading: runsLoading } = useRuns({ limit: 5 })
  const { contracts } = useContracts()
  const navigate = useNavigate()
  const [anomalies, setAnomalies] = useState([])
  const [mtdStats, setMtdStats] = useState({ totalMiles: 0, deadheadMiles: 0, contractRuns: 0, commercialRuns: 0 })

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
    // useRuns({ limit: 5 }) above is only for the "Recent Runs" list — miles
    // and contract/commercial counts need every run this month, so this
    // queries directly rather than widening that hook's limit for everyone.
    async function loadMtdStats() {
      const { data } = await supabase
        .from('runs')
        .select('contract_id, loaded_miles, deadhead_miles')
        .eq('company_id', profile.company_id)
        .gte('created_at', startOfMonth(new Date()).toISOString())
      const rows = data ?? []
      setMtdStats({
        totalMiles: rows.reduce((s, r) => s + Number(r.loaded_miles ?? 0) + Number(r.deadhead_miles ?? 0), 0),
        deadheadMiles: rows.reduce((s, r) => s + Number(r.deadhead_miles ?? 0), 0),
        contractRuns: rows.filter(r => r.contract_id).length,
        commercialRuns: rows.filter(r => !r.contract_id).length,
      })
    }
    loadMtdStats()
  }, [profile?.company_id])

  const company = profile?.companies
  const today = new Date()

  const activeRuns    = runs.filter(r => r.status === 'in_transit').length
  const deliveredMTD  = runs.filter(r => r.status === 'delivered').length
  const openContracts = contracts.filter(c => c.status === 'active').length

  const samDaysLeft = company?.sam_expiry ? safeDifferenceInDays(company.sam_expiry, today) : null
  const expiredContracts = contracts.filter(c => {
    const days = safeDifferenceInDays(c.end_date, today)
    return days !== null && days < 0
  })
  const expiringContracts = contracts.filter(c => {
    const days = safeDifferenceInDays(c.end_date, today)
    return days !== null && days >= 0 && days <= 30
  })

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Dashboard" />
      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-8">
        {samDaysLeft !== null && samDaysLeft <= 30 && (
          <AlertBanner
            type={samDaysLeft <= 7 ? 'error' : 'warning'}
            message={`SAM.gov expires in ${samDaysLeft} day${samDaysLeft === 1 ? '' : 's'} — renew immediately to keep government contracts active.`}
          />
        )}
        {expiredContracts.map(c => (
          <AlertBanner
            key={c.id}
            type="error"
            message={`Contract "${c.name}" expired ${safeFormatDate(c.end_date, 'MMM d')} — ${Math.abs(safeDifferenceInDays(c.end_date, today))} days ago.`}
          />
        ))}
        {expiringContracts.map(c => (
          <AlertBanner
            key={c.id}
            type="warning"
            message={`Contract "${c.name}" expires ${safeFormatDate(c.end_date, 'MMM d')} — ${safeDifferenceInDays(c.end_date, today)} days remaining.`}
          />
        ))}
        {anomalies.map(r => (
          <AlertBanner
            key={r.id}
            type="error"
            message={`Run to ${r.dropoff_address} is running 40%+ over average delivery time.`}
          />
        ))}

        <div>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Overview</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Active Runs"    value={activeRuns}    color="blue"   />
            <MetricCard label="Delivered MTD"  value={deliveredMTD}  color="green"  />
            <MetricCard label="Open Contracts" value={openContracts} color="yellow" />
            <MetricCard
              label="SAM Expiry"
              value={samDaysLeft !== null ? `${samDaysLeft}d` : '—'}
              sub={company?.sam_expiry ? safeFormatDate(company.sam_expiry, 'MMM d, yyyy') : 'Not set'}
              color={samDaysLeft !== null && samDaysLeft <= 30 ? 'red' : 'navy'}
            />
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Miles &amp; Run Type (MTD)</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Total Miles"    value={mtdStats.totalMiles.toLocaleString()} color="navy" />
            <MetricCard label="Deadhead Miles" value={mtdStats.deadheadMiles.toLocaleString()} sub={mtdStats.totalMiles ? `${Math.round(mtdStats.deadheadMiles / mtdStats.totalMiles * 100)}% of total` : undefined} color="red" />
            <MetricCard label="Contract Runs"  value={mtdStats.contractRuns}  color="blue" />
            <MetricCard label="Commercial Runs" value={mtdStats.commercialRuns} color="yellow" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide">Recent Runs</h2>
            <button onClick={() => navigate('/runs')} className="text-xs text-brand-400 font-medium">View all →</button>
          </div>
          <div className="space-y-2">
            {!runsLoading && runs.length === 0 && (
              <p className="text-sm text-white/40 text-center py-4">No runs yet</p>
            )}
            {runs.map(run => (
              <div
                key={run.id}
                onClick={() => navigate(`/runs/${run.id}`)}
                className="bg-navy-700 rounded-xl p-3 border border-white/[0.07] flex items-center gap-3 active:bg-navy-600 cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{run.dropoff_address}</p>
                  <p className="text-xs text-white/40 truncate">{run.profiles?.full_name ?? 'Unassigned'}</p>
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
