import Reveal from './Reveal'

export default function Mission() {
  return (
    <div className="px-5 py-16 md:py-24 border-t border-fg/[0.07]">
      <Reveal className="max-w-3xl mx-auto text-center">
        <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-4">Our Mission</p>
        <h3 className="text-2xl md:text-4xl font-black text-fg tracking-tight leading-tight">
          Every hour lost to paperwork is an hour taken from running your business.
        </h3>
        <p className="text-fg/60 text-base md:text-lg mt-5 leading-relaxed">
          Vantar automates dispatch, compliance, and reporting so you spend less time on
          busywork and more time on what actually grows your company: the operations, not
          the admin behind them. Save time, save money, get back to work.
        </p>
      </Reveal>
    </div>
  )
}
