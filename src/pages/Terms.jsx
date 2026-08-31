// AI-drafted 2026-08-31 alongside Privacy.jsx, prompted by real payments
// now flowing with no stated cancellation/refund policy anywhere. Not
// reviewed by an attorney - review before treating this as final. The
// refund policy below (14-day money-back on a first purchase, no proration
// after) is a reasonable default, not a fixed decision - change it here if
// a different policy is chosen. Update "Last updated" whenever this changes.
// Contact address is a temporary stand-in (spenag20@gmail.com) - swap for
// a real support@vantar.tech once that inbox actually exists; the domain
// is only verified for sending via Resend right now, not receiving.
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

export default function Terms() {
  return (
    <div className="bg-navy-900 min-h-screen">
      <div className="max-w-2xl mx-auto px-5 py-12 space-y-8">
        <Link to="/"><Logo size="lg" /></Link>

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-fg tracking-tight">Terms of Service</h1>
          <p className="text-fg/40 text-xs mt-1">Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="Agreement">
          <p>
            These terms govern your use of Vantar. By creating an account, accepting an
            invitation to join a company's account, or purchasing a subscription, you agree
            to these terms on behalf of yourself and, if applicable, the company you
            represent.
          </p>
        </Section>

        <Section title="The service">
          <p>
            Vantar is a dispatch, compliance, and reporting platform for logistics and
            courier companies. Features and plan availability may change over time as the
            product develops.
          </p>
        </Section>

        <Section title="Accounts">
          <p>
            Vantar accounts are created either by purchasing a subscription or by invitation
            from a company owner or dispatcher. You're responsible for keeping your login
            credentials secure and for activity that happens under your account. A company
            owner is responsible for the accounts of the team members they invite.
          </p>
        </Section>

        <Section title="Subscriptions and billing">
          <p>
            Vantar is offered on a Standard plan ($49/month or $490/year) and a Government
            plan ($99/month or $990/year, which adds automatic SAM.gov contract matching).
            Subscriptions are billed in advance and renew automatically for the same term
            until canceled. Payment is processed by Stripe; we don't store your card details.
          </p>
        </Section>

        <Section title="Referral program">
          <p>
            If you refer another company to Vantar and they subscribe to a paid plan, we'll
            apply one free month to your own subscription once their subscription has been
            active for at least 30 days. Referral credit is applied manually — let us know
            who you referred by emailing us so we can confirm and apply it. A referral must
            be a genuine new customer who wasn't already in conversation with us; we reserve
            the right to decline credit for referrals that don't meet that bar, and to change
            or end this program at any time.
          </p>
        </Section>

        <Section title="Cancellation and refunds">
          <p>
            You can cancel your subscription at any time from the Billing tab in Settings.
            Cancellation takes effect at the end of your current billing period — you keep
            access until then, and we don't provide prorated refunds for the unused portion
            of a period you cancel mid-cycle.
          </p>
          <p>
            If you're not satisfied within the first 14 days of your <em>initial</em>{' '}
            subscription purchase, contact us for a full refund.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>
            You agree to use Vantar only for lawful business purposes, not to attempt to
            access another company's data, and not to interfere with the platform's normal
            operation.
          </p>
        </Section>

        <Section title="Your data">
          <p>
            You and your company retain ownership of the data you enter into Vantar (runs,
            driver records, financial records, photos, and everything else). We only use it
            to provide the service to you, as described in our{' '}
            <Link to="/privacy" className="text-brand-300 underline">Privacy Policy</Link>.
          </p>
        </Section>

        <Section title="Vantar's intellectual property">
          <p>
            The Vantar platform, software, and branding are our property. These terms don't
            grant you any rights to them beyond using the service as intended.
          </p>
        </Section>

        <Section title="Disclaimer and limitation of liability">
          <p>
            Vantar is provided "as is." We work to keep it reliable and accurate, but we
            don't guarantee it will be error-free or uninterrupted, and we're not liable for
            indirect or consequential damages arising from your use of it, to the maximum
            extent permitted by law. Vantar is a tool to help manage your operations — you're
            responsible for verifying compliance, contract, and regulatory obligations that
            apply to your business.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            We may suspend or terminate an account that violates these terms or is used for
            unlawful purposes. You can stop using Vantar and cancel your subscription at any
            time.
          </p>
        </Section>

        <Section title="Governing law">
          <p>These terms are governed by the laws of the State of Maryland.</p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            If we make material changes to these terms, we'll update the date above and, for
            significant changes, notify account owners directly.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about these terms can be sent to{' '}
            <a href="mailto:spenag20@gmail.com" className="text-brand-300 underline">spenag20@gmail.com</a>.
          </p>
        </Section>

        <Link to="/" className="inline-block text-fg/40 text-sm hover:text-fg/60 transition-colors pt-4">
          ← Back to Vantar
        </Link>
      </div>
    </div>
  )
}
