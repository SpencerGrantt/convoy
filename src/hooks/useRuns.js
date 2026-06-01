import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRuns(filters = {}) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchRuns() {
    let query = supabase
      .from('runs')
      .select('*, profiles!driver_id(full_name, avatar_url), vehicles(name, plate), contracts(name)')
      .order('created_at', { ascending: false })

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    if (error) setError(error)
    else setRuns(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchRuns()

    const channel = supabase
      .channel('runs-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'runs' }, fetchRuns)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [filters.status])

  return { runs, loading, error, refresh: fetchRuns }
}
