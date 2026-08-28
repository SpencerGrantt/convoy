import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'
import { isDevUser } from '../lib/devMode'

const VIEW_ROLE_KEY = 'vantar_dev_view_role'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  // Dev-only role preview (see src/lib/devMode.js) — never touches the real
  // profile row or the session's JWT, so RLS still enforces the account's
  // actual role regardless of what this is set to.
  const [viewRole, setViewRoleState] = useState(() => localStorage.getItem(VIEW_ROLE_KEY) || null)
  function setViewRole(role) {
    setViewRoleState(role)
    if (role) localStorage.setItem(VIEW_ROLE_KEY, role)
    else localStorage.removeItem(VIEW_ROLE_KEY)
  }
  const devUser = isDevUser(session)
  const effectiveProfile = (devUser && viewRole && profile) ? { ...profile, role: viewRole } : profile
  // Email 2FA step-up (see profiles.mfa_email_enabled + App.jsx's AuthGate,
  // which redirects to VerifyMfa while an enabled account hasn't verified
  // yet this session). This doesn't use Supabase's native MFA/AAL system —
  // email isn't a supported factor type there — so "verified" is tracked
  // here instead, in sessionStorage keyed by user id: persists across a
  // page reload within the same tab (so it doesn't re-prompt on every
  // navigation) but clears when the tab closes or on sign-out, so a fresh
  // sign-in always requires the step-up again.
  const [emailMfaVerified, setEmailMfaVerifiedState] = useState(false)
  function markEmailMfaVerified() {
    if (session?.user?.id) sessionStorage.setItem(`vantar_mfa_verified_${session.user.id}`, '1')
    setEmailMfaVerifiedState(true)
  }
  // supabase-js re-validates the session (and re-fires this listener with a
  // SIGNED_IN event) every time the tab regains focus, not just on an actual
  // sign-in — see GoTrueClient's visibilitychange -> _recoverAndRefresh().
  // Tracking which user we already have a loaded profile for lets us tell a
  // real sign-in apart from that refire, so tab-switching doesn't blank the
  // whole app into the loading spinner and needlessly re-fetch every time.
  const loadedUserId = useRef(null)

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        setSession(session)
        if (!session) {
          setProfile(null)
          setEmailMfaVerifiedState(false)
          loadedUserId.current = null
          setLoading(false)
          return
        }
        setEmailMfaVerifiedState(sessionStorage.getItem(`vantar_mfa_verified_${session.user.id}`) === '1')
        if (loadedUserId.current === session.user.id) return
        // A new session (e.g. just signed in) means profile is stale/null
        // until this resolves — without this, AuthGate briefly sees
        // "logged in, no profile yet" and flashes the onboarding redirect
        // before correcting itself once the real profile loads.
        setLoading(true)
        await fetchOrCreateProfile(session.user.id)
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
    setAuthError(null)
    try {
      let existing, fetchError
      for (let attempt = 0; attempt <= 1; attempt++) {
        const result = await supabase
          .from('profiles')
          .select('*, companies(*)')
          .eq('id', userId)
          .single()
        existing = result.data
        fetchError = result.error
        // PGRST116 ("no rows returned") is the only signal that actually
        // means this user has no profile yet. Any other failure — e.g. the
        // auth token not having propagated to PostgREST/RLS yet on a
        // freshly-restored session — must not be treated the same way, or
        // an existing user gets misclassified as new and routed straight
        // into onboarding. Retry once before giving up.
        if (existing || fetchError?.code === 'PGRST116') break
        if (attempt === 0) await new Promise(r => setTimeout(r, 500))
      }

      if (existing) {
        setProfile(existing)
        loadedUserId.current = userId
        return
      }

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

      // New user — check for invite metadata
      const { data: authData } = await supabase.auth.getUser()
      const meta = authData?.user?.user_metadata ?? {}
      const companyIdFromInvite = meta.company_id
      const role = meta.role ?? 'owner'

      // Same class of race as the existing-user retry above: this can fail
      // transiently on a freshly-restored session before the auth token has
      // fully propagated to RLS. A silent failure here is worse than for an
      // existing user, though — it leaves an invited driver/dispatcher with
      // no profile at all, and upsert-company's server-side self-heal has no
      // way to tell "provisioning raced" apart from "this account is
      // actually broken" without re-deriving the same invite metadata. So
      // retry here rather than letting it fall through.
      let fresh, provisionError
      for (let attempt = 0; attempt <= 1; attempt++) {
        try {
          let companyId = companyIdFromInvite
          if (!companyId) {
            // Chaining .select() here (to read back the generated id) makes
            // this an INSERT ... RETURNING under the hood — Postgres denies
            // that outright (42501) unless a SELECT policy already grants
            // the caller visibility into the new row, and read_own_company
            // depends on my_company_id(), which requires a profile row that
            // can't exist yet for a brand-new owner signup. Same chicken-
            // and-egg bootstrap problem as the profiles insert below, just
            // hitting the companies table first. Generating the id
            // client-side sidesteps RETURNING entirely — no read-back needed.
            companyId = crypto.randomUUID()
            const { error: companyError } = await supabase
              .from('companies')
              .insert({ id: companyId, name: 'My Company', sdvosb: false })
            if (companyError) throw companyError
          }

          // A plain insert, not an upsert/ON CONFLICT — Postgres RLS denies
          // INSERT ... ON CONFLICT outright for a role with no SELECT
          // visibility into the table yet (42501, "new row violates
          // row-level security policy"), which is exactly the case for a
          // brand-new user: my_company_id() reads company_id off the
          // caller's own profile row, which doesn't exist yet, so
          // read_company_profiles resolves to zero visibility and Postgres
          // can't safely evaluate the conflict target at all. This isn't a
          // narrow edge case — it deterministically broke the first login
          // of every invited teammate (confirmed 2026-08-19 against
          // production while debugging a stuck dispatcher account). A 23505
          // unique-violation below (another tab/request won the race) is
          // the only case ON CONFLICT was ever meant to guard against, and
          // it's handled explicitly instead.
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({ id: userId, company_id: companyId, full_name: '', role })
          if (profileError && profileError.code !== '23505') throw profileError

          // supabase-js resolves a Postgrest failure as { error } rather than
          // rejecting — throwing it here (instead of just recording it) is
          // what makes this attempt actually fall into the catch below and
          // retry. Without this, a transient failure right after this
          // freshly-established invite session (the same class of race the
          // existing-user fetch above already retries on) breaks out of the
          // loop on attempt 0 with no profile ever created, and no visible
          // error — fetchOrCreateProfile's outer catch only console.errors.
          const result = await supabase.from('profiles').select('*, companies(*)').eq('id', userId).single()
          if (result.error) throw result.error
          fresh = result.data
          provisionError = null
          break
        } catch (err) {
          provisionError = err
          if (attempt === 0) await new Promise(r => setTimeout(r, 500))
        }
      }
      if (!fresh && provisionError) throw provisionError

      setProfile(fresh ?? null)
      if (fresh) loadedUserId.current = userId
    } catch (err) {
      // A signed-in user with no profile and no visible error is a dead
      // end — they'd just see the generic onboarding welcome screen with no
      // indication anything failed. Surface it so OnboardingGate can show a
      // retry state instead.
      console.error('fetchOrCreateProfile failed:', err)
      setAuthError(err?.message ?? 'Failed to set up your account')
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
      // supabase.auth.signOut() has no built-in timeout — if that network
      // call hangs, local state must still clear so the user isn't stuck.
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Sign out timed out')), 8000)),
      ])
    } catch {
      // ignore — clear local state regardless of timeout or real error
    } finally {
      // Cleared (not just left stale) so a fresh sign-in as the same user
      // in this same tab still requires the step-up again.
      if (session?.user?.id) sessionStorage.removeItem(`vantar_mfa_verified_${session.user.id}`)
      setSession(null)
      setProfile(null)
      setEmailMfaVerifiedState(false)
      loadedUserId.current = null
      setLoading(false)
    }
  }

  function setProfileDirect(p) { setProfile(p) }

  return (
    <AuthContext.Provider value={{
      session, profile: effectiveProfile, loading, authError, signOut, refreshProfile, setProfileDirect,
      isDevUser: devUser, viewRole, setViewRole, realRole: profile?.role,
      emailMfaVerified, markEmailMfaVerified,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
