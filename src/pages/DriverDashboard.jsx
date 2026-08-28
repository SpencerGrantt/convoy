import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'
import StatusPill from '../components/ui/StatusPill'
import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, Package, CheckCircle2, ChevronRight, Truck, AlertCircle, Navigation, ClipboardCheck, ShieldCheck, Users, DollarSign, MapPinned, Search } from 'lucide-react'
import { safeFormatDate, safeIsToday } from '../lib/dates'

const STATUS_ACTIONS = {
  assigned:   { label: 'Start Run',     next: 'in_transit' },
  in_transit: { label: 'Mark Delivered', next: 'delivered'  },
}

// History tab covers completed/cancelled runs from the last 60 days — the
// fetchMyRuns() query below only ever pulls open work, so without this a
// driver has no way to see anything they already delivered.
const HISTORY_WINDOW_DAYS = 60

export default function DriverDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  const [tab, setTab] = useState('active')
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  const firstName = profile?.full_name?.split(' ')[0] || 'Driver'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    if (!profile?.id) return
    fetchMyRuns()
  }, [profile?.id])

  // fetchHistory/historyLoaded are intentionally left out of the deps array
  // (same convention as the fetchMyRuns effect above) — historyLoaded is the
  // guard that stops this from refetching, not a trigger, and fetchHistory
  // is redefined every render so including it would refetch on every render.
  useEffect(() => {
    if (tab === 'history' && !historyLoaded && profile?.id) fetchHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, profile?.id])

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

  async function fetchHistory() {
    setHistoryLoading(true)
    const cutoff = new Date(Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('runs')
      .select('*, vehicles(name, make, model)')
      .eq('driver_id', profile.id)
      .in('status', ['delivered', 'cancelled'])
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(60)
    setHistory(data ?? [])
    setHistoryLoading(false)
    setHistoryLoaded(true)
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

  const todayRuns     = runs.filter(r => r.scheduled_at && safeIsToday(r.scheduled_at))
  const upcomingRuns  = runs.filter(r => !r.scheduled_at || !safeIsToday(r.scheduled_at))
  const activeRun     = runs.find(r => r.status === 'in_transit')

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="My Dashboard" />

      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">

        {/* Greeting card */}
        <div className="theme-dark bg-brand-600 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/40 to-transparent pointer-events-none" />
          <p className="text-brand-200 text-sm font-medium">{greeting},</p>
          <h1 className="text-fg text-2xl font-bold mt-0.5">{firstName}</h1>
          <p className="text-brand-200/80 text-sm mt-1">
            {loading ? '…' : runs.length === 0
              ? 'No active runs assigned.'
              : `${runs.length} run${runs.length !== 1 ? 's' : ''} in your queue`}
          </p>
          {activeRun && (
            <div className="mt-3 flex items-center gap-2 bg-fg/10 rounded-xl px-3 py-2">
              <Truck size={14} className="text-fg/80 shrink-0" />
              <span className="text-fg text-xs font-semibold">Active run in progress</span>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => navigate('/inspections/new')}
            className="bg-navy-700 rounded-2xl p-3 border border-fg/[0.07] flex flex-col items-center gap-2 active:bg-navy-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-600/25 flex items-center justify-center shrink-0">
              <ClipboardCheck size={16} className="text-brand-300" />
            </div>
            <span className="text-xs font-semibold text-fg/80 text-center leading-tight">Inspection</span>
          </button>
          <button
            onClick={() => navigate('/my-compliance')}
            className="bg-navy-700 rounded-2xl p-3 border border-fg/[0.07] flex flex-col items-center gap-2 active:bg-navy-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-600/25 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} className="text-brand-300" />
            </div>
            <span className="text-xs font-semibold text-fg/80 text-center leading-tight">Documents</span>
          </button>
          <button
            onClick={() => navigate('/my-team')}
            className="bg-navy-700 rounded-2xl p-3 border border-fg/[0.07] flex flex-col items-center gap-2 active:bg-navy-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-600/25 flex items-center justify-center shrink-0">
              <Users size={16} className="text-brand-300" />
            </div>
            <span className="text-xs font-semibold text-fg/80 text-center leading-tight">My Team</span>
          </button>
          <button
            onClick={() => navigate('/my-earnings')}
            className="bg-navy-700 rounded-2xl p-3 border border-fg/[0.07] flex flex-col items-center gap-2 active:bg-navy-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-600/25 flex items-center justify-center shrink-0">
              <DollarSign size={16} className="text-brand-300" />
            </div>
            <span className="text-xs font-semibold text-fg/80 text-center leading-tight">Earnings</span>
          </button>
          <button
            onClick={() => navigate('/mileage')}
            className="bg-navy-700 rounded-2xl p-3 border border-fg/[0.07] flex flex-col items-center gap-2 active:bg-navy-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-600/25 flex items-center justify-center shrink-0">
              <MapPinned size={16} className="text-brand-300" />
            </div>
            <span className="text-xs font-semibold text-fg/80 text-center leading-tight">Mileage</span>
          </button>
          <a
            href="https://loadboard.truckerpath.com/carrier/loads/home"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-navy-700 rounded-2xl p-3 border border-fg/[0.07] flex flex-col items-center gap-2 active:bg-navy-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-600/25 flex items-center justify-center shrink-0">
              <Search size={16} className="text-brand-300" />
            </div>
            <span className="text-xs font-semibold text-fg/80 text-center leading-tight">Find Backhaul</span>
          </a>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today's Runs",  value: todayRuns.length },
            { label: 'In Progress',   value: runs.filter(r => r.status === 'in_transit').length },
            { label: 'Pending',       value: runs.filter(r => r.status === 'pending' || r.status === 'assigned').length },
          ].map(stat => (
            <div key={stat.label} className="bg-navy-700 rounded-2xl p-3 border border-fg/[0.07] text-center">
              <p className="text-2xl font-bold text-fg">{stat.value}</p>
              <p className="text-[10px] text-fg/40 mt-0.5 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Active / History tab switcher */}
        <div className="bg-navy-700 rounded-2xl p-1.5 border border-fg/[0.07] flex gap-1.5">
          {[
            { value: 'active',  label: 'Active' },
            { value: 'history', label: 'History' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t.value ? 'bg-brand-600 text-white' : 'text-fg/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'active' && (
          <>
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
                <h2 className="text-xs font-semibold text-fg/40 uppercase tracking-wide px-1 mb-2">Today</h2>
                <div className="space-y-2">
                  {todayRuns
                    .filter(r => r.id !== activeRun?.id)
                    .map(run => (
                      <div key={run.id} className="bg-navy-700 rounded-2xl border border-fg/[0.07] overflow-hidden">
                        <RunCard run={run} onAdvance={advanceStatus} updating={updating} navigate={navigate} />
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Upcoming runs */}
            {upcomingRuns.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-fg/40 uppercase tracking-wide px-1 mb-2">Upcoming</h2>
                <div className="space-y-2">
                  {upcomingRuns.map(run => (
                    <div key={run.id} className="bg-navy-700 rounded-2xl border border-fg/[0.07] overflow-hidden">
                      <RunCard run={run} onAdvance={advanceStatus} updating={updating} navigate={navigate} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty */}
            {!loading && runs.length === 0 && (
              <div className="bg-navy-700 rounded-2xl border border-fg/[0.07] p-8 text-center space-y-2">
                <CheckCircle2 size={32} className="text-green-400 mx-auto" />
                <p className="text-fg font-semibold">All caught up!</p>
                <p className="text-fg/40 text-sm">No active or upcoming runs assigned to you.</p>
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <section>
            {historyLoading && (
              <p className="text-fg/40 text-sm text-center py-8">Loading history…</p>
            )}
            {!historyLoading && history.length === 0 && (
              <div className="bg-navy-700 rounded-2xl border border-fg/[0.07] p-8 text-center space-y-2">
                <Clock size={32} className="text-fg/20 mx-auto" />
                <p className="text-fg font-semibold">No run history yet</p>
                <p className="text-fg/40 text-sm">Delivered and cancelled runs from the last {HISTORY_WINDOW_DAYS} days show up here.</p>
              </div>
            )}
            {!historyLoading && history.length > 0 && (
              <div className="space-y-2">
                {history.map(run => (
                  <div key={run.id} className="bg-navy-700 rounded-2xl border border-fg/[0.07] overflow-hidden">
                    <RunCard run={run} onAdvance={advanceStatus} updating={updating} navigate={navigate} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

// Opens the device's native maps app (or Google Maps in a new tab on
// desktop) for turn-by-turn directions to an address. Prefers lat/lng when
// the run has them since that's exact; falls back to the free-text address
// otherwise. No native app dependency — this is a plain https:// link so it
// works the same in the installed PWA.
function mapsUrl(lat, lng, address) {
  if (lat != null && lng != null) return `https://maps.google.com/?daddr=${lat},${lng}`
  return `https://maps.google.com/?daddr=${encodeURIComponent(address)}`
}

function NavigateButton({ lat, lng, address }) {
  return (
    <a
      href={mapsUrl(lat, lng, address)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="shrink-0 w-7 h-7 rounded-lg bg-brand-600/20 border border-brand-600/25 flex items-center justify-center text-brand-300 active:bg-brand-600/30 transition-colors"
      aria-label={`Navigate to ${address}`}
    >
      <Navigation size={13} />
    </a>
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
            <p className="text-xs text-fg/40 flex items-center gap-1">
              <Clock size={10} />
              {safeFormatDate(run.scheduled_at, 'h:mm a')}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(`/runs/${run.id}`)}
          className="shrink-0 text-fg/30 hover:text-fg/60 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2.5">
          <div className="w-4 h-4 rounded-full bg-brand-600/30 border border-brand-600/50 shrink-0 mt-0.5 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
          </div>
          <p className="text-sm text-fg/80 leading-tight line-clamp-1 flex-1">{run.pickup_address}</p>
          <NavigateButton lat={run.pickup_lat} lng={run.pickup_lng} address={run.pickup_address} />
        </div>
        <div className="ml-2 w-px h-3 bg-fg/10" />
        <div className="flex items-start gap-2.5">
          <MapPin size={16} className="text-green-400 shrink-0 mt-0.5" />
          <p className="text-sm text-fg/80 leading-tight line-clamp-1 flex-1">{run.dropoff_address}</p>
          <NavigateButton lat={run.dropoff_lat} lng={run.dropoff_lng} address={run.dropoff_address} />
        </div>
      </div>

      {run.cargo_description && (
        <div className="flex items-center gap-2 text-xs text-fg/40">
          <Package size={12} />
          <span className="line-clamp-1">{run.cargo_description}</span>
        </div>
      )}

      {run.vehicles && (
        <p className="text-xs text-fg/30">
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
