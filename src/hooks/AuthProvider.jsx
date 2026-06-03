import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Hard timeout: loading can never stay true beyond 5 seconds
    const fallback = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

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
        clearTimeout(fallback)
      }
    )

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

      // Check for invite metadata (company_id + role set during invite)
      const { data: { user } } = await supabase.auth.getUser()
      const meta = user?.user_metadata ?? {}
      let companyId = meta.company_id
      const role = meta.role ?? 'owner'

      if (!companyId) {
        // New owner — create a fresh company
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
        .upsert({ id: userId, company_id: companyId, full_name: '', role },
          { onConflict: 'id', ignoreDuplicates: true })

      if (profileError) throw profileError

      const { data: fresh } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .eq('id', userId)
        .single()

      setProfile(fresh)
    } catch (err) {
      console.error('fetchOrCreateProfile failed:', err)
    } finally {
      setLoading(false)
    }
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
