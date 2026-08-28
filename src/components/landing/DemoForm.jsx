import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Reveal from './Reveal'

const inputBase = 'w-full bg-navy-800 border border-fg/10 text-fg rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-fg/25 transition-colors'

export default function DemoForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'success' | 'error'
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')
    setError('')
    const { error } = await supabase.from('demo_requests').insert({ name, email, company, message })
    if (error) {
      setError(error.message)
      setStatus('error')
      return
    }
    setStatus('success')
  }

  return (
    <section id="demo-form" className="px-5 py-16 md:py-24 border-t border-fg/[0.07]">
      <div className="max-w-md mx-auto">
        {status === 'success' ? (
          <div className="bg-navy-700 rounded-2xl p-6 border border-fg/[0.08] text-center space-y-4 py-8 animate-fadeIn">
            <div className="text-4xl">📬</div>
            <p className="font-semibold text-fg text-lg">Request received</p>
            <p className="text-sm text-fg/50 leading-relaxed">
              Thanks, <strong className="text-fg">{name}</strong>. We'll reach out to{' '}
              <strong className="text-fg">{email}</strong> to schedule your demo.
            </p>
          </div>
        ) : (
          <Reveal>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-fg tracking-tight">Start Your Demo Today</h3>
              <p className="text-fg/50 text-sm mt-2">
                Tell us about your operation and we'll be in touch.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-navy-700 rounded-2xl p-6 border border-fg/[0.08] space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-fg/40 uppercase tracking-wide">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className={inputBase}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-fg/40 uppercase tracking-wide">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputBase}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-fg/40 uppercase tracking-wide">Company (optional)</label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Your company"
                  className={inputBase}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-fg/40 uppercase tracking-wide">Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us about your operation"
                  rows={4}
                  className={inputBase}
                  required
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all hover:bg-brand-700 hover:scale-[1.02] active:scale-[0.98]"
              >
                {status === 'submitting' ? 'Sending…' : 'Schedule a Demo'}
              </button>
            </form>
          </Reveal>
        )}
      </div>
    </section>
  )
}
