import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDrivers() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*, compliance_docs(*)')
      .eq('role', 'driver')
    setDrivers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { drivers, loading, refresh: fetch }
}
