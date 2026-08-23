import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { listFactors, challengeFactor, verifyChallenge } from '../lib/mfa'
import { ShieldCheck } from 'lucide-react'

const inputBase = 'w-full bg-navy-800 border border-white/10 text-white rounded-xl px-4 py-3 text-base text-center tracking-[0.3em] font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/25 placeholder:tracking-normal placeholder:font-normal transition-colors'

// Shown between password sign-in and the rest of the app whenever the
// account has a verified phone factor and this session hasn't completed
// the step-up challenge yet (see App.jsx's AuthGate for the aal check).
export default function VerifyMfa() {
  const { profile, signOut, refreshAal } = useAuth()
  const [factorId, setFactorId] = useState(null)
  const [challengeId, setChallengeId] = useState(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  // listFactors() doesn't return the phone number itself (by design), so
  // the "ending in ####" hint reads from profiles.phone instead — saved
  // there when the factor was enrolled in Settings' Security tab.
  const phoneSuffix = profile?.phone ? profile.phone.slice(-4) : ''

  useEffect(() => {
    async function start() {
      const { data, error } = await listFactors()
      const factor = data?.phone?.[0]
      if (error || !factor) {
        setError('Could not start phone verification — please sign out and back in.')
        setLoading(false)
        return
      }
      setFactorId(factor.id)
      const { data: challenge, error: challengeErr } = await challengeFactor(factor.id)
      if (challengeErr) {
        setError(challengeErr.message)
      } else {
        setChallengeId(challenge.id)
      }
      setLoading(false)
    }
    start()
  }, [])

  async function handleVerify(e) {
    e.preventDefault()
    if (!factorId || !challengeId || code.length < 6) return
    setVerifying(true)
    setError('')
    const { error } = await verifyChallenge(factorId, challengeId, code)
    if (error) {
      setError(error.message)
      setVerifying(false)
      return
    }
    await refreshAal()
    // AuthGate re-reads aal on the next render and lets the app through —
    // nothing else to do here.
  }

  async function resend() {
    if (!factorId) return
    setError('')
    setCode('')
    const { data, error } = await challengeFactor(factorId)
    if (error) setError(error.message)
    else setChallengeId(data.id)
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
              {loading
                ? 'Sending a code to your phone…'
                : phoneSuffix
                  ? <>Enter the code we texted to the number ending in <strong className="text-white">{phoneSuffix}</strong>.</>
                  : 'Enter the code we texted to your phone.'}
            </p>
          </div>

          {!loading && (
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
