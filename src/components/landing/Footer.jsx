import { MapPin } from 'lucide-react'
import Logo from '../ui/Logo'

export default function Footer() {
  return (
    <footer className="border-t border-fg/[0.07] px-5 py-10">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo size="sm" />
        <div className="flex items-center gap-2 text-fg/50 text-sm">
          <MapPin size={15} className="text-brand-300 shrink-0" />
          <span>Based in Maryland</span>
        </div>
        <span className="text-fg/30 text-xs">© {new Date().getFullYear()} Vantar. All rights reserved.</span>
      </div>
    </footer>
  )
}
