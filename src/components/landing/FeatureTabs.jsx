import { useState } from 'react'
import { Radio, Camera, FileSearch, Calculator, Sparkles, Smartphone } from 'lucide-react'
import Reveal from './Reveal'
import dispatchImg from '../../assets/landing/feature-dispatch.jpg'
import custodyImg from '../../assets/landing/feature-custody.jpg'
import contractsImg from '../../assets/landing/feature-contracts.jpg'
import financesImg from '../../assets/landing/feature-finances.jpg'
import aiImg from '../../assets/landing/feature-ai.jpg'
import driverImg from '../../assets/landing/feature-driver.jpg'

const TABS = [
  {
    icon: Radio,
    label: 'Dispatch & Tracking',
    title: 'Real-Time Dispatch & Tracking',
    description: 'Send run details straight to a driver\'s phone and follow every pickup and delivery live, with automatic status updates along the way.',
    image: dispatchImg,
  },
  {
    icon: Camera,
    label: 'Chain-of-Custody',
    title: 'Photo-Verified Chain-of-Custody',
    description: 'Every handoff is documented with timestamped photos and signatures, so cargo, specimen, and document custody is provable end to end.',
    image: custodyImg,
  },
  {
    icon: FileSearch,
    label: 'Contracts',
    title: 'Contracts & SAM.gov Matching',
    description: 'Surface active government contract opportunities directly from SAM.gov, matched to your NAICS codes and service area.',
    image: contractsImg,
  },
  {
    icon: Calculator,
    label: 'Finances',
    title: 'Finances, Mileage & IFTA',
    description: 'Track cost-per-mile and profit-per-run, log mileage automatically, and generate IFTA reports in minutes instead of hours.',
    image: financesImg,
  },
  {
    icon: Sparkles,
    label: 'AI Assistant',
    title: 'AI Assistant & Anomaly Detection',
    description: 'An AI assistant watches your operations for anomalies, like missed pickups, compliance gaps, and unusual costs, and flags them before they become problems.',
    image: aiImg,
  },
  {
    icon: Smartphone,
    label: 'Driver Tools',
    title: 'Driver Mobile Tools',
    description: 'Drivers get pre/post-trip vehicle inspections, compliance status, and their full run history, all from one mobile-first app.',
    image: driverImg,
  },
]

export default function FeatureTabs() {
  const [active, setActive] = useState(0)
  const current = TABS[active]

  return (
    <div className="px-5 py-16 md:py-24">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-10">
          <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            One Platform for Every Part of the Operation
          </h3>
          <p className="text-white/50 mt-3 max-w-xl mx-auto">
            From dispatch to compliance reporting, Convoy covers what a logistics
            or courier company actually runs on.
          </p>
        </Reveal>

        <Reveal delay={100} className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {TABS.map((tab, i) => {
            const Icon = tab.icon
            const isActive = i === active
            return (
              <button
                key={tab.label}
                onClick={() => setActive(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${isActive ? 'bg-brand-600 text-white shadow scale-[1.03]' : 'text-white/40 hover:text-white/60 hover:scale-[1.03] bg-navy-800'}`}
              >
                <Icon size={16} className={isActive ? 'text-white' : 'text-white/40'} />
                {tab.label}
              </button>
            )
          })}
        </Reveal>

        <Reveal delay={200}>
          <div
            key={active}
            className="bg-navy-700 rounded-2xl border border-white/[0.08] max-w-4xl mx-auto overflow-hidden animate-fadeIn"
          >
            <div className="aspect-[16/9] bg-navy-800">
              <img
                src={current.image}
                alt={current.title}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="p-6 md:p-8 text-center">
              <current.icon size={24} className="text-brand-300 mx-auto mb-3" />
              <h4 className="text-xl font-bold text-white mb-2">{current.title}</h4>
              <p className="text-white/60 leading-relaxed max-w-xl mx-auto">{current.description}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
