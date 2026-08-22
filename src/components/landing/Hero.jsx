import { Link } from 'react-router-dom'

function scrollToDemoForm() {
  document.getElementById('demo-form')?.scrollIntoView({ behavior: 'smooth' })
}

export default function Hero() {
  return (
    <div className="px-5 pt-8 pb-16 md:pt-16 md:pb-24">
      <div className="max-w-4xl mx-auto text-center">
        <div className="flex items-center justify-center gap-4 mb-10">
          <h1 className="text-2xl font-black text-white tracking-tight">CONVOY</h1>
          <Link to="/login" className="text-white/35 text-sm hover:text-white/60 transition-colors">
            Sign In
          </Link>
        </div>

        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
          Logistics Software from a{' '}
          <span className="text-brand-400">Veteran-Owned Business</span>
        </h2>
        <p className="text-white/60 text-base md:text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
          Convoy is the all-in-one dispatch, tracking, and compliance platform for
          logistics and courier companies — an SDVOSB-certified small business built
          for operators fulfilling VA, DoD, and HHS contracts, and any fleet that
          needs the same rigor.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9">
          <button
            onClick={scrollToDemoForm}
            className="w-full sm:w-auto bg-brand-600 text-white font-bold px-8 py-3 rounded-xl transition-colors hover:bg-brand-700"
          >
            Schedule a Demo
          </button>
          <Link
            to="/login"
            className="text-white/50 text-sm hover:text-white/70 transition-colors font-medium"
          >
            Already a customer? Sign in →
          </Link>
        </div>
      </div>
    </div>
  )
}
