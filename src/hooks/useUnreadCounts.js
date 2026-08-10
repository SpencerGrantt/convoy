import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// For management's driver list: counts unread messages *from* each driver
// (sender_id === driver_id) — i.e. what still needs a response. Messages
// management sent themselves that a driver hasn't read yet don't count
// here on purpose.
export function useUnreadCounts() {
  const [counts, setCounts] = useState({})

  const fetchCounts = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('driver_id, sender_id')
      .is('read_at', null)
    const next = {}
    for (const m of data ?? []) {
      if (m.sender_id === m.driver_id) {
        next[m.driver_id] = (next[m.driver_id] ?? 0) + 1
      }
    }
    setCounts(next)
  }, [])

  useEffect(() => {
    fetchCounts()

    const channel = supabase
      .channel('messages-unread-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchCounts)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchCounts])

  return counts
}
