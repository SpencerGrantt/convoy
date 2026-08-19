import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const ROLE_ORDER = { owner: 0, dispatcher: 1, driver: 2 }

// Every member of the caller's company, owner included — unlike
// useDrivers() (which deliberately excludes owner for the compliance-
// tracking Drivers.jsx page), this is the general "who's on my team"
// roster used by MyTeam.jsx and Sidebar.jsx's crew list. RLS's
// read_company_profiles policy already scopes profiles to the caller's
// own company_id with no role restriction, so this is a plain read.
export function useTeamMembers() {
  const { profile } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!profile?.company_id) {
      setMembers([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, phone, avatar_url')
      .eq('company_id', profile.company_id)
      .order('role')
      .order('full_name')
    setMembers((data ?? []).sort((a, b) => (ROLE_ORDER[a.role] ?? 3) - (ROLE_ORDER[b.role] ?? 3)))
    setLoading(false)
  }, [profile?.company_id])

  useEffect(() => { fetch() }, [fetch])

  return { members, loading, refresh: fetch }
}
