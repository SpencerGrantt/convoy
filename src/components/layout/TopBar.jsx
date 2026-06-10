import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const roleLabel = { owner: 'Head Admin', dispatcher: 'Dispatcher', driver: 'Driver' }

export default function TopBar({ title }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  return (
    <header className="md:hidden bg-navy-900 border-b border-white/[0.08] px-4 py-3 flex items-center justify-between sticky top-0 z-10 safe-top">
      <div className="flex items-center gap-2">
        <span className="text-white font-black text-lg tracking-tight">CONVOY</span>
        {title && <span className="text-white/20 text-lg">/</span>}
        {title && <span className="text-white/60 font-medium text-sm">{title}</span>}
      </div>
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-2 active:opacity-70 transition-opacity"
      >
        {profile && (
          <div className="text-right">
            <p className="text-white text-xs font-semibold leading-tight">
              {profile.full_name || 'Account'}
            </p>
            <p className="text-white/40 text-[10px] leading-tight">
              {roleLabel[profile.role] ?? profile.role}
            </p>
          </div>
        )}
        <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {profile?.full_name?.charAt(0)?.toUpperCase() ?? '⚙'}
        </div>
      </button>
    </header>
  )
}
