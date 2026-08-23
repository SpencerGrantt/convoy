import { useState } from 'react'
import {
  Radio, Camera, FileSearch, Calculator, Sparkles, Smartphone,
  MessageSquare, Wrench, FileSpreadsheet, Users, BarChart3, Map, Maximize2,
} from 'lucide-react'
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

const MORE_FEATURES = [
  {
    icon: BarChart3,
    label: 'Custom Analytics',
    description: 'Switch between line, bar, area, and pie views on every revenue and expense breakdown.',
  },
  {
    icon: Map,
    label: 'IFTA Reporting',
    description: 'Quarterly mileage by jurisdiction, ready to export straight to your filing software.',
  },
  {
    icon: MessageSquare,
    label: 'Team Messaging',
    description: 'Keep dispatch and drivers on the same page without leaving the app.',
  },
  {
    icon: Wrench,
    label: 'Fleet Controls',
    description: 'Track vehicles, registrations, and maintenance history in one place.',
  },
  {
    icon: FileSpreadsheet,
    label: 'CSV Import & Export',
    description: 'Bring in fuel cards and mileage trackers, export reports whenever you need them.',
  },
  {
    icon: Users,
    label: 'Team Roles',
    description: 'Owner, dispatcher, and driver permissions, scoped to what each person needs.',
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
            className="bg-navy-700 rounded-2xl border border-white/[0.08] max-w-5xl mx-auto overflow-hidden animate-fadeIn grid grid-cols-1 md:grid-cols-2"
          >
            <div className="group relative aspect-[16/10] md:aspect-auto bg-navy-800 md:order-1 overflow-hidden cursor-zoom-in">
              <img
                src={current.image}
                alt={current.title}
                className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Maximize2 size={15} className="text-white" />
                </div>
              </div>
            </div>
            <div className="p-6 md:p-10 md:order-2 flex flex-col justify-center">
              <current.icon size={24} className="text-brand-300 mb-3" />
              <h4 className="text-xl md:text-2xl font-bold text-white mb-2">{current.title}</h4>
              <p className="text-white/60 leading-relaxed">{current.description}</p>
            </div>
          </div>
          <p className="text-center text-white/30 text-xs mt-3">
            Screenshots show sample data for demonstration purposes only.
          </p>
        </Reveal>

        <Reveal delay={250} className="mt-14">
          <p className="text-center text-xs font-semibold text-white/40 uppercase tracking-wide mb-6">
            Also Built In
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-5xl mx-auto">
            {MORE_FEATURES.map(f => {
              const Icon = f.icon
              return (
                <div
                  key={f.label}
                  className="bg-navy-800 rounded-xl border border-white/[0.07] p-4"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon size={15} className="text-brand-300 shrink-0" />
                    <p className="text-sm font-semibold text-white">{f.label}</p>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </div>
  )
}
