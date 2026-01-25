import { useRef, useEffect, useState } from 'react';
import ModuleCard from './ModuleCard';
import styles from './LearningModulesGrid.module.css';

export default function LearningModulesGrid() {
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

  const modules = [
    {
      id: 1,
      title: 'Password Room',
      level: 'beginner',
      icon: '🔐',
      gradient: 'linear-gradient(135deg, #00f2ff, #0099cc)',
      rating: 5,
      players: 1200,
    },
    {
      id: 2,
      title: 'Privacy Lab',
      level: 'intermediate',
      icon: '🛡️',
      gradient: 'linear-gradient(135deg, #00ff9f, #00cc7f)',
      rating: 5,
      players: 850,
    },
    {
      id: 3,
      title: 'Threat Arena',
      level: 'advanced',
      icon: '⚔️',
      gradient: 'linear-gradient(135deg, #ff006e, #cc0056)',
      rating: 4,
      players: 620,
    },
    {
      id: 4,
      title: 'Encryption Workshop',
      level: 'intermediate',
      icon: '🔑',
      gradient: 'linear-gradient(135deg, #7000ff, #5500cc)',
      rating: 5,
      players: 940,
    },
  ];

  return (
    <section
      ref={sectionRef}
      className={`${styles.learningModules} ${isVisible ? styles.visible : ''}`}
      id="learning-paths"
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Learning Paths</h2>
          <p className={styles.subheading}>
            Choose your adventure through cybersecurity fundamentals
          </p>
        </div>

        <div className={styles.grid}>
          {modules.map((module, index) => (
            <div
              key={module.id}
              className={styles.gridItem}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <ModuleCard module={module} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
