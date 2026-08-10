import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUnreadMessageCount } from '../../hooks/useUnreadCounts'
import { roleLabel } from '../../lib/roles'
import { Building2, Bell } from 'lucide-react'

function NotificationBell({ navigate }) {
  const unread = useUnreadMessageCount()
  return (
    <button
      onClick={() => navigate('/messages')}
      className="relative shrink-0 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center transition-colors"
      aria-label={unread > 0 ? `${unread} unread messages` : 'Messages'}
    >
      <Bell size={15} className="text-white/60" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
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
        <p className="text-white text-sm font-semibold leading-tight truncate max-w-32">
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
    <header className="bg-navy-900 border-b border-white/[0.08] px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-10 safe-top">

      {/* Left — company info (desktop) / brand + title (mobile) */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile: CONVOY wordmark + page title */}
        <span className="md:hidden text-white font-black text-lg tracking-tight shrink-0">CONVOY</span>
        {title && <span className="md:hidden text-white/20 text-lg shrink-0">/</span>}
        {title && <span className="md:hidden text-white font-semibold text-sm truncate">{title}</span>}

        {/* Desktop: company name + SDVOSB badge + page title below */}
        {company ? (
          <div className="hidden md:flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-600/20 border border-brand-600/25 flex items-center justify-center shrink-0 mt-0.5">
              <Building2 size={13} className="text-brand-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-sm leading-tight truncate max-w-52">
                  {company.name}
                </p>
                {company.sdvosb && (
                  <span className="shrink-0 text-[9px] font-bold text-brand-300 bg-brand-600/15 border border-brand-600/25 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                    SDVOSB
                  </span>
                )}
              </div>
              {title && (
                <p className="text-white/35 text-[10px] leading-tight mt-0.5">{title}</p>
              )}
            </div>
          </div>
        ) : (
          /* Desktop fallback — no company yet */
          title && <span className="hidden md:block text-white font-semibold text-base">{title}</span>
        )}
      </div>

      {/* Right — bell for recent message activity, then avatar + name + role
          together (never just the icon) */}
      <div className="flex items-center gap-2.5 shrink-0">
        <NotificationBell navigate={navigate} />
        <ProfileButton profile={profile} navigate={navigate} />
      </div>
    </header>
  )
}
