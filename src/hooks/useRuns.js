import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useRuns(filters = {}) {
  const { profile } = useAuth()
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchRuns() {
    let query = supabase
      .from('runs')
      .select('*, profiles!driver_id(full_name, avatar_url), vehicles(name, plate), contracts(name)')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    // Drivers only see their own assigned runs
    if (profile?.role === 'driver') {
      query = query.eq('driver_id', profile.id)
    }

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
    if (!profile) return
    fetchRuns()

    const channel = supabase
      .channel(`runs-live-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'runs' }, fetchRuns)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [filters.status, profile?.id])

  return { runs, loading, error, refresh: fetchRuns }
}
