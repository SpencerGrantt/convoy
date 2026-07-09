import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useContracts() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('contracts')
      .select('*')
      .order('end_date', { ascending: true })
    setContracts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { contracts, loading, refresh: fetch }
}
