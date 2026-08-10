import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// One message channel per driver (not arbitrary 1:1 DMs) — `driverId`
// names whose channel this is. RLS allows a driver to see only their own
// channel and any owner/dispatcher to see any driver's channel, so this
// hook just fetches/subscribes to that one channel and trusts the caller
// (Messages.jsx) to pass the right driverId per role.
export function useMessages(driverId) {
  const { profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMessages = useCallback(async () => {
    if (!driverId) {
      setMessages([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(full_name, role)')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: true })
    if (error) setError(error)
    else setMessages(data ?? [])
    setLoading(false)
  }, [driverId])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchMessages()

    if (!driverId) return

    const channel = supabase
      .channel(`messages-${driverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `driver_id=eq.${driverId}` },
        fetchMessages
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [driverId, fetchMessages])

  async function sendMessage(body) {
    const trimmed = body?.trim()
    if (!trimmed || !driverId || !profile?.id) return { error: new Error('Cannot send message') }
    const { error } = await supabase.from('messages').insert({
      company_id: profile.company_id,
      driver_id: driverId,
      sender_id: profile.id,
      body: trimmed,
    })
    if (!error) fetchMessages()
    return { error }
  }

  // Mark any unread messages not sent by the current user as read — called
  // when a channel is opened.
  const markRead = useCallback(async () => {
    if (!driverId || !profile?.id) return
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('driver_id', driverId)
      .is('read_at', null)
      .neq('sender_id', profile.id)
  }, [driverId, profile])

  return { messages, loading, error, sendMessage, markRead, refresh: fetchMessages }
}
