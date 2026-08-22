import { ShieldCheck, BadgeCheck, FileCheck, Landmark } from 'lucide-react'

const CREDENTIALS = [
  { icon: ShieldCheck, label: 'SDVOSB Certified' },
  { icon: Landmark, label: 'VA · DoD · HHS Contract Vehicles' },
  { icon: FileCheck, label: 'SAM.gov Integrated' },
  { icon: BadgeCheck, label: 'Chain-of-Custody Compliant' },
]

export default function CredentialsStrip() {
  return (
    <div className="border-y border-white/[0.07] bg-navy-800/50">
      <div className="max-w-5xl mx-auto px-5 py-6">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {CREDENTIALS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-white/70">
              <Icon size={18} className="text-brand-300 shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
