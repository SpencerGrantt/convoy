import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useContracts() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('contracts')
      .select('*')
      .order('end_date', { ascending: true })
      .then(({ data }) => {
        setContracts(data ?? [])
        setLoading(false)
      })
  }, [])

  return { contracts, loading }
}
