import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const roleLabel = { owner: 'Head Admin', dispatcher: 'Dispatcher', driver: 'Driver' }

export default function TopBar({ title }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  return (
    <header className="bg-brand-900 px-4 py-3 flex items-center justify-between sticky top-0 z-10 safe-top">
      <div className="flex items-center gap-2">
        <span className="text-brand-50 font-black text-lg tracking-tight">CONVOY</span>
        {title && <span className="text-brand-500 text-lg">/</span>}
        {title && <span className="text-brand-200 font-medium text-sm">{title}</span>}
      </div>
      {profile && (
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 active:opacity-70 transition-opacity"
        >
          <div className="text-right">
            <p className="text-brand-50 text-xs font-semibold leading-tight">
              {profile.full_name || 'Account'}
            </p>
            <p className="text-brand-400 text-[10px] leading-tight">
              {roleLabel[profile.role] ?? profile.role}
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-brand-700 flex items-center justify-center text-brand-50 text-xs font-bold flex-shrink-0">
            {profile.full_name?.charAt(0)?.toUpperCase() ?? '⚙'}
          </div>
        </button>
      )}
    </header>
  )
}
