import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { ShieldCheck } from 'lucide-react'

const inputBase = 'w-full bg-navy-800 border border-white/10 text-white rounded-xl px-4 py-3 text-base text-center tracking-[0.3em] font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/25 placeholder:tracking-normal placeholder:font-normal transition-colors'

// Shown between password sign-in and the rest of the app whenever the
// account has email 2FA enabled (profiles.mfa_email_enabled) and this
// session hasn't verified yet (see AuthProvider's emailMfaVerified). Sends
// the code to session.user.email — the account's own login email, never a
// user-editable field, so this can't be redirected to another address.
export default function VerifyMfa() {
  const { session, signOut, markEmailMfaVerified } = useAuth()
  const email = session?.user?.email
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)

  useEffect(() => {
    sendCode()
  }, [])

  async function sendCode() {
    if (!email) return
    setSending(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) setError(error.message)
    setSending(false)
  }

  async function handleVerify(e) {
    e.preventDefault()
    if (!email || code.length < 6) return
    setVerifying(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) {
      setError(error.message)
      setVerifying(false)
      return
    }
    markEmailMfaVerified()
  }

  async function resend() {
    setCode('')
    setResent(false)
    await sendCode()
    setResent(true)
  }

  return (
    <div className="bg-navy-900 min-h-screen flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-3">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">CONVOY</h1>
          <p className="text-white/40 text-sm mt-1">Logistics Platform</p>
        </div>

        <div className="bg-navy-700 rounded-2xl p-6 border border-white/[0.08] space-y-4">
          <div className="text-center space-y-2">
            <ShieldCheck size={28} className="text-brand-300 mx-auto" />
            <p className="font-semibold text-white text-lg">Verify it's you</p>
            <p className="text-sm text-white/50 leading-relaxed">
              {sending
                ? 'Sending a code to your email…'
                : <>Enter the code we sent to <strong className="text-white">{email}</strong>.</>}
            </p>
          </div>

          {!sending && (
            <form onSubmit={handleVerify} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className={inputBase}
                autoFocus
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              {resent && !error && <p className="text-green-400 text-sm">New code sent.</p>}
              <button
                type="submit"
                disabled={verifying || code.length < 6}
                className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all hover:bg-brand-700"
              >
                {verifying ? 'Verifying…' : 'Verify'}
              </button>
              <button
                type="button"
                onClick={resend}
                className="w-full text-white/40 text-sm font-medium hover:text-white/60 transition-colors"
              >
                Resend code
              </button>
            </form>
          )}

          <button
            onClick={signOut}
            className="w-full text-white/30 text-xs font-medium hover:text-white/50 transition-colors pt-2"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
