import { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown } from 'lucide-react'

const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
  ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
]

// Filter-button dropdown for the two-letter state filters on Contracts —
// replaces free-text inputs that sat inline in the search-bar rows and read
// as part of the search query rather than a separate filter (users kept
// typing full state names or misreading it as a required field).
export default function StateFilterDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function pick(code) {
    onChange(code)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
          value ? 'bg-brand-500/20 border-brand-500/40 text-brand-200' : 'bg-navy-800 border-white/10 text-white/50'
        }`}
      >
        <MapPin size={13} />
        {value || 'All States'}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 max-h-72 overflow-y-auto bg-navy-700 border border-white/[0.1] rounded-2xl shadow-xl z-30 py-1.5">
          <button
            type="button"
            onClick={() => pick('')}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors ${!value ? 'text-brand-300 font-semibold' : 'text-white/70'}`}
          >
            All States
          </button>
          {US_STATES.map(([code, name]) => (
            <button
              type="button"
              key={code}
              onClick={() => pick(code)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors ${value === code ? 'text-brand-300 font-semibold' : 'text-white/70'}`}
            >
              {name} <span className="text-white/30">({code})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
