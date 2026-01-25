import { useRef, useEffect, useState } from 'react';
import styles from './TrustBadges.module.css';

export default function TrustBadges() {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const technologies = [
    { name: 'Three.js', icon: '🎮' },
    { name: 'MediaPipe', icon: '👋' },
    { name: 'React', icon: '⚛️' },
    { name: 'Google OAuth', icon: '🔐' },
    { name: 'MySQL', icon: '🗄️' },
    { name: 'OpenAI', icon: '🤖' },
  ];

  return (
    <section
      ref={containerRef}
      className={`${styles.trustBadges} ${isVisible ? styles.visible : ''}`}
    >
      <div className={styles.container}>
        <p className={styles.label}>Built with industry-leading technologies</p>
        <div className={styles.logoGrid}>
          {technologies.map((tech, index) => (
            <div
              key={tech.name}
              className={styles.logoCard}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <span className={styles.logoIcon}>{tech.icon}</span>
              <span className={styles.logoName}>{tech.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
