import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

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

// Single number for nav/topbar badges — "does the current user have
// anything unread that needs their attention." A driver's own channel:
// unread messages not sent by them. Management: same "needs a response"
// definition as useUnreadCounts above, just summed across every driver
// instead of broken out per-driver.
export function useUnreadMessageCount() {
  const { profile } = useAuth()
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    if (!profile?.id) return
    if (profile.role === 'driver') {
      const { count: c } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('driver_id', profile.id)
        .is('read_at', null)
        .neq('sender_id', profile.id)
      setCount(c ?? 0)
    } else {
      const { data } = await supabase
        .from('messages')
        .select('driver_id, sender_id')
        .is('read_at', null)
      setCount((data ?? []).filter(m => m.sender_id === m.driver_id).length)
    }
  }, [profile?.id, profile?.role])

  useEffect(() => {
    fetchCount()

    const channel = supabase
      .channel('unread-message-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchCount)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchCount])

  return count
}
