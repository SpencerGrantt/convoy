import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendMagicLink(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (error) setError(error.message)
    else setStep('sent')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-brand-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-brand-50 tracking-tight">CONVOY</h1>
          <p className="text-brand-400 text-sm mt-1">Medical Courier Platform</p>
        </div>

        <div className="bg-brand-800 rounded-2xl p-6 shadow-xl border border-brand-700">
          {step === 'email' ? (
            <form onSubmit={sendMagicLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-300 mb-1 uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-brand-900 border border-brand-600 rounded-xl px-4 py-3 text-brand-50 placeholder-brand-500 text-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-50 text-brand-900 font-bold py-3 rounded-xl disabled:opacity-50 active:bg-brand-200 transition-colors"
              >
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4 py-2">
              <div className="text-4xl">📬</div>
              <p className="font-semibold text-brand-50">Check your email</p>
              <p className="text-sm text-brand-300">
                We sent a magic link to <strong className="text-brand-50">{email}</strong>. Click it to sign in — no password needed.
              </p>
              <button
                onClick={() => { setStep('email'); setError('') }}
                className="text-brand-300 text-sm font-medium"
              >
                ← Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-brand-600 text-xs mt-6">
          SDVOSB · SAM.gov Compliant
        </p>
      </div>
    </div>
  )
}
