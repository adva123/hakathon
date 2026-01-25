import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import HeroSection from '../components/home/HeroSection';
import TrustBadges from '../components/home/TrustBadges';
import FeaturesShowcase from '../components/home/FeaturesShowcase';
import LearningModulesGrid from '../components/home/LearningModulesGrid';
import StatsCounter from '../components/home/StatsCounter';
import TestimonialsSection from '../components/home/TestimonialsSection';
import FinalCTA from '../components/home/FinalCTA';
import styles from './HomePage.module.css';

export default function HomePage() {
  return (
    <div className={styles.homePage}>
      <Navbar />
      <main>
        <HeroSection />
        <TrustBadges />
        <FeaturesShowcase />
        <LearningModulesGrid />
        <StatsCounter />
        <TestimonialsSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
