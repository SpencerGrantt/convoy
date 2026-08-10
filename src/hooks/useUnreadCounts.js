import { useState, useEffect, useCallback, useId } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// For management's driver list: counts unread messages *from* each driver
// (sender_id === driver_id) — i.e. what still needs a response. Messages
// management sent themselves that a driver hasn't read yet don't count
// here on purpose.
export function useUnreadCounts() {
  const [counts, setCounts] = useState({})
  // supabase.channel(name) returns the SAME channel object if a channel with
  // that name already exists rather than creating a new one — so two
  // mounted instances of this hook sharing one hardcoded name would both
  // grab the same channel, and calling .on() on it a second time after the
  // first instance already called .subscribe() throws synchronously
  // ("cannot add postgres_changes callbacks... after subscribe()"). That
  // crash previously escaped every error boundary and blanked the whole
  // app, because it happened inside Sidebar/MobileNav which render outside
  // App.jsx's ErrorBoundary. useId() guarantees a distinct topic per
  // mounted instance so this can never collide, no matter how many places
  // end up using this hook.
  const instanceId = useId()

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
      .channel(`messages-unread-counts-${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchCounts)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchCounts, instanceId])

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
  // See the comment in useUnreadCounts above — this hook is mounted from
  // BOTH Sidebar.jsx and MobileNav.jsx simultaneously (both are always in
  // the DOM at once, CSS just hides whichever doesn't match the viewport),
  // so a shared hardcoded channel name here was a guaranteed crash.
  const instanceId = useId()

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
      .channel(`unread-message-count-${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchCount)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchCount, instanceId])

  return count
}

// Actual message previews for the TopBar notification dropdown — same
// "needs a response" scoping as the two hooks above (driver: unread in
// their own channel not sent by them; management: unread sent BY a driver,
// across every channel), just returning the message content instead of a
// bare count.
export function useRecentNotifications(limit = 8) {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const instanceId = useId()

  const fetchItems = useCallback(async () => {
    if (!profile?.id) return
    if (profile.role === 'driver') {
      const { data } = await supabase
        .from('messages')
        .select('id, body, created_at, driver_id, sender:profiles!sender_id(full_name)')
        .eq('driver_id', profile.id)
        .is('read_at', null)
        .neq('sender_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      setItems((data ?? []).map(m => ({ ...m, label: m.sender?.full_name || 'Management' })))
    } else {
      // No column-to-column filter in PostgREST for "sender_id = driver_id",
      // so pull recent unread and filter client-side — same approach
      // useUnreadCounts already uses for the same comparison.
      const { data } = await supabase
        .from('messages')
        .select('id, body, created_at, driver_id, sender_id, sender:profiles!sender_id(full_name)')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(50)
      const filtered = (data ?? [])
        .filter(m => m.sender_id === m.driver_id)
        .slice(0, limit)
        .map(m => ({ ...m, label: m.sender?.full_name || 'Crew member' }))
      setItems(filtered)
    }
  }, [profile?.id, profile?.role, limit])

  useEffect(() => {
    fetchItems()

    const channel = supabase
      .channel(`recent-notifications-${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchItems)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchItems, instanceId])

  return items
}
