import { Gift } from 'lucide-react'
import { Link } from 'react-router-dom'
import Reveal from './Reveal'

export default function Referral() {
  return (
    <div className="px-5 py-14 md:py-16 border-t border-fg/[0.07]">
      <Reveal className="max-w-2xl mx-auto text-center bg-navy-700 rounded-2xl border border-fg/[0.08] p-8 md:p-10">
        <div className="w-11 h-11 rounded-xl bg-brand-600/15 border border-brand-600/25 flex items-center justify-center mx-auto mb-4">
          <Gift size={20} className="text-brand-300" />
        </div>
        <h3 className="text-xl md:text-2xl font-black text-fg tracking-tight">
          Know a Company That'd Benefit?
        </h3>
        <p className="text-fg/60 text-sm md:text-base mt-3 leading-relaxed">
          Refer another courier or logistics company to Vantar. If they subscribe and stay
          active for 30 days, you get a free month on your own subscription.
        </p>
        <Link to="/terms" className="inline-block text-brand-300 text-sm font-semibold underline hover:text-brand-200 transition-colors mt-4">
          See referral program terms
        </Link>
      </Reveal>
    </div>
  )
}
