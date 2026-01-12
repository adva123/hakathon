import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import HeroSection from '../components/home/HeroSection';
import AboutSection from '../components/home/AboutSection';
import DemoSection from '../components/home/DemoSection';
import styles from './HomePage.module.css';

export default function HomePage() {
  return (
    <div className={styles.homePage}>
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <DemoSection />
      </main>
      <Footer />
    </div>
  );
}
