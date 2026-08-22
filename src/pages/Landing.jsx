import Hero from '../components/landing/Hero'
import CredentialsStrip from '../components/landing/CredentialsStrip'
import FeatureTabs from '../components/landing/FeatureTabs'
import HowItWorks from '../components/landing/HowItWorks'
import Pricing from '../components/landing/Pricing'
import DemoForm from '../components/landing/DemoForm'

export default function Landing() {
  return (
    <div className="bg-navy-900 min-h-screen">
      <Hero />
      <CredentialsStrip />
      <FeatureTabs />
      <HowItWorks />
      <Pricing />
      <DemoForm />
    </div>
  )
}
