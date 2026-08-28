import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUnreadMessageCount, useRecentNotifications } from '../../hooks/useUnreadCounts'
import { roleLabel } from '../../lib/roles'
import { safeFormatDate } from '../../lib/dates'
import { Building2, Bell } from 'lucide-react'

function NotificationDropdown({ navigate }) {
  const [open, setOpen] = useState(false)
  const unread = useUnreadMessageCount()
  const items = useRecentNotifications()
  const rootRef = useRef(null)

  // Close on an outside click or Escape — a dropdown that only closes via
  // its own toggle button feels stuck on mobile where there's no obvious
  // "away" click target otherwise.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function openThread(driverId) {
    setOpen(false)
    navigate('/messages', { state: { openDriverId: driverId } })
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-8 h-8 rounded-full bg-fg/[0.06] hover:bg-fg/[0.1] flex items-center justify-center transition-colors"
        aria-label={unread > 0 ? `${unread} unread messages` : 'Notifications'}
      >
        <Bell size={15} className="text-fg/60" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        // Mobile: fixed + viewport-relative insets, since the bell sits well
        // right of center (ProfileButton is further right still) — a w-80
        // panel anchored via `absolute right-0` to the bell's own small
        // wrapper extends left from THAT point, not from the screen edge,
        // and on a narrow phone that pushed its left edge off-screen.
        // Desktop: back to the original bell-anchored absolute panel, which
        // has room to spare there.
        <div className="fixed left-4 right-4 top-16 md:absolute md:left-auto md:right-0 md:top-auto md:mt-2 md:w-80 md:max-w-[calc(100vw-2rem)] bg-navy-700 border border-fg/[0.1] rounded-2xl shadow-xl z-30 overflow-hidden">
          <div className="px-4 py-3 border-b border-fg/[0.08]">
            <p className="text-xs font-semibold text-fg/40 uppercase tracking-wide">Recent Activity</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="text-sm text-fg/40 text-center py-8 px-4">You're all caught up.</p>
            )}
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => openThread(item.driver_id)}
                className="w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-fg/[0.04] transition-colors border-b border-fg/[0.05] last:border-b-0"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-fg truncate">{item.label}</p>
                  <p className="text-xs text-fg/50 truncate mt-0.5">{item.body}</p>
                  <p className="text-[10px] text-fg/30 mt-0.5">{safeFormatDate(item.created_at, 'MMM d, h:mm a')}</p>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setOpen(false); navigate('/messages') }}
            className="w-full text-center text-xs font-semibold text-brand-300 py-2.5 border-t border-fg/[0.08] hover:bg-fg/[0.04] transition-colors"
          >
            View all messages
          </button>
        </div>
      )}
    </div>
  )
}

function ProfileButton({ profile, navigate }) {
  const initial = profile?.full_name?.trim()?.charAt(0)?.toUpperCase() || '?'
  const name = profile?.full_name?.trim() || 'Account'
  const role = roleLabel(profile?.role) || 'Member'

  return (
    <button
      onClick={() => navigate('/settings')}
      className="flex items-center gap-2.5 shrink-0 min-w-0 active:opacity-70 transition-opacity"
    >
      <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {initial}
      </div>
      <div className="text-left min-w-0">
        <p className="text-fg text-sm font-semibold leading-tight truncate max-w-32">
          {name}
        </p>
        <p className="text-brand-300 text-[11px] font-medium leading-tight truncate">
          {role}
        </p>
      </div>
    </button>
  )
}

export default function TopBar({ title }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const company = profile?.companies

  return (
    <header className="bg-navy-900 border-b border-fg/[0.08] px-4 pt-5 pb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sticky top-0 z-10 safe-top">

      {/* Left — brand identity only; the page title now lives in the
          center column instead of being tucked under/after it here */}
      <div className="flex items-center gap-2 min-w-0 justify-self-start">
        <span className="md:hidden text-fg font-black text-lg tracking-tight shrink-0">VANTAR</span>

        {company ? (
          <div className="hidden md:flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-600/20 border border-brand-600/25 flex items-center justify-center shrink-0">
              <Building2 size={13} className="text-brand-300" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-fg font-bold text-sm leading-tight truncate max-w-52">
                {company.name}
              </p>
              {company.sdvosb && (
                <span className="shrink-0 text-[9px] font-bold text-brand-300 bg-brand-600/15 border border-brand-600/25 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                  SDVOSB
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Center — current page name */}
      <div className="justify-self-center min-w-0">
        {/* Mobile hides this — the current page is already highlighted in
            MobileNav below, and there isn't room for it alongside the
            wordmark, bell, and profile without everything feeling cramped.
            Desktop keeps it; Sidebar's own highlight isn't as visible from
            the content area as MobileNav's is on a phone screen. */}
        {title && (
          <span className="hidden md:block text-fg font-semibold text-sm truncate max-w-xs">
            {title}
          </span>
        )}
      </div>

      {/* Right — notification dropdown, then avatar + name + role together */}
      <div className="flex items-center gap-2.5 shrink-0 justify-self-end">
        <NotificationDropdown navigate={navigate} />
        <ProfileButton profile={profile} navigate={navigate} />
      </div>
    </header>
  )
}
