import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Truck, FileText, DollarSign, Settings, Plus, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useDrivers } from '../../hooks/useDrivers'
import { supabase } from '../../lib/supabase'

const roleLabel = { owner: 'Head Admin', dispatcher: 'Dispatcher', driver: 'Driver' }

const allNavItems = [
  { to: '/',          icon: Home,       label: 'Dashboard', roles: ['owner', 'dispatcher', 'driver'] },
  { to: '/runs',      icon: Truck,      label: 'Runs',      roles: ['owner', 'dispatcher', 'driver'] },
  { to: '/contracts', icon: FileText,   label: 'Contracts', roles: ['owner', 'dispatcher'] },
  { to: '/finances',  icon: DollarSign, label: 'Finances',  roles: ['owner'] },
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

function DriverItem({ driver, onClick }) {
  const name = driver.full_name || 'Unnamed'
  const initials = name !== 'Unnamed'
    ? name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
    >
      {driver.avatar_url ? (
        <img src={driver.avatar_url} alt={name} className="h-6 w-6 rounded-full object-cover shrink-0" />
      ) : (
        <div className="h-6 w-6 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-300 text-[10px] font-bold shrink-0">
          {initials}
        </div>
      )}
      <span className="text-sm text-white/70 truncate text-left">{name}</span>
    </button>
  )
}

export default function Sidebar() {
  const { profile } = useAuth()
  const { drivers } = useDrivers()
  const navigate = useNavigate()
  const role = profile?.role ?? 'owner'
  const items = allNavItems.filter(item => item.roles.includes(role))
  const showDrivers = role === 'owner' || role === 'dispatcher'

  const [addingDriver, setAddingDriver] = useState(false)
  const [driverEmail, setDriverEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  async function inviteDriver() {
    if (!driverEmail) return
    setInviting(true)
    setInviteMsg('')
    const { error } = await supabase.auth.signInWithOtp({
      email: driverEmail,
      options: {
        emailRedirectTo: window.location.origin,
        data: { company_id: profile?.company_id, role: 'driver' },
      },
    })
    if (error) {
      setInviteMsg(`Error: ${error.message}`)
    } else {
      setInviteMsg('Invite sent!')
      setDriverEmail('')
      setTimeout(() => { setInviteMsg(''); setAddingDriver(false) }, 2000)
    }
    setInviting(false)
  }

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-60 bg-navy-900 border-r border-white/[0.08] z-50">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.08] shrink-0">
        <span className="text-white font-black text-xl tracking-tight">CONVOY</span>
      </div>

      {/* Scrollable middle: nav + drivers */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items.map(({ to, icon, label }) => (
          <NavItem key={to} to={to} icon={icon} label={label} end={to === '/'} />
        ))}

        {showDrivers && (
          <div className="pt-4 mt-4 border-t border-white/[0.08]">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Drivers</span>
              <button
                onClick={() => { setAddingDriver(v => !v); setInviteMsg('') }}
                className="text-white/30 hover:text-white transition-colors"
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
                  className="w-full bg-navy-800 border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-white/25"
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
              {drivers.length === 0 && !addingDriver && (
                <p className="text-[10px] text-white/20 px-2 py-1">No drivers yet</p>
              )}
              {drivers.map(d => (
                <DriverItem key={d.id} driver={d} onClick={() => navigate('/drivers')} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: settings + user profile */}
      <div className="shrink-0 border-t border-white/[0.08] px-3 py-3 space-y-0.5">
        <NavItem to="/settings" icon={Settings} label="Settings" />
        {profile && (
          <div className="flex items-center gap-3 px-2 py-2 mt-1">
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
