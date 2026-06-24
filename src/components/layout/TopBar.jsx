import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Building2 } from 'lucide-react'

const roleLabel = { owner: 'Head Admin', dispatcher: 'Dispatcher', driver: 'Driver' }

export default function TopBar({ title }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const company = profile?.companies

  return (
    <header className="bg-navy-900 border-b border-white/[0.08] px-4 py-3 flex items-center justify-between sticky top-0 z-10 safe-top">

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

      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-2.5 shrink-0 active:opacity-70 transition-opacity"
      >
        <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {profile?.full_name?.charAt(0)?.toUpperCase() ?? '⚙'}
        </div>
        {profile && (
          <div className="text-left">
            <p className="text-white text-sm font-semibold leading-tight">
              {profile.full_name || 'Account'}
            </p>
            <p className="text-brand-300 text-[11px] font-medium leading-tight">
              {roleLabel[profile.role] ?? profile.role}
            </p>
          </div>
        )}
      </button>
    </header>
  )
}
