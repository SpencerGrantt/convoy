import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRuns } from '../hooks/useRuns'
import StatusPill from '../components/ui/StatusPill'
import TopBar from '../components/layout/TopBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { format } from 'date-fns'

const TABS = ['all', 'pending', 'in_transit', 'delivered']

export default function Runs() {
  const [activeTab, setActiveTab] = useState('all')
  const { runs, loading } = useRuns({ status: activeTab })
  const navigate = useNavigate()

  return (
    <div className="pb-24">
      <TopBar title="Runs" />

      <div className="sticky top-[57px] bg-white border-b border-gray-100 z-10 px-4 pt-2 pb-0 flex gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-400'
            }`}
          >
            {tab === 'in_transit' ? 'In Transit' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-2">
        <button
          onClick={() => navigate('/runs/new')}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl active:bg-blue-700 transition-colors mb-4"
        >
          + New Run
        </button>

        {loading ? <LoadingSpinner /> : (
          <>
            {runs.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No runs found</p>
            )}
            {runs.map(run => (
              <div
                key={run.id}
                onClick={() => navigate(`/runs/${run.id}`)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusPill status={run.status} />
                      {run.temp_sensitive && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">❄️ Temp</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">From: <span className="text-gray-700">{run.pickup_address}</span></p>
                    <p className="text-xs text-gray-500">To: <span className="text-gray-700 font-medium">{run.dropoff_address}</span></p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-xs text-gray-400">{run.profiles?.full_name ?? 'Unassigned'}</p>
                      {run.vehicles?.name && <p className="text-xs text-gray-400">{run.vehicles.name}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">
                      {run.scheduled_at ? format(new Date(run.scheduled_at), 'MMM d h:mm a') : format(new Date(run.created_at), 'MMM d')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
