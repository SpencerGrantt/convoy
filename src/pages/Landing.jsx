import Hero from '../components/landing/Hero'
import CredentialsStrip from '../components/landing/CredentialsStrip'
import Mission from '../components/landing/Mission'
import FeatureTabs from '../components/landing/FeatureTabs'
import HowItWorks from '../components/landing/HowItWorks'
import Pricing from '../components/landing/Pricing'
import DemoForm from '../components/landing/DemoForm'
import Footer from '../components/landing/Footer'

export default function Landing() {
  return (
    <div className="bg-navy-900 min-h-screen">
      <Hero />
      <CredentialsStrip />
      <Mission />
      <FeatureTabs />
      <HowItWorks />
      <Pricing />
      <DemoForm />
      <Footer />
    </div>
  )
}
