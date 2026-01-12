import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs';
import { useTheme } from '../../context/ThemeContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const navRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Only animate once on mount
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // Animate navbar on mount
    anime({
      targets: navRef.current,
      translateY: [-20, 0],
      opacity: [0, 1],
      duration: 800,
      easing: 'easeOutExpo',
    });
  }, []);

  const handleTryThis = () => {
    // Animate before navigation
    anime({
      targets: '.tryThisBtn',
      scale: [1, 0.95, 1.05, 1],
      duration: 400,
      easing: 'easeInOutQuad',
      complete: () => navigate('/game'),
    });
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <nav ref={navRef} className={styles.navbar}>
      <div className={styles.logo} onClick={scrollToTop} style={{ cursor: 'pointer' }}>
        <span className={styles.logoText}>SafeForest</span>
      </div>

      <div className={styles.navLinks}>
        <a href="#about" className={styles.navLink}>About</a>
        <a href="#demo" className={styles.navLink}>Demo</a>
        <a href="#contact" className={styles.navLink}>Contact</a>
      </div>

      <div className={styles.navActions}>
        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        <button
          className={`${styles.tryThisBtn} tryThisBtn`}
          onClick={handleTryThis}
        >
          Try this!
        </button>
      </div>
    </nav>
  );
}
