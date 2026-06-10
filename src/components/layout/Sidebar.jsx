import { NavLink } from 'react-router-dom'
import { Home, Truck, FileText, DollarSign, Users, Bot, Settings } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const roleLabel = { owner: 'Head Admin', dispatcher: 'Dispatcher', driver: 'Driver' }

const allNavItems = [
  { to: '/',          icon: Home,       label: 'Dashboard', roles: ['owner', 'dispatcher', 'driver'] },
  { to: '/runs',      icon: Truck,      label: 'Runs',      roles: ['owner', 'dispatcher', 'driver'] },
  { to: '/contracts', icon: FileText,   label: 'Contracts', roles: ['owner', 'dispatcher'] },
  { to: '/finances',  icon: DollarSign, label: 'Finances',  roles: ['owner'] },
  { to: '/drivers',   icon: Users,      label: 'Drivers',   roles: ['owner', 'dispatcher'] },
  { to: '/ai',        icon: Bot,        label: 'AI',        roles: ['owner', 'dispatcher'] },
]

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-white/[0.08] text-white'
            : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const { profile } = useAuth()
  const role = profile?.role ?? 'owner'
  const items = allNavItems.filter(item => item.roles.includes(role))

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-60 bg-navy-900 border-r border-white/[0.08] z-30">
      <div className="px-5 py-5 border-b border-white/[0.08]">
        <span className="text-white font-black text-xl tracking-tight">CONVOY</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(({ to, icon, label }) => (
          <NavItem key={to} to={to} icon={icon} label={label} end={to === '/'} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/[0.08] space-y-0.5">
        <NavItem to="/settings" icon={Settings} label="Settings" />

        {profile && (
          <div className="flex items-center gap-3 px-3 py-3 mt-1">
            <div className="h-7 w-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{profile.full_name || 'Account'}</p>
              <p className="text-white/40 text-[10px] leading-tight">{roleLabel[profile.role] ?? profile.role}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
