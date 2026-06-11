import { NavLink } from 'react-router-dom'
import { Home, Truck, FileText, DollarSign } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const allTabs = [
  { to: '/',          icon: Home,       label: 'Home',      roles: ['owner', 'dispatcher', 'driver'] },
  { to: '/runs',      icon: Truck,      label: 'Runs',      roles: ['owner', 'dispatcher', 'driver'] },
  { to: '/contracts', icon: FileText,   label: 'Contracts', roles: ['owner', 'dispatcher'] },
  { to: '/finances',  icon: DollarSign, label: 'Finances',  roles: ['owner'] },
]

export default function MobileNav() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'owner'
  const tabs = allTabs.filter(t => t.roles.includes(role))

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-navy-900 border-t border-white/[0.08] safe-bottom z-20">
      <div className="flex items-center justify-around px-1 py-1">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-0 transition-colors ${
                isActive ? 'text-white' : 'text-white/40'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-xs font-medium leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
