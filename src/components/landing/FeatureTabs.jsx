import { useState } from 'react'
import {
  Radio, Camera, FileSearch, Calculator, Sparkles, Smartphone,
  MessageSquare, Wrench, FileSpreadsheet, Users,
} from 'lucide-react'
import Reveal from './Reveal'
import dispatchImg from '../../assets/landing/feature-dispatch.jpg'
import runDetailImg from '../../assets/landing/feature-run-detail.png'
import contractsImg from '../../assets/landing/feature-contracts.jpg'
import financesImg from '../../assets/landing/feature-finances.jpg'
import analyticsImg from '../../assets/landing/feature-analytics.png'
import iftaImg from '../../assets/landing/feature-ifta.jpg'
import aiImg from '../../assets/landing/feature-ai.jpg'
import driverImg from '../../assets/landing/feature-driver.jpg'
import driverDashImg from '../../assets/landing/feature-driver-dashboard.png'

const TABS = [
  {
    icon: Radio,
    label: 'Dispatch & Tracking',
    title: 'Real-Time Dispatch & Tracking',
    description: 'Send run details straight to a driver\'s phone and follow every pickup and delivery live, with automatic status updates along the way.',
    images: [{ src: dispatchImg, label: 'Runs' }],
  },
  {
    icon: Camera,
    label: 'Chain-of-Custody',
    title: 'Photo-Verified Chain-of-Custody',
    description: 'Every handoff is documented with timestamped photos and signatures, so cargo, specimen, and document custody is provable end to end.',
    images: [{ src: runDetailImg, label: 'Run Detail' }],
  },
  {
    icon: FileSearch,
    label: 'Contracts',
    title: 'Contracts & SAM.gov Matching',
    description: 'Surface active government contract opportunities directly from SAM.gov, matched to your NAICS codes and service area.',
    images: [{ src: contractsImg, label: 'Contracts' }],
  },
  {
    icon: Calculator,
    label: 'Finances',
    title: 'Finances, Analytics & IFTA',
    description: 'Track cost-per-mile and profit-per-run, switch between chart views on every revenue and expense breakdown, and generate IFTA reports in minutes instead of hours.',
    images: [
      { src: financesImg, label: 'Overview' },
      { src: analyticsImg, label: 'Analytics' },
      { src: iftaImg, label: 'IFTA Report' },
    ],
  },
  {
    icon: Sparkles,
    label: 'AI Assistant',
    title: 'AI Assistant & Anomaly Detection',
    description: 'An AI assistant watches your operations for anomalies, like missed pickups, compliance gaps, and unusual costs, and flags them before they become problems.',
    images: [{ src: aiImg, label: 'Assistant' }],
  },
  {
    icon: Smartphone,
    label: 'Driver Tools',
    title: 'Driver Mobile Tools',
    description: 'Drivers get pre/post-trip vehicle inspections, compliance status, and their full run history, all from one mobile-first app.',
    images: [
      { src: driverDashImg, label: 'Dashboard' },
      { src: driverImg, label: 'Inspection' },
    ],
  },
]

const MORE_FEATURES = [
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
  const [imageIndex, setImageIndex] = useState(0)
  const current = TABS[active]
  const currentImage = current.images[imageIndex] ?? current.images[0]

  function selectTab(i) {
    setActive(i)
    setImageIndex(0)
  }

  return (
    <div className="px-5 py-16 md:py-24">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-10">
          <h3 className="text-2xl md:text-3xl font-black text-fg tracking-tight">
            One Platform for Every Part of the Operation
          </h3>
          <p className="text-fg/50 mt-3 max-w-xl mx-auto">
            From dispatch to compliance reporting, Vantar covers what a logistics
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
                onClick={() => selectTab(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${isActive ? 'bg-brand-600 text-white shadow-sm shadow-brand-900/20 scale-[1.03]' : 'text-fg/40 hover:text-fg/60 hover:scale-[1.03] bg-navy-800'}`}
              >
                <Icon size={16} className={isActive ? 'text-white' : 'text-fg/40'} />
                {tab.label}
              </button>
            )
          })}
        </Reveal>

        <Reveal delay={200}>
          <div
            key={active}
            className="bg-navy-700 rounded-2xl border border-fg/[0.08] shadow-xl shadow-black/[0.06] animate-fadeIn overflow-hidden"
          >
            <div className="relative aspect-[4/3] bg-navy-800 flex items-center justify-center overflow-hidden">
              <img
                key={currentImage.src}
                src={currentImage.src}
                alt={currentImage.label}
                className="w-full h-full object-contain"
              />
            </div>

            {current.images.length > 1 && (
              <div className="flex items-center gap-1.5 px-4 py-3 bg-navy-800 border-t border-fg/[0.06]">
                {current.images.map((img, i) => (
                  <button
                    key={img.label}
                    onClick={() => setImageIndex(i)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      imageIndex === i ? 'bg-brand-600 text-white' : 'text-fg/40 hover:text-fg/70 bg-navy-900/60'
                    }`}
                  >
                    {img.label}
                  </button>
                ))}
              </div>
            )}

            <div className="p-6 md:p-8 border-t border-fg/[0.08]">
              <current.icon size={24} className="text-brand-300 mb-3" />
              <h4 className="text-xl md:text-2xl font-bold text-fg mb-2">{current.title}</h4>
              <p className="text-fg/60 leading-relaxed">{current.description}</p>
            </div>
          </div>
          <p className="text-center text-fg/30 text-xs mt-3">
            Screenshots show sample data for demonstration purposes only.
          </p>
        </Reveal>

        <Reveal delay={250} className="mt-14">
          <p className="text-center text-xs font-semibold text-fg/40 uppercase tracking-wide mb-6">
            Also Built In
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto">
            {MORE_FEATURES.map(f => {
              const Icon = f.icon
              return (
                <div
                  key={f.label}
                  className="bg-navy-800 rounded-xl border border-fg/[0.07] p-4 shadow-sm shadow-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10 hover:border-brand-600/25"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon size={15} className="text-brand-300 shrink-0" />
                    <p className="text-sm font-semibold text-fg">{f.label}</p>
                  </div>
                  <p className="text-xs text-fg/50 leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </div>
  )
}
