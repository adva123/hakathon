import { useRef, useEffect, useState } from 'react';
import anime from 'animejs';
import styles from './StatsCounter.module.css';

export default function StatsCounter() {
  const sectionRef = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const statsRefs = useRef([]);

  const stats = [
    { label: 'Active Players', value: 5000, suffix: '+', icon: '👥' },
    { label: 'Challenges Completed', value: 2500, suffix: '+', icon: '🎯' },
    { label: 'Learning Modules', value: 15, suffix: '', icon: '📚' },
    { label: 'Badges Earned', value: 10000, suffix: '+', icon: '🏆' },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          // Animate each stat counter
          statsRefs.current.forEach((ref, index) => {
            if (ref) {
              const stat = stats[index];
              const obj = { value: 0 };

              anime({
                targets: obj,
                value: stat.value,
                duration: 2000,
                delay: index * 100,
                easing: 'easeOutExpo',
                round: 1,
                update: function() {
                  ref.textContent = obj.value.toLocaleString();
                }
              });
            }
          });

          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <section ref={sectionRef} className={styles.statsCounter}>
      <div className={styles.container}>
        <div className={styles.statsGrid}>
          {stats.map((stat, index) => (
            <div key={stat.label} className={styles.statCard}>
              <div className={styles.statIcon}>{stat.icon}</div>
              <div className={styles.statValue}>
                <span
                  ref={(el) => (statsRefs.current[index] = el)}
                  className={styles.number}
                >
                  0
                </span>
                <span className={styles.suffix}>{stat.suffix}</span>
              </div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
