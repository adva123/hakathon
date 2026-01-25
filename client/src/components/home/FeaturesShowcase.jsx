import { useRef, useEffect, useState } from 'react';
import styles from './FeaturesShowcase.module.css';

export default function FeaturesShowcase() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      title: 'Password Security',
      description: 'Learn to create unbreakable passwords through interactive challenges. Test password strength in real-time and discover common vulnerabilities.',
      icon: '🔐',
      color: 'var(--portal-cyan)',
    },
    {
      title: 'Privacy Protection',
      description: 'Master data privacy concepts with hands-on scenarios. Understand tracking, cookies, and how to protect your digital footprint.',
      icon: '🛡️',
      color: 'var(--forest-emerald)',
    },
    {
      title: 'Gesture Controls',
      description: 'Navigate through the cyber-forest using intuitive hand gestures powered by MediaPipe AI. Experience cutting-edge interaction technology.',
      icon: '👋',
      color: 'var(--portal-purple)',
    },
    {
      title: 'AI Companions',
      description: 'Generate unique AI-powered companion dolls that guide you through challenges. Each companion is personalized to your learning journey.',
      icon: '🤖',
      color: 'var(--portal-pink)',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className={`${styles.featuresShowcase} ${isVisible ? styles.visible : ''}`}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Why SafeForest?</h2>
          <p className={styles.subheading}>
            Immersive learning meets cutting-edge technology in a gamified cybersecurity adventure
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`${styles.feature} ${index % 2 === 1 ? styles.reverse : ''}`}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className={styles.featureVisual}>
                <div
                  className={styles.iconWrapper}
                  style={{ '--feature-color': feature.color }}
                >
                  <span className={styles.featureIcon}>{feature.icon}</span>
                </div>
              </div>

              <div className={styles.featureContent}>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
