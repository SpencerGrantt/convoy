import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        setSession(session)
        if (session) {
          await fetchOrCreateProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    // Safety net: if onAuthStateChange never fires (e.g. no session),
    // stop loading after 8 seconds so the UI doesn't spin forever.
    const fallback = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 8000)

    return () => {
      mounted = false
      clearTimeout(fallback)
      subscription.unsubscribe()
    }
  }, [])

  async function fetchOrCreateProfile(userId) {
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .eq('id', userId)
        .single()

      if (existing) {
        setProfile(existing)
        return
      }

      // New user — check for invite metadata
      const { data: authData } = await supabase.auth.getUser()
      const meta = authData?.user?.user_metadata ?? {}
      let companyId = meta.company_id
      const role = meta.role ?? 'owner'

      if (!companyId) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert({ name: 'My Company', sdvosb: true })
          .select()
          .single()
        if (companyError) throw companyError
        companyId = company.id
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { id: userId, company_id: companyId, full_name: '', role },
          { onConflict: 'id', ignoreDuplicates: true }
        )
      if (profileError) throw profileError

      const { data: fresh } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .eq('id', userId)
        .single()

      setProfile(fresh ?? null)
    } catch (err) {
      console.error('fetchOrCreateProfile failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function refreshProfile() {
    const { data: { session: current } } = await supabase.auth.getSession()
    if (current?.user?.id) await fetchOrCreateProfile(current.user.id)
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore — clear state regardless
    } finally {
      setSession(null)
      setProfile(null)
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
