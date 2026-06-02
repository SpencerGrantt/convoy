import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchOrCreateProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session) fetchOrCreateProfile(session.user.id)
        else { setProfile(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchOrCreateProfile(userId) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', userId)
      .single()

    if (existing) {
      setProfile(existing)
      setLoading(false)
      return
    }

    // First login — create company + profile
    const { data: company } = await supabase
      .from('companies')
      .insert({ name: 'My Company', sdvosb: true })
      .select()
      .single()

    await supabase.from('profiles').insert({
      id: userId,
      company_id: company.id,
      full_name: '',
      role: 'owner',
    })

    // Re-fetch with the join
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', userId)
      .single()

    setProfile(profile)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
