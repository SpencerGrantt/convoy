import Reveal from './Reveal'

const STEPS = [
  {
    n: '01',
    title: 'Dispatch the Run',
    body: 'Send pickup and delivery details straight to a driver\'s phone the moment a run is created.',
  },
  {
    n: '02',
    title: 'Track It Live',
    body: 'Follow real-time GPS location and status updates from pickup through delivery.',
  },
  {
    n: '03',
    title: 'Prove the Handoff',
    body: 'Capture photo and signature proof of delivery at every chain-of-custody checkpoint.',
  },
  {
    n: '04',
    title: 'Close It Out',
    body: 'Compliance reports, invoices, and IFTA mileage logs generate automatically once the run is done.',
  },
]

export default function HowItWorks() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-navy-900 to-brand-800">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(51,92,255,0.25), transparent 45%), radial-gradient(circle at 80% 60%, rgba(51,92,255,0.2), transparent 50%)',
        }}
      />
      <div className="relative px-5 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              From Dispatch to Compliance Report
            </h3>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 100} className="relative group">
                <span className="block text-6xl font-black text-brand-400/20 leading-none mb-2 transition-colors group-hover:text-brand-400/35">
                  {step.n}
                </span>
                <h4 className="text-white font-bold text-lg mb-1.5">{step.title}</h4>
                <p className="text-white/60 text-sm leading-relaxed">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
