import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOtp(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formatted = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })
    if (error) setError(error.message)
    else setStep('otp')
    setLoading(false)
  }

  async function verifyOtp(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formatted = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`
    const { data, error } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: 'sms' })

    if (error) { setError(error.message); setLoading(false); return }

    // first-time setup: create company + profile if none exists
    const userId = data.user.id
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existing) {
      const { data: company } = await supabase
        .from('companies')
        .insert({ name: 'My Company', sdvosb: true })
        .select()
        .single()

      await supabase.from('profiles').insert({
        id: userId,
        company_id: company.id,
        full_name: '',
        role: 'owner',
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white tracking-tight">CONVOY</h1>
          <p className="text-blue-200 text-sm mt-1">Medical Courier Platform</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          {step === 'phone' ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 active:bg-blue-700 transition-colors"
              >
                {loading ? 'Sending…' : 'Send Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <p className="text-sm text-gray-500">Enter the 6-digit code sent to {phone}</p>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 active:bg-blue-700 transition-colors"
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-gray-400 text-sm py-1"
              >
                ← Change number
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          SDVOSB · SAM.gov Compliant
        </p>
      </div>
    </div>
  )
}
