import { NavLink } from 'react-router-dom'
import { Home, Truck, FileText, DollarSign, MessageCircle, MapPinned, Wrench } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useUnreadMessageCount } from '../../hooks/useUnreadCounts'

const allTabs = [
  { to: '/',            icon: Home,          label: 'Home',        roles: ['owner', 'dispatcher', 'driver'] },
  { to: '/runs',        icon: Truck,         label: 'Runs',        roles: ['owner', 'dispatcher', 'driver'] },
  { to: '/messages',    icon: MessageCircle, label: 'Messages',    roles: ['owner', 'dispatcher', 'driver'] },
  { to: '/contracts',   icon: FileText,      label: 'Contracts',   roles: ['owner', 'dispatcher'], plan: 'government' },
  { to: '/fleet',       icon: Wrench,        label: 'Fleet',       roles: ['owner', 'dispatcher'] },
  { to: '/finances',    icon: DollarSign,    label: 'Finances',    roles: ['owner'] },
  { to: '/ifta-report', icon: MapPinned,     label: 'IFTA',        roles: ['owner'] },
]

export default function MobileNav() {
  const { profile } = useAuth()
  const unreadMessages = useUnreadMessageCount()
  const role = profile?.role ?? 'owner'
  const companyPlan = profile?.companies?.plan ?? 'standard'
  const tabs = allTabs.filter(t => t.roles.includes(role) && (!t.plan || t.plan === companyPlan))

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-navy-900 border-t border-fg/[0.08] safe-bottom z-20">
      <div className="flex items-center justify-around px-1 py-1">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-0 transition-colors ${
                isActive ? 'text-fg' : 'text-fg/40'
              }`
            }
          >
            <span className="relative">
              <Icon size={20} />
              {to === '/messages' && unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-500" />
              )}
            </span>
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
