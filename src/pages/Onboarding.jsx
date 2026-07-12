import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { invokeFn } from '../lib/supabase'
import {
  CheckCircle, ChevronRight, Building2, User, Shield,
  Users, Crown, Mail,
} from 'lucide-react'

const fieldClass = 'w-full bg-white/[0.07] border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/25 transition-colors'

// path: null = not chosen yet (step 0)
// path: 'admin'  = starting own company   → steps 1, 2, 3
// path: 'team'   = joining existing team  → steps 1, 3

export default function Onboarding() {
  const { session, profile, setProfileDirect, signOut } = useAuth()
  const navigate = useNavigate()
  const company = profile?.companies

  const [path, setPath]   = useState(null)
  const [step, setStep]   = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const [fullName, setFullName]       = useState(profile?.full_name ?? '')
  const [companyName, setCompanyName] = useState(
    company?.name && company.name !== 'My Company' ? company.name : ''
  )
  const [cageCode, setCageCode] = useState(company?.cage_code ?? '')
  const [uei, setUei]           = useState(company?.uei ?? '')
  const [naics, setNaics]       = useState(company?.naics_codes?.filter(Boolean).join(', ') ?? '')
  const [samExpiry, setSamExpiry] = useState(company?.sam_expiry ?? '')
  const [sdvosb, setSdvosb]     = useState(company?.sdvosb ?? false)

  // ── Visual step labels per path ──────────────────────────────────────────
  const STEPS_ADMIN = ['Role', 'You', 'Company', 'Done']
  const STEPS_TEAM  = ['Role', 'You', 'Done']
  const visSteps = path === 'team' ? STEPS_TEAM : STEPS_ADMIN

  // Map internal step → visual index
  function visIdx() {
    if (step === 0) return 0
    if (step === 1) return 1
    if (step === 2) return 2  // admin only
    if (step === 3) return path === 'team' ? 2 : 3
    return 0
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  function choosePath(p) {
    setPath(p)
    setStep(1)
    setError('')
  }

  function handleStep1(e) {
    e.preventDefault()
    if (!fullName.trim()) return
    if (path === 'admin') setStep(2)
    else                  handleTeamFinish()
  }

  async function handleTeamFinish() {
    setSaving(true); setError('')
    try {
      const { data, error: fnErr } = await invokeFn('upsert-company', {
        body: {
          full_name: fullName.trim(),
          company_id: company?.id ?? null,
          skip_company: true,
          onboarding_complete: true,
        },
      })
      if (fnErr) throw new Error(fnErr.message)
      if (data?.error) throw new Error(data.error)
      if (!data?.profile) throw new Error('Save did not complete — please try again.')
      setProfileDirect(data.profile)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleStep2(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const naicsCodes = naics.split(',').map(s => s.trim()).filter(Boolean)
      const { data, error: fnErr } = await invokeFn('upsert-company', {
        body: {
          name: companyName.trim() || 'My Company',
          cage_code: cageCode || null,
          uei: uei || null,
          naics_codes: naicsCodes,
          sam_expiry: samExpiry || null,
          sdvosb,
          full_name: fullName.trim(),
          company_id: company?.id ?? null,
          onboarding_complete: true,
        },
      })
      if (fnErr) throw new Error(fnErr.message)
      if (data?.error) throw new Error(data.error)
      if (!data?.profile) throw new Error('Save did not complete — please try again.')
      setProfileDirect(data.profile)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const firstName = fullName.trim().split(' ')[0] || 'there'

  // Auto-advance off the Done screen into the dashboard — the checkmarks
  // are shown briefly for confirmation, then it just takes you in.
  useEffect(() => {
    if (step !== 3) return
    const timer = setTimeout(() => navigate('/', { replace: true }), 2000)
    return () => clearTimeout(timer)
  }, [step, navigate])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">CONVOY</h1>
        <p className="text-white/35 text-xs mt-0.5">Medical Courier Platform</p>
      </div>

      {/* Step indicator — hidden on step 0 */}
      {step > 0 && (
        <div className="flex items-center gap-1.5 mb-8">
          {visSteps.map((label, i) => {
            const cur = visIdx()
            const done   = i < cur
            const active = i === cur
            return (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold transition-all
                  ${done    ? 'bg-green-500 text-white'
                  : active  ? 'bg-brand-600 text-white ring-4 ring-brand-600/20'
                  :           'bg-white/8 text-white/25'}`}>
                  {done ? <CheckCircle size={13} /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${active ? 'text-white' : 'text-white/30'}`}>
                  {label}
                </span>
                {i < visSteps.length - 1 && (
                  <div className={`w-6 h-px mx-0.5 ${done ? 'bg-green-500' : 'bg-white/10'}`} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Step 0: Choose path ─────────────────────────────────────────── */}
      {step === 0 && (
        <div className="w-full max-w-md space-y-5">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-bold text-white">Welcome to Convoy</h2>
            <p className="text-white/45 text-sm">How would you like to get started?</p>
          </div>

          <button
            onClick={() => choosePath('admin')}
            className="w-full bg-navy-700 hover:bg-navy-600 border border-white/[0.08] hover:border-brand-600/40 rounded-2xl p-5 text-left transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center shrink-0 group-hover:bg-brand-600/30 transition-colors">
                <Crown size={20} className="text-brand-300" />
              </div>
              <div>
                <p className="text-white font-bold text-base">Start as Administrator</p>
                <p className="text-white/45 text-sm mt-0.5 leading-snug">
                  Create your company, manage drivers, scan federal contracts.
                </p>
              </div>
              <ChevronRight size={18} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0 mt-0.5 ml-auto" />
            </div>
          </button>

          <button
            onClick={() => choosePath('team')}
            className="w-full bg-navy-700 hover:bg-navy-600 border border-white/[0.08] hover:border-white/20 rounded-2xl p-5 text-left transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                <Users size={20} className="text-white/50" />
              </div>
              <div>
                <p className="text-white font-bold text-base">Join a Team</p>
                <p className="text-white/45 text-sm mt-0.5 leading-snug">
                  Your admin already sent you an invite. Use that email link to connect.
                </p>
              </div>
              <ChevronRight size={18} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0 mt-0.5 ml-auto" />
            </div>
          </button>
        </div>
      )}

      {/* ── Step 1: Your name ───────────────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="w-full max-w-md space-y-5">
          <div className="text-center space-y-1.5">
            <div className="w-13 h-13 rounded-2xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center mx-auto mb-3" style={{width:52,height:52}}>
              <User size={24} className="text-brand-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">About you</h2>
            <p className="text-white/45 text-sm">
              {path === 'team'
                ? "Your admin's invite email will link you to the team automatically."
                : 'Quick intro before setting up your company.'}
            </p>
          </div>

          <div className="bg-navy-700 rounded-2xl p-5 border border-white/[0.07] space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Your Full Name</label>
              <input
                autoFocus
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jane Smith"
                required
                className={fieldClass}
              />
            </div>

            {path === 'team' && (
              <div className="flex items-start gap-3 bg-brand-600/10 border border-brand-600/20 rounded-xl p-3">
                <Mail size={15} className="text-brand-400 shrink-0 mt-0.5" />
                <p className="text-xs text-brand-200/80 leading-snug">
                  Haven't received an invite yet? Ask your admin to send one from <strong>Settings → Team</strong>.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Role</label>
              <div className="px-4 py-2.5 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                <span className="text-sm text-white/55 capitalize">
                  {path === 'admin' ? 'Administrator' : profile?.role ?? 'Driver'}
                </span>
              </div>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs font-medium text-center">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => { setStep(0); setPath(null) }}
              className="px-5 py-3.5 bg-white/8 hover:bg-white/12 text-white/60 font-semibold rounded-xl transition-colors">
              Back
            </button>
            <button
              type="submit"
              disabled={saving || !fullName.trim()}
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? 'Saving…' : path === 'team'
                ? <><span>Finish Setup</span> <ChevronRight size={17} /></>
                : <><span>Continue</span> <ChevronRight size={17} /></>}
            </button>
          </div>
        </form>
      )}

      {/* ── Step 2: Company setup (admin only) ──────────────────────────── */}
      {step === 2 && (
        <form onSubmit={handleStep2} className="w-full max-w-md space-y-5">
          <div className="text-center space-y-1.5">
            <div className="flex items-center justify-center mx-auto mb-3" style={{width:52,height:52,borderRadius:14,background:'rgba(4,35,145,0.2)',border:'1px solid rgba(4,35,145,0.35)'}}>
              <Building2 size={24} className="text-brand-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Your Company</h2>
            <p className="text-white/45 text-sm">Used to match you with federal contracts on SAM.gov.</p>
          </div>

          <div className="bg-navy-700 rounded-2xl p-5 border border-white/[0.07] space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">
                Company Name <span className="text-brand-400">*</span>
              </label>
              <input
                autoFocus
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Acme Medical Transport LLC"
                required
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">CAGE Code</label>
                <input value={cageCode} onChange={e => setCageCode(e.target.value)} placeholder="8ABC1" className={fieldClass} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">UEI</label>
                <input value={uei} onChange={e => setUei(e.target.value)} placeholder="ABCDEF123456" className={fieldClass} />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">
                NAICS Codes <span className="text-white/25">(comma-separated)</span>
              </label>
              <input value={naics} onChange={e => setNaics(e.target.value)} placeholder="492110, 621610" className={fieldClass} />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">SAM.gov Expiry Date</label>
              <input type="date" value={samExpiry} onChange={e => setSamExpiry(e.target.value)} className={fieldClass} />
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none pt-0.5">
              <div
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${sdvosb ? 'bg-brand-600' : 'bg-white/15'}`}
                onClick={() => setSdvosb(!sdvosb)}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${sdvosb ? 'translate-x-5' : ''}`} />
              </div>
              <div>
                <span className="text-sm text-white font-medium">SDVOSB Certified</span>
                <p className="text-xs text-white/30">Service-Disabled Veteran-Owned Small Business</p>
              </div>
            </label>
          </div>

          {error && <p className="text-red-400 text-xs font-medium text-center">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)}
              className="px-5 py-3.5 bg-white/8 hover:bg-white/12 text-white/60 font-semibold rounded-xl transition-colors">
              Back
            </button>
            <button
              type="submit"
              disabled={saving || !companyName.trim()}
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? 'Saving…' : <><span>Finish Setup</span> <ChevronRight size={17} /></>}
            </button>
          </div>

          <p className="text-center text-xs text-white/20">You can update all of this later in Settings.</p>
        </form>
      )}

      {/* ── Step 3: Done ────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="w-full max-w-md space-y-5 text-center">
          <div className="space-y-3">
            <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto">
              <CheckCircle size={38} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">You're all set, {firstName}!</h2>
            <p className="text-white/45 text-sm">
              {path === 'admin'
                ? `${companyName || 'Your company'} is ready. Start creating runs, scanning contracts, or invite your team.`
                : 'Your profile is set up. Check your email for your admin\'s invite to join the team.'}
            </p>
          </div>

          <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] text-left space-y-2.5">
            {path === 'admin' ? (
              <>
                <CheckRow icon={<Shield size={14} className="text-brand-400" />} label="Company profile created" />
                <CheckRow icon={<CheckCircle size={14} className="text-green-400" />} label="SAM.gov contract scanner ready" />
                <CheckRow icon={<CheckCircle size={14} className="text-green-400" />} label="AI dispatch assistant activated" />
              </>
            ) : (
              <>
                <CheckRow icon={<CheckCircle size={14} className="text-green-400" />} label="Profile created" />
                <CheckRow icon={<Mail size={14} className="text-brand-400" />} label="Awaiting admin's invite email" />
                <CheckRow icon={<CheckCircle size={14} className="text-green-400" />} label="AI assistant activated" />
              </>
            )}
          </div>

          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Go to Dashboard <ChevronRight size={18} />
          </button>
        </div>
      )}

      {session?.user?.email && (
        <p className="text-center text-xs text-white/25 mt-8">
          Signed in as {session.user.email} ·{' '}
          <button type="button" onClick={signOut} className="text-white/40 hover:text-white/60 underline transition-colors">
            Sign out
          </button>
        </p>
      )}
    </div>
  )
}

function CheckRow({ icon, label }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0">{icon}</span>
      <span className="text-sm text-white/65">{label}</span>
    </div>
  )
}
