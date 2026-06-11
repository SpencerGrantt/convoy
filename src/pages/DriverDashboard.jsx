import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'
import StatusPill from '../components/ui/StatusPill'
import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, Package, CheckCircle2, ChevronRight, Truck, AlertCircle } from 'lucide-react'
import { format, isToday, parseISO } from 'date-fns'

const STATUS_ACTIONS = {
  assigned:   { label: 'Start Run',     next: 'in_transit' },
  in_transit: { label: 'Mark Delivered', next: 'delivered'  },
}

export default function DriverDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  const firstName = profile?.full_name?.split(' ')[0] || 'Driver'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    if (!profile?.id) return
    fetchMyRuns()
  }, [profile?.id])

  async function fetchMyRuns() {
    setLoading(true)
    const { data } = await supabase
      .from('runs')
      .select('*, vehicles(name, make, model)')
      .eq('driver_id', profile.id)
      .in('status', ['assigned', 'in_transit', 'pending'])
      .order('scheduled_at', { ascending: true })
    setRuns(data ?? [])
    setLoading(false)
  }

  async function advanceStatus(run) {
    const next = STATUS_ACTIONS[run.status]?.next
    if (!next) return
    setUpdating(run.id)
    const patch = { status: next }
    if (next === 'in_transit') patch.picked_up_at = new Date().toISOString()
    if (next === 'delivered')  patch.delivered_at  = new Date().toISOString()
    await supabase.from('runs').update(patch).eq('id', run.id)
    await fetchMyRuns()
    setUpdating(null)
  }

  const todayRuns     = runs.filter(r => r.scheduled_at && isToday(parseISO(r.scheduled_at)))
  const upcomingRuns  = runs.filter(r => !r.scheduled_at || !isToday(parseISO(r.scheduled_at)))
  const activeRun     = runs.find(r => r.status === 'in_transit')

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="My Dashboard" />

      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">

        {/* Greeting card */}
        <div className="bg-brand-600 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/40 to-transparent pointer-events-none" />
          <p className="text-brand-200 text-sm font-medium">{greeting},</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">{firstName}</h1>
          <p className="text-brand-200/80 text-sm mt-1">
            {loading ? '…' : runs.length === 0
              ? 'No active runs assigned.'
              : `${runs.length} run${runs.length !== 1 ? 's' : ''} in your queue`}
          </p>
          {activeRun && (
            <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <Truck size={14} className="text-white/80 shrink-0" />
              <span className="text-white text-xs font-semibold">Active run in progress</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today's Runs",  value: todayRuns.length },
            { label: 'In Progress',   value: runs.filter(r => r.status === 'in_transit').length },
            { label: 'Pending',       value: runs.filter(r => r.status === 'pending' || r.status === 'assigned').length },
          ].map(stat => (
            <div key={stat.label} className="bg-navy-700 rounded-2xl p-3 border border-white/[0.07] text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-[10px] text-white/40 mt-0.5 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Active run — prominent */}
        {activeRun && (
          <div className="bg-navy-700 rounded-2xl border border-brand-600/30 overflow-hidden">
            <div className="bg-brand-600/10 px-4 py-2 border-b border-brand-600/20 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
              <span className="text-xs font-semibold text-brand-300 uppercase tracking-wide">Active Run</span>
            </div>
            <RunCard run={activeRun} onAdvance={advanceStatus} updating={updating} navigate={navigate} />
          </div>
        )}

        {/* Today's runs */}
        {todayRuns.filter(r => r.id !== activeRun?.id).length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide px-1 mb-2">Today</h2>
            <div className="space-y-2">
              {todayRuns
                .filter(r => r.id !== activeRun?.id)
                .map(run => (
                  <div key={run.id} className="bg-navy-700 rounded-2xl border border-white/[0.07] overflow-hidden">
                    <RunCard run={run} onAdvance={advanceStatus} updating={updating} navigate={navigate} />
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Upcoming runs */}
        {upcomingRuns.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide px-1 mb-2">Upcoming</h2>
            <div className="space-y-2">
              {upcomingRuns.map(run => (
                <div key={run.id} className="bg-navy-700 rounded-2xl border border-white/[0.07] overflow-hidden">
                  <RunCard run={run} onAdvance={advanceStatus} updating={updating} navigate={navigate} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty */}
        {!loading && runs.length === 0 && (
          <div className="bg-navy-700 rounded-2xl border border-white/[0.07] p-8 text-center space-y-2">
            <CheckCircle2 size={32} className="text-green-400 mx-auto" />
            <p className="text-white font-semibold">All caught up!</p>
            <p className="text-white/40 text-sm">No active or upcoming runs assigned to you.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function RunCard({ run, onAdvance, updating, navigate }) {
  const action = STATUS_ACTIONS[run.status]
  const isUpdating = updating === run.id

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill status={run.status} />
            {run.temp_sensitive && (
              <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/20 px-1.5 py-0.5 rounded-full font-semibold">
                TEMP SENSITIVE
              </span>
            )}
          </div>
          {run.scheduled_at && (
            <p className="text-xs text-white/40 flex items-center gap-1">
              <Clock size={10} />
              {format(parseISO(run.scheduled_at), 'h:mm a')}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(`/runs/${run.id}`)}
          className="shrink-0 text-white/30 hover:text-white/60 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2.5">
          <div className="w-4 h-4 rounded-full bg-brand-600/30 border border-brand-600/50 shrink-0 mt-0.5 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
          </div>
          <p className="text-sm text-white/80 leading-tight line-clamp-1">{run.pickup_address}</p>
        </div>
        <div className="ml-2 w-px h-3 bg-white/10" />
        <div className="flex items-start gap-2.5">
          <MapPin size={16} className="text-green-400 shrink-0 mt-0.5" />
          <p className="text-sm text-white/80 leading-tight line-clamp-1">{run.dropoff_address}</p>
        </div>
      </div>

      {run.cargo_description && (
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Package size={12} />
          <span className="line-clamp-1">{run.cargo_description}</span>
        </div>
      )}

      {run.vehicles && (
        <p className="text-xs text-white/30">
          {run.vehicles.name || `${run.vehicles.make} ${run.vehicles.model}`}
        </p>
      )}

      {action && (
        <button
          onClick={() => onAdvance(run)}
          disabled={isUpdating}
          className={`w-full font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50
            ${run.status === 'in_transit'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-brand-600 hover:bg-brand-700 text-white'}`}
        >
          {isUpdating ? 'Updating…' : action.label}
        </button>
      )}

      {run.anomaly_flag && (
        <div className="flex items-center gap-2 text-xs text-orange-300 bg-orange-500/10 rounded-lg px-3 py-2">
          <AlertCircle size={12} />
          {run.anomaly_note || 'Anomaly flagged on this run'}
        </div>
      )}
    </div>
  )
}
