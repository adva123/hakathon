import { useNavigate } from 'react-router-dom';
import anime from 'animejs';
import { useRef } from 'react';
import styles from './FinalCTA.module.css';

export default function FinalCTA() {
  const navigate = useNavigate();
  const primaryBtnRef = useRef(null);
  const secondaryBtnRef = useRef(null);

  const handlePrimaryClick = () => {
    anime({
      targets: primaryBtnRef.current,
      scale: [1, 0.95, 1.05, 1],
      duration: 400,
      easing: 'easeInOutQuad',
      complete: () => navigate('/login'),
    });
  };

  const handleSecondaryClick = () => {
    anime({
      targets: secondaryBtnRef.current,
      scale: [1, 0.95, 1.05, 1],
      duration: 400,
      easing: 'easeInOutQuad',
      complete: () => {
        // Scroll to demo section or show demo modal
        const demoSection = document.getElementById('demo');
        if (demoSection) {
          demoSection.scrollIntoView({ behavior: 'smooth' });
        }
      },
    });
  };

  return (
    <section className={styles.finalCTA}>
      <div className={styles.gradientBg}></div>

      <div className={styles.content}>
        <div className={styles.eyebrow}>EXPLORE A NEW DIMENSION</div>

        <h2 className={styles.headline}>
          Ready to unlock your{' '}
          <span className={styles.highlight}>cybersecurity potential</span>
          {' '}and protect what matters most?
        </h2>

        <p className={styles.description}>
          Join thousands of learners mastering digital security through immersive gameplay.
          Your journey to becoming a cyber-guardian starts here.
        </p>

        <div className={styles.ctaButtons}>
          <button
            ref={primaryBtnRef}
            className={styles.primaryButton}
            onClick={handlePrimaryClick}
          >
            Join for Free
            <span className={styles.arrow}>→</span>
          </button>

          <button
            ref={secondaryBtnRef}
            className={styles.secondaryButton}
            onClick={handleSecondaryClick}
          >
            Watch Demo
            <span className={styles.playIcon}>▶</span>
          </button>
        </div>
      </div>

      {/* Floating particles */}
      <div className={styles.particles}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className={styles.particle}></div>
        ))}
      </div>
    </section>
  );
}
