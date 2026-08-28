import { safeFormatDate } from '../../lib/dates'

export default function CustodyLog({ events = [] }) {
  if (!events.length) return null

  return (
    <div className="bg-navy-700 rounded-2xl border border-fg/[0.07] p-4">
      <p className="text-xs font-semibold text-fg/40 uppercase tracking-wide mb-3">Chain of Custody</p>
      <div className="space-y-3">
        {events.map((e, i) => (
          <div key={e.id} className="flex gap-3 items-start">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-brand-400 shrink-0 mt-1" />
              {i < events.length - 1 && <div className="w-px flex-1 bg-fg/[0.08] mt-1" style={{ minHeight: 16 }} />}
            </div>
            <div className="flex-1 pb-1">
              <p className="text-sm font-medium text-fg/80 capitalize">
                {e.event_type.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-fg/40">
                {safeFormatDate(e.created_at, 'MMM d, h:mm a')}
                {e.profiles?.full_name ? ` · ${e.profiles.full_name}` : ''}
              </p>
              {e.note && <p className="text-xs text-fg/50 mt-0.5">{e.note}</p>}
              {e.lat && (
                <p className="text-xs text-fg/30 mt-0.5">
                  📍 {e.lat.toFixed(5)}, {e.lng.toFixed(5)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
