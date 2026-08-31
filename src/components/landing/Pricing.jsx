import { CheckCircle } from 'lucide-react'
import { PLAN_META } from '../../lib/plans'
import Reveal from './Reveal'

export default function Pricing() {
  return (
    <div id="pricing" className="px-5 py-16 md:py-24 border-t border-fg/[0.07] scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-10">
          <h3 className="text-2xl md:text-3xl font-black text-fg tracking-tight">
            Plans for Every Fleet
          </h3>
          <p className="text-fg/50 mt-3 max-w-xl mx-auto">
            One flat rate per company, no per-seat fees, no hardware required.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {Object.entries(PLAN_META).map(([key, meta], i) => (
            <Reveal key={key} delay={i * 100}>
              <div className="bg-navy-700 rounded-2xl border border-fg/[0.08] p-8 h-full transition-all hover:-translate-y-1 hover:border-brand-600/40 hover:shadow-xl hover:shadow-brand-900/20">
                <div className="flex items-center justify-between">
                  <p className="text-fg font-bold text-lg">{meta.label}</p>
                  <span className="text-[10px] font-bold text-green-300 bg-green-500/15 border border-green-500/25 px-2 py-0.5 rounded-full">
                    Save ${meta.monthlyPrice * 12 - meta.yearlyPrice}/yr
                  </span>
                </div>
                {meta.bestFor && (
                  <p className="text-fg/40 text-xs mt-0.5">{meta.bestFor}</p>
                )}
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-4xl font-black text-fg tracking-tight">${Math.round(meta.yearlyPrice / 12)}</span>
                  <span className="text-fg/40 text-sm font-medium">/mo, billed annually</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {meta.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-fg/70 text-sm">
                      <CheckCircle size={16} className="text-brand-300 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={meta.yearlyPaymentLink}
                  className="block text-center w-full mt-8 bg-brand-600 text-white font-bold px-8 py-3 rounded-xl shadow-sm shadow-brand-900/20 transition-all hover:bg-brand-700 hover:shadow-brand-900/25 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Subscribe Yearly
                </a>
                <a
                  href={meta.monthlyPaymentLink}
                  className="block text-center text-fg/40 text-xs mt-3 font-semibold underline hover:text-fg/60 transition-colors"
                >
                  or pay monthly, ${meta.monthlyPrice}/mo
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  )
}
