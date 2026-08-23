import { useAuth } from '../../hooks/useAuth'
import { VIEW_ROLES } from '../../lib/devMode'

// Only ever rendered for the one dev account (see App.jsx) — lets that
// account preview Admin/Driver/Dispatch UI without signing out. Purely a
// client-side render override; RLS still enforces the account's real role.
export default function RoleSwitcher() {
  const { isDevUser, viewRole, setViewRole, realRole } = useAuth()
  if (!isDevUser) return null

  const active = viewRole ?? realRole

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 md:left-64 z-40">
      <div className="bg-navy-800 border border-amber-500/30 rounded-xl p-1.5 shadow-xl flex items-center gap-1">
        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide px-1.5 hidden md:inline">
          Dev
        </span>
        {VIEW_ROLES.map(r => (
          <button
            key={r.value}
            onClick={() => setViewRole(r.value === realRole ? null : r.value)}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              active === r.value ? 'bg-amber-500 text-navy-900' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  )
}
