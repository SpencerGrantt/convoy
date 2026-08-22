import { useState } from 'react'
import { Radio, Camera, FileSearch, Calculator, Sparkles, Smartphone } from 'lucide-react'

const TABS = [
  {
    icon: Radio,
    label: 'Dispatch & Tracking',
    title: 'Real-Time Dispatch & Tracking',
    description: 'Send run details straight to a driver\'s phone and follow every pickup and delivery live on the map, with automatic status updates along the way.',
  },
  {
    icon: Camera,
    label: 'Chain-of-Custody',
    title: 'Photo-Verified Chain-of-Custody',
    description: 'Every handoff is documented with timestamped photos and signatures, so cargo, specimen, and document custody is provable end to end.',
  },
  {
    icon: FileSearch,
    label: 'Contracts',
    title: 'Contracts & SAM.gov Matching',
    description: 'Surface active government contract opportunities directly from SAM.gov, matched to your NAICS codes and service area.',
  },
  {
    icon: Calculator,
    label: 'Finances',
    title: 'Finances, Mileage & IFTA',
    description: 'Track cost-per-mile and profit-per-run, log mileage automatically, and generate IFTA reports in minutes instead of hours.',
  },
  {
    icon: Sparkles,
    label: 'AI Assistant',
    title: 'AI Assistant & Anomaly Detection',
    description: 'An AI assistant watches your operations for anomalies — missed pickups, compliance gaps, unusual costs — and flags them before they become problems.',
  },
  {
    icon: Smartphone,
    label: 'Driver Tools',
    title: 'Driver Mobile Tools',
    description: 'Drivers get pre/post-trip vehicle inspections, compliance status, and their full run history — all from one mobile-first app.',
  },
]

export default function FeatureTabs() {
  const [active, setActive] = useState(0)
  const current = TABS[active]

  return (
    <div className="px-5 py-16 md:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            One Platform for Every Part of the Operation
          </h3>
          <p className="text-white/50 mt-3 max-w-xl mx-auto">
            From dispatch to compliance reporting, Convoy covers what a logistics
            or courier company actually runs on.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {TABS.map((tab, i) => {
            const Icon = tab.icon
            const isActive = i === active
            return (
              <button
                key={tab.label}
                onClick={() => setActive(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${isActive ? 'bg-brand-600 text-white shadow' : 'text-white/40 hover:text-white/60 bg-navy-800'}`}
              >
                <Icon size={16} className={isActive ? 'text-white' : 'text-white/40'} />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="bg-navy-700 rounded-2xl p-8 border border-white/[0.08] max-w-2xl mx-auto text-center">
          <current.icon size={28} className="text-brand-300 mx-auto mb-4" />
          <h4 className="text-xl font-bold text-white mb-2">{current.title}</h4>
          <p className="text-white/60 leading-relaxed">{current.description}</p>
        </div>
      </div>
    </div>
  )
}
