import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRuns } from '../hooks/useRuns'
import { useAuth } from '../hooks/useAuth'
import StatusPill from '../components/ui/StatusPill'
import TopBar from '../components/layout/TopBar'
import { safeFormatDate } from '../lib/dates'

const TABS = ['all', 'pending', 'in_transit', 'delivered']
const TYPE_FILTERS = ['all', 'contract', 'commercial']

export default function Runs() {
  const [activeTab, setActiveTab] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const { runs: allRuns, loading } = useRuns({ status: activeTab })
  const navigate = useNavigate()
  const { profile } = useAuth()
  // Creating/assigning a run is dispatch work — matches /runs/new's own
  // route restriction (App.jsx) and the RLS policy backing it
  // (018_lock_down_chain_of_custody_rls.sql), not just a UI-only hide.
  const canCreateRuns = profile?.role === 'owner' || profile?.role === 'dispatcher'

  // contract_id is optional on every run — a null value means a commercial/
  // broker-booked haul with no SAM contract behind it. Filtering client-side
  // here (not a new useRuns param) since the full set is already fetched and
  // company-sized data volumes make that fine.
  const runs = allRuns.filter(r => {
    if (typeFilter === 'contract') return !!r.contract_id
    if (typeFilter === 'commercial') return !r.contract_id
    return true
  })

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Runs" />

      <div className="sticky top-0 md:top-0 bg-navy-900 border-b border-fg/[0.08] z-10 px-4 pt-2 pb-0 flex gap-1 overflow-x-auto md:px-8">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'text-fg border-b-2 border-fg'
                : 'text-fg/40'
            }`}
          >
            {tab === 'in_transit' ? 'In Transit' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-2 md:px-8 md:pt-6">
        {canCreateRuns && (
          <button
            onClick={() => navigate('/runs/new')}
            className="w-full bg-brand-600 text-white font-semibold py-3 rounded-xl active:bg-brand-700 transition-colors mb-4"
          >
            + New Run
          </button>
        )}

        <div className="flex gap-1 bg-navy-800 rounded-xl p-1 mb-4">
          {TYPE_FILTERS.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                typeFilter === t ? 'bg-brand-600 text-white' : 'text-fg/40'
              }`}
            >
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>

        {!loading && runs.length === 0 && (
          <p className="text-sm text-fg/40 text-center py-8">No runs found</p>
        )}
        {runs.map(run => (
          <div
            key={run.id}
            onClick={() => navigate(`/runs/${run.id}`)}
            className="bg-navy-700 rounded-xl p-4 border border-fg/[0.07] active:bg-navy-600 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusPill status={run.status} />
                  {run.temp_sensitive && (
                    <span className="text-xs bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded font-medium">❄️ Temp</span>
                  )}
                </div>
                <p className="text-xs text-fg/40">From: <span className="text-fg/70">{run.pickup_address}</span></p>
                <p className="text-xs text-fg/40">To: <span className="text-fg font-medium">{run.dropoff_address}</span></p>
                <div className="flex items-center gap-3 mt-1.5">
                  <p className="text-xs text-fg/40">{run.profiles?.full_name ?? 'Unassigned'}</p>
                  {run.vehicles?.name && <p className="text-xs text-fg/40">{run.vehicles.name}</p>}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  {run.contracts?.name ? (
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-medium">{run.contracts.name}</span>
                  ) : run.broker_name ? (
                    <span className="text-[10px] bg-fg/10 text-fg/50 px-1.5 py-0.5 rounded font-medium">{run.broker_name}</span>
                  ) : null}
                  {run.bol_number && <span className="text-[10px] text-fg/30">BOL {run.bol_number}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-fg/40">
                  {run.scheduled_at ? safeFormatDate(run.scheduled_at, 'MMM d h:mm a') : safeFormatDate(run.created_at, 'MMM d')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
