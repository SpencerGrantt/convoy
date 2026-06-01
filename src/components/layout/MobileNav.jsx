import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const allTabs = [
  { to: '/',          icon: '🏠', label: 'Home',      roles: ['owner','dispatcher','driver'] },
  { to: '/runs',      icon: '🚗', label: 'Runs',      roles: ['owner','dispatcher','driver'] },
  { to: '/photos',    icon: '📸', label: 'Photos',    roles: ['owner','dispatcher','driver'] },
  { to: '/contracts', icon: '📋', label: 'Contracts', roles: ['owner','dispatcher'] },
  { to: '/finances',  icon: '💰', label: 'Finances',  roles: ['owner'] },
  { to: '/drivers',   icon: '👤', label: 'Drivers',   roles: ['owner','dispatcher'] },
  { to: '/ai',        icon: '🤖', label: 'AI',        roles: ['owner','dispatcher'] },
]

export default function MobileNav() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'owner'
  const tabs = allTabs.filter(t => t.roles.includes(role))

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-20">
      <div className="flex items-center justify-around px-1 py-1">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-0 transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`
            }
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] font-medium leading-none">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
