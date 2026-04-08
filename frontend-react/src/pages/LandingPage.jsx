// Components
import Navigation from '../components/LandingPage/Navigation';
import Hero from '../components/LandingPage/Hero';
import Features from '../components/LandingPage/Features';
import HowItWorks from '../components/LandingPage/HowItWorks';
import Targets from '../components/LandingPage/Targets';
import Benefits from '../components/LandingPage/Benefits';
import Roadmap from '../components/LandingPage/Roadmap';
import CallToAction from '../components/LandingPage/CallToAction';
import Footer from '../components/LandingPage/Footer';

// Hooks
import useGlobalAnimations from '../hooks/useGlobalAnimations';

const LandingPage = () => {
  // Initialize scroll observers for the landing page elements
  useGlobalAnimations();

  return (
    <>
      <Navigation />
      <Hero />
      <Features />
      <Targets />
      <HowItWorks />
      <Benefits />
      <Roadmap />
      <CallToAction />
      <Footer />
    </>
  );
};

export default LandingPage;
