// Icon + wordmark lockup — the V mark (same geometry as public/favicon.svg
// and the PWA icons) rendered inline so it's crisp at any size, paired with
// the VANTAR wordmark. Replaces what used to be plain text at every brand
// touchpoint (Sidebar, TopBar, Hero, Footer, Login, Onboarding, VerifyMfa).
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
      <span className={`shrink-0 bg-brand-600 flex items-center justify-center ${s.badge}`}>
        <svg width={s.v} height={s.v} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="148,150 256,400 364,150 294,150 256,334 218,150" fill="#fff" />
        </svg>
      </span>
      <span className={`font-black text-fg tracking-tight ${s.text}`}>VANTAR</span>
    </span>
  )
}
