// Wordmark, used at every brand touchpoint (Sidebar, TopBar, Hero, Footer,
// Login, Onboarding, VerifyMfa). The icon badge is disabled for now (see
// commented-out block below) until a proper logo mark is settled on -
// uncomment it to bring it back, same geometry as public/favicon.svg and
// the PWA icons.
const SIZES = {
  sm: { badge: 'w-[22px] h-[22px] rounded-md', v: 11, text: 'text-lg', gap: 'gap-2' },
  md: { badge: 'w-[26px] h-[26px] rounded-md', v: 13, text: 'text-xl', gap: 'gap-2' },
  lg: { badge: 'w-[30px] h-[30px] rounded-lg', v: 15, text: 'text-2xl', gap: 'gap-2.5' },
  xl: { badge: 'w-[38px] h-[38px] rounded-lg', v: 19, text: 'text-3xl', gap: 'gap-3' },
  '2xl': { badge: 'w-[44px] h-[44px] rounded-xl', v: 22, text: 'text-4xl', gap: 'gap-3' },
}

export default function Logo({ size = 'md', className = '' }) {
  const s = SIZES[size] ?? SIZES.md
  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      {/* <span className={`shrink-0 bg-brand-600 flex items-center justify-center ${s.badge}`}>
        <svg width={s.v} height={s.v * 272 / 230} viewBox="165 125 230 272" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M180,140 L344,140 A36,36 0 0 1 380,176 L380,189 A36,36 0 0 1 344,225 L180,225 L250,182.5 Z" fill="#fff" />
          <path d="M260,243 L350,243 A30,30 0 0 1 380,273 L380,283 A30,30 0 0 1 350,313 L260,313 L315,278 Z" fill="#fff" />
          <circle cx="325" cy="358" r="24" fill="#fff" />
        </svg>
      </span> */}
      <span className={`font-black text-fg tracking-tight ${s.text}`}>VANTAR</span>
    </span>
  )
}
