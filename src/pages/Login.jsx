import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('password') // 'password' | 'magic'
  const [step, setStep] = useState('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      if (error) setError(error.message)
      else setStep('sent')
    }

    setLoading(false)
  }

  if (step === 'sent') {
    return (
      <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-brand-600 tracking-tight">CONVOY</h1>
            <p className="text-gray-400 text-sm mt-1">Medical Courier Platform</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-4 py-8">
            <div className="text-4xl">📬</div>
            <p className="font-semibold text-gray-900">Check your email</p>
            <p className="text-sm text-gray-500">
              We sent a magic link to <strong className="text-gray-900">{email}</strong>. Click it to sign in.
            </p>
            <button
              onClick={() => { setStep('form'); setError('') }}
              className="text-gray-400 text-sm font-medium"
            >
              ← Back
            </button>
          </div>
          <p className="text-center text-gray-400 text-xs mt-6">SDVOSB · SAM.gov Compliant</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-brand-600 tracking-tight">CONVOY</h1>
          <p className="text-gray-400 text-sm mt-1">Medical Courier Platform</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
                autoFocus
              />
            </div>

            {mode === 'password' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 active:bg-brand-700 transition-colors"
            >
              {loading ? 'Signing in…' : mode === 'password' ? 'Sign In' : 'Send Magic Link'}
            </button>
          </form>

          <div className="mt-4 text-center">
            {mode === 'password' ? (
              <button
                type="button"
                onClick={() => { setMode('magic'); setError('') }}
                className="text-gray-400 text-sm"
              >
                Sign in with magic link instead
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setMode('password'); setError('') }}
                className="text-gray-400 text-sm"
              >
                Sign in with password instead
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          SDVOSB · SAM.gov Compliant
        </p>
      </div>
    </div>
  )
}
