import { useRef, useEffect } from 'react';
import anime from 'animejs';
import FeatureCard from './FeatureCard';
import styles from './AboutSection.module.css';

export default function AboutSection() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const introRef = useRef(null);
  const cardsRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;

            // Animate title
            anime({
              targets: titleRef.current,
              translateY: [40, 0],
              opacity: [0, 1],
              duration: 800,
              easing: 'easeOutExpo',
            });

            // Animate intro text
            anime({
              targets: introRef.current,
              translateY: [30, 0],
              opacity: [0, 1],
              duration: 800,
              delay: 200,
              easing: 'easeOutExpo',
            });

            // Cards will animate via CSS with stagger
            anime({
              targets: cardsRef.current,
              opacity: [0, 1],
              duration: 600,
              delay: 400,
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
      {/* Forest Silhouette Background */}
      <div className={styles.forestBackground}></div>
      <div className={styles.circuitPattern}></div>

      <div className={styles.container}>
        <h2 ref={titleRef} className={styles.sectionTitle}>
          What is <span className={styles.titleHighlight}>SafeForest</span>?
        </h2>

        <p ref={introRef} className={styles.intro}>
          SafeForest is a <strong>digital forest sanctuary</strong> where cybersecurity education
          meets immersive gameplay. Transform complex security concepts into engaging challenges
          while exploring a world where technology and nature harmoniously blend.
        </p>

        <div ref={cardsRef} className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
