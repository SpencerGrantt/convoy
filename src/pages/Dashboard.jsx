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
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { format, differenceInDays, parseISO, differenceInMinutes } from 'date-fns'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { profile } = useAuth()
  const { runs, loading: runsLoading } = useRuns({ limit: 5 })
  const { contracts } = useContracts()
  const navigate = useNavigate()
  const [anomalies, setAnomalies] = useState([])

  // Request notification permission + fire contract/run checks
  useEffect(() => {
    requestNotificationPermission().then(granted => {
      if (!granted) return
      if (runs.length) scheduleOverdueRunCheck(runs)
      if (contracts.length) checkContractRenewals(contracts)
    })
  }, [runs, contracts])

  // Anomaly detection: flag in-transit runs >40% over avg delivery time
  useEffect(() => {
    async function detectAnomalies() {
      const { data: recent } = await supabase
        .from('runs')
        .select('id, status, pickup_address, dropoff_address, picked_up_at, delivered_at')
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
        .eq('status', 'in_transit')
        .not('picked_up_at', 'is', null)

      const flagged = (inTransit ?? []).filter(r => {
        const elapsed = differenceInMinutes(new Date(), new Date(r.picked_up_at))
        return elapsed > threshold
      })

      setAnomalies(flagged)
    }
    detectAnomalies()
  }, [])


  const company = profile?.companies
  const today = new Date()

  const activeRuns    = runs.filter(r => r.status === 'in_transit').length
  const deliveredMTD  = runs.filter(r => r.status === 'delivered').length
  const openContracts = contracts.filter(c => c.status === 'active').length

  const samDaysLeft = company?.sam_expiry ? differenceInDays(parseISO(company.sam_expiry), today) : null
  const expiringContracts = contracts.filter(c => {
    if (!c.end_date) return false
    return differenceInDays(parseISO(c.end_date), today) <= 30
  })

  return (
    <div className="pb-24">
      <TopBar />
      <div className="px-4 pt-4 space-y-4">
        {samDaysLeft !== null && samDaysLeft <= 30 && (
          <AlertBanner
            type={samDaysLeft <= 7 ? 'error' : 'warning'}
            message={`SAM.gov expires in ${samDaysLeft} day${samDaysLeft === 1 ? '' : 's'} — renew immediately to keep government contracts active.`}
          />
        )}
        {expiringContracts.map(c => (
          <AlertBanner
            key={c.id}
            type="warning"
            message={`Contract "${c.name}" expires ${format(parseISO(c.end_date), 'MMM d')} — ${differenceInDays(parseISO(c.end_date), today)} days remaining.`}
          />
        ))}
        {anomalies.map(r => (
          <AlertBanner
            key={r.id}
            type="error"
            message={`⏱ Run to ${r.dropoff_address} is running 40%+ over average delivery time.`}
          />
        ))}

        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Active Runs"    value={activeRuns}    icon="🚗" color="navy"   />
            <MetricCard label="Delivered MTD"  value={deliveredMTD}  icon="✅" color="green"  />
            <MetricCard label="Open Contracts" value={openContracts} icon="📋" color="yellow" />
            <MetricCard
              label="SAM Expiry"
              value={samDaysLeft !== null ? `${samDaysLeft}d` : '—'}
              sub={company?.sam_expiry ? format(parseISO(company.sam_expiry), 'MMM d, yyyy') : 'Not set'}
              icon="🏛️"
              color={samDaysLeft !== null && samDaysLeft <= 30 ? 'red' : 'navy'}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recent Runs</h2>
            <button onClick={() => navigate('/runs')} className="text-xs text-brand-700 font-medium">View all →</button>
          </div>
          {runsLoading ? <LoadingSpinner size="sm" /> : (
            <div className="space-y-2">
              {runs.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No runs yet</p>
              )}
              {runs.map(run => (
                <div
                  key={run.id}
                  onClick={() => navigate(`/runs/${run.id}`)}
                  className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3 active:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{run.dropoff_address}</p>
                    <p className="text-xs text-gray-400 truncate">{run.profiles?.full_name ?? 'Unassigned'}</p>
                  </div>
                  <StatusPill status={run.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
