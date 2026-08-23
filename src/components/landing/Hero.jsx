import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function scrollToDemoForm() {
  document.getElementById('demo-form')?.scrollIntoView({ behavior: 'smooth' })
}

function scrollToPricing() {
  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
}

export default function Hero() {
  // Above the fold, so this animates in on mount rather than on scroll
  // (Reveal.jsx, used by the rest of the page, is scroll-triggered).
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="px-5 pt-6 pb-16 md:pt-8 md:pb-24">
      <div className="max-w-6xl mx-auto">
        <nav className="flex items-center justify-between mb-14 md:mb-20">
          <h1 className="text-2xl font-black text-white tracking-tight">CONVOY</h1>
          <div className="flex items-center gap-4 md:gap-6">
            <button onClick={scrollToPricing} className="hidden md:inline text-white/60 text-sm font-medium hover:text-white transition-colors">
              Pricing
            </button>
            <button onClick={scrollToDemoForm} className="hidden md:inline text-white/60 text-sm font-medium hover:text-white transition-colors">
              Request a Demo
            </button>
            <Link to="/login" className="text-white/60 text-sm font-medium hover:text-white transition-colors">
              Log In
            </Link>
            <Link
              to="/login"
              className="bg-navy-700 border border-white/10 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:bg-navy-800 hover:scale-[1.03] active:scale-[0.98]"
            >
              Sign Up
            </Link>
          </div>
        </nav>

        <div
          className={`max-w-4xl mx-auto text-center transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Dispatch, Track, and Deliver,{' '}
            <span className="text-brand-400">Built for Any Fleet</span>
          </h2>
          <p className="text-white/60 text-base md:text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
            Convoy is the all-in-one dispatch, tracking, and compliance platform for
            logistics and courier companies of any size, with SAM.gov contract
            matching built in for teams that need it.
          </p>

          <div className="flex justify-center mt-9">
            <button
              onClick={scrollToDemoForm}
              className="bg-brand-600 text-white font-bold px-8 py-3 rounded-xl transition-all hover:bg-brand-700 hover:scale-[1.03] active:scale-[0.98]"
            >
              Request a Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
