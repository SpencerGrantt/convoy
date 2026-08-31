import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Logo from '../components/ui/Logo'

const inputBase = 'w-full bg-navy-800 border border-fg/10 text-fg rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-fg/25 transition-colors'

export default function Login() {
  // Public self-serve signup is disabled — new accounts are created by the
  // team (Supabase dashboard or the manage-team invite flow) after a demo,
  // never directly from this page. See BILLING_ENABLED in lib/billing.js.
  const [view, setView]       = useState('signin') // 'signin' | 'forgot'
  const [magicLink, setMagicLink] = useState(false)
  const [step, setStep]       = useState('form')   // 'form' | 'sent' | 'reset-sent'

  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  function switchView(v) {
    setView(v)
    setStep('form')
    setError('')
    setPassword('')
    setMagicLink(false)
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setLoading(true); setError('')
    if (magicLink) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
      })
      if (error) setError(error.message)
      else setStep('sent')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
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
  if (step === 'sent' || step === 'reset-sent') {
    const config = {
      sent: {
        icon: '📬',
        title: 'Check your email',
        body: <>We sent a magic link to <strong className="text-fg">{email}</strong>. Click it to sign in.</>,
      },
      'reset-sent': {
        icon: '🔑',
        title: 'Reset link sent',
        body: <>We sent a password reset link to <strong className="text-fg">{email}</strong>. Check your inbox.</>,
      },
    }[step]

    return (
      <Screen>
        <div className="bg-navy-700 rounded-2xl p-6 border border-fg/[0.08] text-center space-y-4 py-8">
          <div className="text-4xl">{config.icon}</div>
          <p className="font-semibold text-fg text-lg">{config.title}</p>
          <p className="text-sm text-fg/50 leading-relaxed">{config.body}</p>
          <button onClick={() => setStep('form')} className="text-fg/40 text-sm font-medium hover:text-fg/60 transition-colors flex items-center gap-1 mx-auto">
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </Screen>
    )
  }

  // ── Main form ────────────────────────────────────────────────────────────
  return (
    <Screen>
      <div className="bg-navy-700 rounded-2xl p-6 border border-fg/[0.08] space-y-4">

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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/30 hover:text-fg/60 transition-colors">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button type="button" onClick={() => switchView('forgot')}
                    className="text-xs text-fg/35 hover:text-fg/60 transition-colors mt-1 text-right w-full">
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

            <div className="pt-1 border-t border-fg/[0.07] text-center">
              <button type="button" onClick={() => { setMagicLink(!magicLink); setError('') }}
                className="text-fg/35 text-xs hover:text-fg/60 transition-colors flex items-center gap-1.5 mx-auto">
                {magicLink ? <Lock size={12} /> : <Mail size={12} />}
                {magicLink ? 'Sign in with password instead' : 'Sign in with magic link instead'}
              </button>
            </div>
          </form>
        )}

        {/* ── Forgot Password ── */}
        {view === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-1">
              <p className="text-fg font-semibold">Reset your password</p>
              <p className="text-fg/50 text-sm">We'll email you a link to set a new one.</p>
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

            <div className="pt-1 border-t border-fg/[0.07] text-center">
              <button type="button" onClick={() => switchView('signin')}
                className="text-fg/35 text-xs hover:text-fg/60 transition-colors flex items-center gap-1.5 mx-auto">
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
          <h1 className="inline-block"><Logo size="2xl" /></h1>
          <p className="text-fg/40 text-sm mt-1">Logistics Platform</p>
        </div>
        {children}
        <p className="text-center text-fg/25 text-xs pt-2">SAM.gov Compliant</p>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-fg/40 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}
