// AI-drafted 2026-08-31 to back up privacy claims already made in outreach
// copy ("your data stays private, never sold or shared"). Not reviewed by
// an attorney - review before treating this as final, especially now that
// real payments and real customer business data are flowing through the
// app. Update the "Last updated" date below whenever this content changes.
// privacy@vantar.tech forwards to a real inbox via ImprovMX (set up
// 2026-08-31), so this is a live, working address.
import { Link } from 'react-router-dom'
import Logo from '../components/ui/Logo'

const LAST_UPDATED = 'August 31, 2026'

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold text-fg">{title}</h2>
      <div className="text-fg/65 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function Privacy() {
  return (
    <div className="bg-navy-900 min-h-screen">
      <div className="max-w-2xl mx-auto px-5 py-12 space-y-8">
        <Link to="/"><Logo size="lg" /></Link>

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-fg tracking-tight">Privacy Policy</h1>
          <p className="text-fg/40 text-xs mt-1">Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="Overview">
          <p>
            Vantar is a dispatch and compliance platform built for logistics and courier
            companies. This policy explains what information we collect through the app and
            the public site, how we use it, and who we share it with. We do not sell your
            data, and we do not use it for advertising.
          </p>
        </Section>

        <Section title="Information we collect">
          <p><strong className="text-fg/80">Account and company information:</strong> your
          name, email, phone, and address; your company's name, UEI, CAGE code, NAICS codes,
          SDVOSB status, and SAM.gov registration details, if provided.</p>
          <p><strong className="text-fg/80">Operational data your company enters:</strong>{' '}
          runs and dispatch records, driver compliance and vehicle inspection records,
          mileage logs, delivery and chain-of-custody photos, team messages, revenue and
          expense entries, invoices, and IFTA reporting data.</p>
          <p><strong className="text-fg/80">Payment information:</strong> subscription
          payments are processed by Stripe. We never receive or store your card number —
          only a reference to your Stripe customer and subscription.</p>
          <p><strong className="text-fg/80">Demo requests:</strong> if you submit the "Request
          a Demo" form, we collect the name, email, company, and message you provide.</p>
          <p><strong className="text-fg/80">Usage data:</strong> basic, aggregated analytics
          (pages visited, load performance) collected via Vercel Analytics and Speed
          Insights. This data is not tied to your identity for marketing purposes.</p>
        </Section>

        <Section title="How your data is isolated">
          <p>
            Every company's data is scoped at the database level so that one company can
            never read another company's runs, drivers, finances, or any other record — this
            isn't just an application-level rule, it's enforced by row-level security on the
            database itself.
          </p>
        </Section>

        <Section title="Who we share information with">
          <p>
            We use a small number of service providers to run Vantar, each of whom only
            receives the data necessary to perform their function, and none of whom are
            permitted to use it for their own purposes:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Supabase — database, authentication, and file storage</li>
            <li>Stripe — payment processing and billing</li>
            <li>Resend — transactional email (invites, notifications)</li>
            <li>Vercel — hosting and site analytics</li>
            <li>Anthropic — powers the in-app AI assistant feature</li>
          </ul>
          <p>
            If your company uses SAM.gov contract matching, we query SAM.gov's public data
            using your NAICS codes to surface opportunities — this only reads public
            government contract listings, it does not send your company's private data to
            SAM.gov.
          </p>
          <p>
            We do not sell your data to anyone, and we do not share it with third parties for
            their own marketing or advertising purposes.
          </p>
        </Section>

        <Section title="Data retention and deletion">
          <p>
            We retain your data for as long as your account is active. If you cancel your
            subscription or want your data deleted, contact us and we'll delete your company's
            data, other than what we're required to retain for legal, tax, or accounting
            purposes.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You can request a copy of your data or request that it be deleted at any time by
            contacting us. If you're a driver or team member added by a company, that
            company controls your account and can request changes or removal on your behalf.
          </p>
        </Section>

        <Section title="Children's privacy">
          <p>
            Vantar is a business tool intended for use by adults operating a company. It is
            not directed at, and we do not knowingly collect information from, anyone under 18.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make material changes to this policy, we'll update the date above and, for
            significant changes, notify account owners directly.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about this policy or your data can be sent to{' '}
            <a href="mailto:privacy@vantar.tech" className="text-brand-300 underline">privacy@vantar.tech</a>.
          </p>
        </Section>

        <Link to="/" className="inline-block text-fg/40 text-sm hover:text-fg/60 transition-colors pt-4">
          ← Back to Vantar
        </Link>
      </div>
    </div>
  )
}
