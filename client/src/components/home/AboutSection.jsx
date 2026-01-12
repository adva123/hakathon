import { useRef, useEffect } from 'react';
import anime from 'animejs';
import styles from './AboutSection.module.css';

export default function AboutSection() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const cardsRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;

            anime({
              targets: titleRef.current,
              translateY: [40, 0],
              opacity: [0, 1],
              duration: 800,
              easing: 'easeOutExpo',
            });

            anime({
              targets: cardsRef.current?.children,
              translateY: [60, 0],
              opacity: [0, 1],
              duration: 800,
              delay: anime.stagger(150),
              easing: 'easeOutExpo',
            });

            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: '🔐',
      title: 'Password Security',
      description: 'Learn to create strong passwords and understand common vulnerabilities through interactive challenges.',
    },
    {
      icon: '🛡️',
      title: 'Privacy Protection',
      description: 'Master data protection techniques and learn how to keep your personal information safe online.',
    },
    {
      icon: '🎮',
      title: 'Gesture Controls',
      description: 'Navigate through challenges using hand gestures powered by MediaPipe technology.',
    },
    {
      icon: '🤖',
      title: 'AI Companions',
      description: 'Collect unique AI-generated robot companions to help you on your cybersecurity journey.',
    },
    {
      icon: '🏆',
      title: 'Earn Rewards',
      description: 'Gain points, coins, badges, and unlock new areas as you master security concepts.',
    },
    {
      icon: '🌐',
      title: 'Immersive 3D World',
      description: 'Explore cyberpunk environments built with Three.js in a visually stunning game world.',
    },
  ];

  return (
    <section ref={sectionRef} className={styles.aboutSection} id="about">
      <div className={styles.container}>
        <h2 ref={titleRef} className={styles.sectionTitle}>
          What is SafeForest?
        </h2>

        <p className={styles.intro}>
          SafeForest is an immersive cybersecurity education game that transforms
          complex security concepts into engaging, interactive challenges. Learn to
          protect yourself in the digital world while playing through a cyberpunk
          adventure.
        </p>

        <div ref={cardsRef} className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.icon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
