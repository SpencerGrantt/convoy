import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { CheckCircle, ChevronRight, Building2, User, Shield } from 'lucide-react'

const fieldClass = 'w-full bg-white/[0.07] border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-white/25 transition-colors'

const STEPS = [
  { id: 1, label: 'You',     icon: User },
  { id: 2, label: 'Company', icon: Building2 },
  { id: 3, label: 'Done',    icon: CheckCircle },
]

export default function Onboarding() {
  const { profile, setProfileDirect } = useAuth()
  const navigate = useNavigate()
  const company = profile?.companies

  const [step, setStep]           = useState(1)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // Step 1 fields
  const [fullName, setFullName]   = useState(profile?.full_name ?? '')

  // Step 2 fields
  const [companyName, setCompanyName] = useState(company?.name && company.name !== 'My Company' ? company.name : '')
  const [cageCode, setCageCode]       = useState(company?.cage_code ?? '')
  const [uei, setUei]                 = useState(company?.uei ?? '')
  const [naics, setNaics]             = useState(company?.naics_codes?.filter(Boolean).join(', ') ?? '')
  const [samExpiry, setSamExpiry]     = useState(company?.sam_expiry ?? '')
  const [sdvosb, setSdvosb]           = useState(company?.sdvosb ?? false)

  async function handleStep1(e) {
    e.preventDefault()
    if (!fullName.trim()) return
    setStep(2)
  }

  async function handleStep2(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const naicsCodes = naics.split(',').map(s => s.trim()).filter(Boolean)
      const { data, error: fnErr } = await supabase.functions.invoke('upsert-company', {
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
      if (data?.profile) setProfileDirect(data.profile)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function goToDashboard() {
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center px-4 py-12">

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => {
          const done = step > s.id
          const active = step === s.id
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all
                ${done    ? 'bg-green-500 text-white'
                : active  ? 'bg-brand-600 text-white ring-4 ring-brand-600/20'
                :           'bg-white/10 text-white/30'}`}>
                {done ? <CheckCircle size={14} /> : s.id}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? 'text-white' : 'text-white/30'}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px mx-1 ${step > s.id ? 'bg-green-500' : 'bg-white/10'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step 1 — Your name */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="w-full max-w-md space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center mx-auto mb-4">
              <User size={28} className="text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome to Convoy</h1>
            <p className="text-white/50 text-sm">Let's get your account set up in two quick steps.</p>
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
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Role</label>
              <div className="px-4 py-3 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                <span className="text-sm text-white/60 capitalize">{profile?.role ?? 'Owner'}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!fullName.trim()}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            Continue <ChevronRight size={18} />
          </button>
        </form>
      )}

      {/* Step 2 — Company setup */}
      {step === 2 && (
        <form onSubmit={handleStep2} className="w-full max-w-md space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center mx-auto mb-4">
              <Building2 size={28} className="text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Set Up Your Company</h1>
            <p className="text-white/50 text-sm">This helps match you with federal contracts on SAM.gov.</p>
          </div>

          <div className="bg-navy-700 rounded-2xl p-5 border border-white/[0.07] space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Company Name <span className="text-brand-400">*</span></label>
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
              <label className="block text-xs text-white/50 mb-1.5 font-medium">NAICS Codes <span className="text-white/25">(comma separated)</span></label>
              <input value={naics} onChange={e => setNaics(e.target.value)} placeholder="492110, 621610" className={fieldClass} />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">SAM.gov Expiry Date</label>
              <input type="date" value={samExpiry} onChange={e => setSamExpiry(e.target.value)} className={fieldClass} />
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none pt-1">
              <div
                className={`w-12 h-6 rounded-full transition-colors relative ${sdvosb ? 'bg-brand-600' : 'bg-white/15'}`}
                onClick={() => setSdvosb(!sdvosb)}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${sdvosb ? 'translate-x-6' : ''}`} />
              </div>
              <div>
                <span className="text-sm text-white font-medium">SDVOSB Certified</span>
                <p className="text-xs text-white/35">Service-Disabled Veteran-Owned Small Business</p>
              </div>
            </label>
          </div>

          {error && <p className="text-red-400 text-xs font-medium text-center">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-3.5 bg-white/10 hover:bg-white/15 text-white/70 font-semibold rounded-xl transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={saving || !companyName.trim()}
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? 'Saving…' : <><span>Finish Setup</span> <ChevronRight size={18} /></>}
            </button>
          </div>

          <p className="text-center text-xs text-white/25">You can update all of this later in Settings.</p>
        </form>
      )}

      {/* Step 3 — Done */}
      {step === 3 && (
        <div className="w-full max-w-md space-y-6 text-center animate-fade-in">
          <div className="space-y-3">
            <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
              <CheckCircle size={40} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">You're all set, {fullName.split(' ')[0]}!</h1>
            <p className="text-white/50 text-sm">
              {companyName || 'Your company'} is ready. Start creating runs, scanning contracts, or invite your team.
            </p>
          </div>

          <div className="bg-navy-700 rounded-2xl p-4 border border-white/[0.07] text-left space-y-2.5">
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-brand-400 shrink-0" />
              <span className="text-sm text-white/70">Company profile created</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle size={16} className="text-green-400 shrink-0" />
              <span className="text-sm text-white/70">SAM.gov contract scanner ready</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle size={16} className="text-green-400 shrink-0" />
              <span className="text-sm text-white/70">AI assistant activated</span>
            </div>
          </div>

          <button
            onClick={goToDashboard}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Go to Dashboard <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
