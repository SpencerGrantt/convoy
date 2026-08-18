import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDrivers() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    // Crew compliance tracking applies to both field roles, not just
    // drivers — a dispatcher can hold a HIPAA cert/background check too.
    // Owner is deliberately excluded: this page is management tracking
    // staff, the same boundary Finances/Contracts already draw.
    const { data } = await supabase
      .from('profiles')
      .select('*, compliance_docs(*)')
      .in('role', ['driver', 'dispatcher'])
      .order('role')
      .order('full_name')
    setDrivers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { drivers, loading, refresh: fetch }
}
