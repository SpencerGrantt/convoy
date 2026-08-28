import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, Truck, FileText, DollarSign, MessageCircle, Settings, Plus, X, MapPinned, Wrench, Send,
  ClipboardCheck, ShieldCheck, Users, Wallet, Route, ChevronDown,
} from 'lucide-react'
import Logo from '../ui/Logo'
import { useAuth } from '../../hooks/useAuth'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { useUnreadMessageCount } from '../../hooks/useUnreadCounts'
import { invokeFn } from '../../lib/supabase'
import { roleLabel } from '../../lib/roles'
import { BILLING_ENABLED } from '../../lib/billing'

const allNavItems = [
  { to: '/',            icon: Home,          label: 'Dashboard',   roles: ['owner', 'dispatcher', 'driver'] },
  { to: '/runs',        icon: Truck,         label: 'Runs',        roles: ['owner', 'dispatcher', 'driver'] },
  { to: '/messages',    icon: MessageCircle, label: 'Messages',    roles: ['owner', 'dispatcher', 'driver'] },
  { to: '/contracts',   icon: FileText,      label: 'Contracts',   roles: ['owner', 'dispatcher'], plan: 'government' },
  { to: '/fleet',       icon: Wrench,        label: 'Fleet',       roles: ['owner', 'dispatcher'] },
  { to: '/finances',    icon: DollarSign,    label: 'Finances',    roles: ['owner'] },
  { to: '/ifta-report', icon: MapPinned,     label: 'IFTA Report', roles: ['owner'] },
]

// The driver-only pages (DriverDashboard's tile links) have always been
// open routes — no `roles` restriction in App.jsx — but were only ever
// reachable through DriverDashboard itself (or, for a driver, the mobile
// bottom nav), so there was no desktop-sidebar path to them short of typing
// the URL. Shown to owner for the common small-fleet case where the owner
// also drives sometimes (owner already has full dispatcher parity —
// Contracts/Fleet/Drivers are owner+dispatcher routes — this closes the
// other half), and to driver so the desktop sidebar has the same reach as
// their dashboard tiles/mobile nav.
const driverTools = [
  { to: '/inspections/new', icon: ClipboardCheck, label: 'Vehicle Inspection' },
  { to: '/my-compliance',   icon: ShieldCheck,     label: 'My Documents' },
  { to: '/my-team',         icon: Users,           label: 'My Team' },
  { to: '/my-earnings',     icon: Wallet,          label: 'My Earnings' },
  { to: '/mileage',         icon: Route,           label: 'Mileage Log' },
]

function NavItem({ to, icon: Icon, label, end, showDot }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-gradient-to-r from-fg/[0.09] to-fg/[0.04] text-fg shadow-sm shadow-black/5'
            : 'text-fg/50 hover:text-fg hover:bg-fg/[0.05] hover:translate-x-0.5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-brand-500" />}
          <Icon size={18} />
          <span className="flex-1">{label}</span>
          {showDot && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
        </>
      )}
    </NavLink>
  )
}

function DriverItem({ driver, onClick, onMessage }) {
  const name = driver.full_name || 'Unnamed'
  const initials = name !== 'Unnamed'
    ? name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-fg/[0.05] transition-colors group">
      <button onClick={onClick} className="flex items-center gap-2 flex-1 min-w-0 text-left">
        {driver.avatar_url ? (
          <img src={driver.avatar_url} alt={name} className="h-6 w-6 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-6 w-6 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-300 text-[10px] font-bold shrink-0">
            {initials}
          </div>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-fg/70 truncate">{name}</span>
          <span className="block text-[10px] text-fg/30 truncate">{roleLabel(driver.role)}</span>
        </span>
      </button>
      {/* Messaging is one channel per non-owner company member
          (011_messages.sql — the `driver_id` column names whose channel it
          is, not a role restriction; useDrivers() already pulls in
          dispatchers too, confirmed live via Messages.jsx). There's no
          channel for the owner themself, so only non-owner rows get this. */}
      {onMessage && (
        <button
          onClick={onMessage}
          title={`Message ${name}`}
          className="shrink-0 text-fg/20 hover:text-brand-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
        >
          <Send size={13} />
        </button>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { profile } = useAuth()
  const { members } = useTeamMembers()
  // Everyone but yourself — this is a "your teammates" list, not a roster
  // of the whole company including the viewer (MyTeam.jsx's fuller page
  // already covers that with a "(You)" tag).
  const teammates = members.filter(m => m.id !== profile?.id)
  const unreadMessages = useUnreadMessageCount()
  const navigate = useNavigate()
  const role = profile?.role ?? 'owner'
  const companyPlan = profile?.companies?.plan ?? 'standard'
  const items = allNavItems.filter(item => item.roles.includes(role) && (!BILLING_ENABLED || !item.plan || item.plan === companyPlan))
  const showDrivers = role === 'owner' || role === 'dispatcher'
  const showDriverTools = role === 'owner' || role === 'driver'

  const [driverToolsOpen, setDriverToolsOpen] = useState(true)
  const [addingDriver, setAddingDriver] = useState(false)
  const [driverEmail, setDriverEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  async function inviteDriver() {
    if (!driverEmail) return
    setInviting(true)
    setInviteMsg('')
    const { data, error } = await invokeFn('manage-team', {
      body: { action: 'invite', email: driverEmail, role: 'driver' },
    })
    if (error) {
      setInviteMsg(`Error: ${error.message}`)
    } else if (data?.error) {
      setInviteMsg(`Error: ${data.error}`)
    } else {
      setInviteMsg('Invite sent!')
      setDriverEmail('')
      setTimeout(() => { setInviteMsg(''); setAddingDriver(false) }, 2000)
    }
    setInviting(false)
  }

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-60 bg-navy-900 border-r border-fg/[0.08] shadow-lg shadow-black/[0.03] z-50">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-fg/[0.08] shrink-0">
        <Logo size="md" />
      </div>

      {/* Scrollable middle: nav + drivers */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items.map(({ to, icon, label }) => (
          <NavItem key={to} to={to} icon={icon} label={label} end={to === '/'} showDot={to === '/messages' && unreadMessages > 0} />
        ))}

        {showDriverTools && (
          <div className="pt-4 mt-4 border-t border-fg/[0.08] space-y-0.5">
            <button
              onClick={() => setDriverToolsOpen(v => !v)}
              className="w-full flex items-center justify-between px-3 pb-1 text-[10px] font-semibold text-fg/30 uppercase tracking-widest hover:text-fg/50 transition-colors"
            >
              <span>My Driver Tools</span>
              <ChevronDown size={12} className={`transition-transform ${driverToolsOpen ? '' : '-rotate-90'}`} />
            </button>
            {driverToolsOpen && driverTools.map(({ to, icon, label }) => (
              <NavItem key={to} to={to} icon={icon} label={label} />
            ))}
          </div>
        )}

        {showDrivers && (
          <div className="pt-4 mt-4 border-t border-fg/[0.08]">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-semibold text-fg/40 uppercase tracking-widest">Team</span>
              <button
                onClick={() => { setAddingDriver(v => !v); setInviteMsg('') }}
                className="text-fg/30 hover:text-fg transition-colors"
              >
                {addingDriver ? <X size={13} /> : <Plus size={13} />}
              </button>
            </div>

            {addingDriver && (
              <div className="mb-2 space-y-1.5 px-1">
                <input
                  value={driverEmail}
                  onChange={e => setDriverEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && inviteDriver()}
                  placeholder="driver@example.com"
                  className="w-full bg-navy-800 border border-fg/10 text-fg rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-fg/25"
                />
                {inviteMsg && (
                  <p className={`text-[10px] px-1 ${inviteMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                    {inviteMsg}
                  </p>
                )}
                <button
                  onClick={inviteDriver}
                  disabled={inviting || !driverEmail}
                  className="w-full bg-brand-600/80 text-white text-xs font-semibold py-1.5 rounded-lg disabled:opacity-50"
                >
                  {inviting ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            )}

            <div className="space-y-0.5 max-h-36 overflow-y-auto">
              {teammates.length === 0 && !addingDriver && (
                <p className="text-[10px] text-fg/20 px-2 py-1">No teammates yet</p>
              )}
              {teammates.map(d => (
                <DriverItem
                  key={d.id}
                  driver={d}
                  onClick={() => navigate('/drivers')}
                  onMessage={d.role !== 'owner' ? () => navigate('/messages', { state: { openDriverId: d.id } }) : null}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: settings + user profile */}
      <div className="shrink-0 border-t border-fg/[0.08] px-3 py-3 space-y-0.5">
        <NavItem to="/settings" icon={Settings} label="Settings" />
        {profile && (
          <div className="flex items-center gap-3 px-2 py-2 mt-1">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm shadow-brand-900/30 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-fg text-xs font-semibold truncate">{profile.full_name || 'Account'}</p>
              <p className="text-fg/40 text-[10px] leading-tight">{roleLabel(profile.role)}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
