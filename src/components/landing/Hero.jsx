import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../ui/Logo'
import dashboardMockup from '../../assets/landing/hero-dashboard-mockup.png'

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
    <div className="relative overflow-hidden px-5 pt-6 pb-16 md:pt-8 md:pb-24">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(51,92,255,0.14), transparent 55%)',
        }}
      />
      <div className="relative max-w-6xl mx-auto">
        <nav className="flex items-center justify-between mb-14 md:mb-20">
          <h1><Logo size="lg" /></h1>
          <div className="flex items-center gap-4 md:gap-6">
            <button onClick={scrollToPricing} className="hidden md:inline text-fg/60 text-sm font-medium hover:text-fg transition-colors">
              Pricing
            </button>
            <button
              onClick={scrollToDemoForm}
              className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm shadow-brand-900/20 transition-all hover:bg-brand-700 hover:shadow-brand-900/25 hover:scale-[1.03] active:scale-[0.98]"
            >
              Request a Demo
            </button>
          </div>
        </nav>

        <div
          className={`max-w-4xl mx-auto text-center transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h2 className="text-3xl md:text-5xl font-black text-fg tracking-tight leading-tight">
            Dispatch, Track, and Deliver,{' '}
            <span className="text-brand-400">Built for Any Fleet</span>
          </h2>
          <p className="text-fg/60 text-base md:text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
            Vantar is the all-in-one dispatch, tracking, and compliance platform for
            logistics and courier companies of any size, with SAM.gov contract
            matching built in for teams that need it.
          </p>

          <div className="flex flex-col items-center gap-2 mt-9">
            <button
              onClick={scrollToDemoForm}
              className="bg-brand-600 text-white font-bold px-8 py-3 rounded-xl shadow-md shadow-brand-900/20 transition-all hover:bg-brand-700 hover:shadow-brand-900/25 hover:scale-[1.03] active:scale-[0.98]"
            >
              Request a Demo
            </button>
            <div className="text-fg/50 text-sm flex flex-col items-center gap-1 mt-6">
              <Link to="/login" className="hover:text-fg transition-colors">
                Already have an account? <span className="font-semibold underline">Login Here</span>
              </Link>
            </div>
          </div>
        </div>

        <div
          className={`max-w-4xl mx-auto mt-14 md:mt-20 transition-all duration-700 ease-out delay-150 motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <img
            src={dashboardMockup}
            alt="Vantar dashboard"
            className="w-full h-auto"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(51,92,255,0.35)) drop-shadow(0 0 70px rgba(51,92,255,0.2))',
            }}
          />
        </div>
      </div>
    </div>
  )
}
