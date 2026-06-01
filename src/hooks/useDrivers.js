import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useDrivers() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*, compliance_docs(*)')
      .eq('role', 'driver')
      .then(({ data }) => {
        setDrivers(data ?? [])
        setLoading(false)
      })
  }, [])

  return { drivers, loading }
}
