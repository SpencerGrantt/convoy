import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
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
        <div className="flex items-center gap-4 text-fg/40 text-xs">
          <Link to="/privacy" className="hover:text-fg/60 transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-fg/60 transition-colors">Terms of Service</Link>
          <span className="text-fg/30">© {new Date().getFullYear()} Vantar. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
