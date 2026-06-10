import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRuns } from '../hooks/useRuns'
import StatusPill from '../components/ui/StatusPill'
import TopBar from '../components/layout/TopBar'
import { format } from 'date-fns'

const TABS = ['all', 'pending', 'in_transit', 'delivered']

export default function Runs() {
  const [activeTab, setActiveTab] = useState('all')
  const { runs, loading } = useRuns({ status: activeTab })
  const navigate = useNavigate()

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="Runs" />

      <div className="sticky top-0 md:top-0 bg-navy-900 border-b border-white/[0.08] z-10 px-4 pt-2 pb-0 flex gap-1 overflow-x-auto md:px-8">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-white'
                : 'text-white/40'
            }`}
          >
            {tab === 'in_transit' ? 'In Transit' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-2 md:px-8 md:pt-6">
        <button
          onClick={() => navigate('/runs/new')}
          className="w-full bg-brand-600 text-white font-semibold py-3 rounded-xl active:bg-brand-700 transition-colors mb-4"
        >
          + New Run
        </button>

        {!loading && runs.length === 0 && (
          <p className="text-sm text-white/40 text-center py-8">No runs found</p>
        )}
        {runs.map(run => (
          <div
            key={run.id}
            onClick={() => navigate(`/runs/${run.id}`)}
            className="bg-navy-700 rounded-xl p-4 border border-white/[0.07] active:bg-navy-600 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusPill status={run.status} />
                  {run.temp_sensitive && (
                    <span className="text-xs bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded font-medium">❄️ Temp</span>
                  )}
                </div>
                <p className="text-xs text-white/40">From: <span className="text-white/70">{run.pickup_address}</span></p>
                <p className="text-xs text-white/40">To: <span className="text-white font-medium">{run.dropoff_address}</span></p>
                <div className="flex items-center gap-3 mt-1.5">
                  <p className="text-xs text-white/40">{run.profiles?.full_name ?? 'Unassigned'}</p>
                  {run.vehicles?.name && <p className="text-xs text-white/40">{run.vehicles.name}</p>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-white/40">
                  {run.scheduled_at ? format(new Date(run.scheduled_at), 'MMM d h:mm a') : format(new Date(run.created_at), 'MMM d')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
