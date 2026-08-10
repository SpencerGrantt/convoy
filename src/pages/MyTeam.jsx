import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Building2, Crown, Headset, Truck, Phone } from 'lucide-react'

const ROLE_META = {
  owner:      { label: 'Owner',      icon: Crown,   color: 'text-brand-300 bg-brand-600/20 border-brand-600/30' },
  dispatcher: { label: 'Dispatcher', icon: Headset, color: 'text-blue-300 bg-blue-500/15 border-blue-500/25' },
  driver:     { label: 'Driver',     icon: Truck,   color: 'text-green-300 bg-green-500/15 border-green-500/25' },
}

// Read-only roster for drivers — company name + everyone on their team.
// RLS's read_company_profiles policy already scopes profiles to the
// caller's own company_id with no role restriction, so a driver reading
// teammates (owner/dispatcher/other drivers) is already permitted; this is
// purely a view, no edit affordances, matching the "driver should see but
// not edit" requirement.
export default function MyTeam() {
  const { profile } = useAuth()
  const company = profile?.companies
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.company_id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, phone')
        .eq('company_id', profile.company_id)
        .order('role')
        .order('full_name')
      if (!cancelled) {
        setMembers(data ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [profile?.company_id])

  if (loading) return <div className="pb-24"><TopBar title="My Team" /><LoadingSpinner /></div>

  const order = { owner: 0, dispatcher: 1, driver: 2 }
  const sorted = [...members].sort((a, b) => (order[a.role] ?? 3) - (order[b.role] ?? 3))

  return (
    <div className="pb-24 md:pb-8">
      <TopBar title="My Team" />
      <div className="px-4 pt-4 space-y-4 md:px-8 md:pt-6">

        {company?.name && (
          <div className="bg-brand-600 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/40 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-white" />
              </div>
              <div>
                <p className="text-brand-200 text-xs font-medium">Your Company</p>
                <p className="text-white text-lg font-bold">{company.name}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {sorted.map(member => {
            const meta = ROLE_META[member.role] ?? ROLE_META.driver
            const Icon = meta.icon
            const isSelf = member.id === profile?.id
            return (
              <div key={member.id} className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white text-sm flex items-center gap-1.5">
                    <span className="truncate">{member.full_name || 'Unnamed'}</span>
                    {isSelf && <span className="text-[10px] text-white/30 font-normal shrink-0">(You)</span>}
                  </p>
                  {member.phone && (
                    <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                      <Phone size={10} />
                      {member.phone}
                    </p>
                  )}
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border shrink-0 ${meta.color}`}>
                  {meta.label}
                </span>
              </div>
            )
          })}
        </div>

        {members.length === 0 && (
          <div className="bg-navy-700 rounded-2xl border border-white/[0.07] p-8 text-center space-y-2">
            <Building2 size={32} className="text-white/20 mx-auto" />
            <p className="text-white font-semibold">No team data yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
