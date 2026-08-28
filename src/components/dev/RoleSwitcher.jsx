import { useState } from 'react'
import { EyeOff, Eye } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { VIEW_ROLES } from '../../lib/devMode'

const HIDDEN_KEY = 'vantar_dev_panel_hidden'

// Only ever rendered for the one dev account (see App.jsx) — lets that
// account preview Admin/Driver/Dispatch UI without signing out. Purely a
// client-side render override; RLS still enforces the account's real role.
export default function RoleSwitcher() {
  const { isDevUser, viewRole, setViewRole, realRole } = useAuth()
  const [hidden, setHidden] = useState(() => sessionStorage.getItem(HIDDEN_KEY) === '1')
  if (!isDevUser) return null

  const active = viewRole ?? realRole

  function toggleHidden() {
    const next = !hidden
    setHidden(next)
    sessionStorage.setItem(HIDDEN_KEY, next ? '1' : '0')
  }

  if (hidden) {
    return (
      <button
        onClick={toggleHidden}
        title="Show dev panel"
        className="fixed bottom-20 md:bottom-6 left-4 md:left-64 z-40 w-6 h-6 rounded-full bg-navy-800 border border-amber-500/30 text-amber-400/60 hover:text-amber-400 flex items-center justify-center transition-colors"
      >
        <Eye size={11} />
      </button>
    )
  }

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
              active === r.value ? 'bg-amber-500 text-[#131313]' : 'text-fg/50 hover:text-fg/80'
            }`}
          >
            {r.label}
          </button>
        ))}
        <button
          onClick={toggleHidden}
          title="Hide dev panel"
          className="ml-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-fg/30 hover:text-fg/60 transition-colors"
        >
          <EyeOff size={12} />
        </button>
      </div>
    </div>
  )
}
