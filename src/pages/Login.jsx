import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react'

const inputBase = 'w-full bg-navy-800 border border-white/10 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/25 transition-colors'

export default function Login() {
  const [view, setView]       = useState('signin') // 'signin' | 'signup' | 'forgot'
  const [magicLink, setMagicLink] = useState(false)
  const [step, setStep]       = useState('form')   // 'form' | 'sent' | 'reset-sent' | 'confirm-sent'

  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  function switchView(v) {
    setView(v)
    setStep('form')
    setError('')
    setPassword('')
    setConfirmPw('')
    setMagicLink(false)
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setLoading(true); setError('')
    if (magicLink) {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
      if (error) setError(error.message)
      else setStep('sent')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  async function handleSignUp(e) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPw) { setError('Passwords do not match.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setStep('confirm-sent')
    setLoading(false)
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    })
    if (error) setError(error.message)
    else setStep('reset-sent')
    setLoading(false)
  }

  // ── Sent / confirmation screens ──────────────────────────────────────────
  if (step === 'sent' || step === 'reset-sent' || step === 'confirm-sent') {
    const config = {
      sent: {
        icon: '📬',
        title: 'Check your email',
        body: <>We sent a magic link to <strong className="text-white">{email}</strong>. Click it to sign in.</>,
      },
      'reset-sent': {
        icon: '🔑',
        title: 'Reset link sent',
        body: <>We sent a password reset link to <strong className="text-white">{email}</strong>. Check your inbox.</>,
      },
      'confirm-sent': {
        icon: '✉️',
        title: 'Confirm your email',
        body: <>We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it to activate your account.</>,
      },
    }[step]

    return (
      <Screen>
        <div className="bg-navy-700 rounded-2xl p-6 border border-white/[0.08] text-center space-y-4 py-8">
          <div className="text-4xl">{config.icon}</div>
          <p className="font-semibold text-white text-lg">{config.title}</p>
          <p className="text-sm text-white/50 leading-relaxed">{config.body}</p>
          <button onClick={() => setStep('form')} className="text-white/40 text-sm font-medium hover:text-white/60 transition-colors flex items-center gap-1 mx-auto">
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </Screen>
    )
  }

  // ── Main form ────────────────────────────────────────────────────────────
  return (
    <Screen>
      {/* Tabs */}
      {view !== 'forgot' && (
        <div className="flex bg-navy-800 rounded-2xl p-1 mb-1 gap-1">
          {[['signin', 'Sign In'], ['signup', 'Create Account']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => switchView(v)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${view === v ? 'bg-brand-600 text-white shadow' : 'text-white/40 hover:text-white/60'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="bg-navy-700 rounded-2xl p-6 border border-white/[0.08] space-y-4">

        {/* ── Sign In ── */}
        {view === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-3">
              <Field label="Email Address">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" className={inputBase} required autoFocus />
              </Field>

              {!magicLink && (
                <Field label="Password">
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputBase + ' pr-12'}
                      required
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button type="button" onClick={() => switchView('forgot')}
                    className="text-xs text-white/35 hover:text-white/60 transition-colors mt-1 text-right w-full">
                    Forgot password?
                  </button>
                </Field>
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors hover:bg-brand-700">
              {loading ? 'Signing in…' : magicLink ? 'Send Magic Link' : 'Sign In'}
            </button>

            <div className="pt-1 border-t border-white/[0.07] text-center">
              <button type="button" onClick={() => { setMagicLink(!magicLink); setError('') }}
                className="text-white/35 text-xs hover:text-white/60 transition-colors flex items-center gap-1.5 mx-auto">
                {magicLink ? <Lock size={12} /> : <Mail size={12} />}
                {magicLink ? 'Sign in with password instead' : 'Sign in with magic link instead'}
              </button>
            </div>
          </form>
        )}

        {/* ── Create Account ── */}
        {view === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-3">
              <Field label="Email Address">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" className={inputBase} required autoFocus />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={inputBase + ' pr-12'}
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="••••••••"
                  className={inputBase}
                  required
                />
              </Field>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors hover:bg-brand-700">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}

        {/* ── Forgot Password ── */}
        {view === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-1">
              <p className="text-white font-semibold">Reset your password</p>
              <p className="text-white/50 text-sm">We'll email you a link to set a new one.</p>
            </div>
            <Field label="Email Address">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" className={inputBase} required autoFocus />
            </Field>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors hover:bg-brand-700">
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <div className="pt-1 border-t border-white/[0.07] text-center">
              <button type="button" onClick={() => switchView('signin')}
                className="text-white/35 text-xs hover:text-white/60 transition-colors flex items-center gap-1.5 mx-auto">
                <ArrowLeft size={12} /> Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </Screen>
  )
}

function Screen({ children }) {
  return (
    <div className="bg-navy-900 min-h-screen flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-3">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">CONVOY</h1>
          <p className="text-white/40 text-sm mt-1">Medical Courier Platform</p>
        </div>
        {children}
        <p className="text-center text-white/25 text-xs pt-2">SDVOSB · SAM.gov Compliant</p>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}
