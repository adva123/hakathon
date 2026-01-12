import { useRef, useEffect } from 'react';
import anime from 'animejs';
import styles from './DemoSection.module.css';

export default function DemoSection() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const titleRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Intersection Observer for scroll animation
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
              targets: videoRef.current,
              translateY: [60, 0],
              opacity: [0, 1],
              duration: 1000,
              delay: 200,
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

  return (
    <section ref={sectionRef} className={styles.demoSection} id="demo">
      <div className={styles.container}>
        <h2 ref={titleRef} className={styles.sectionTitle}>
          See It In Action
        </h2>

        <div ref={videoRef} className={styles.videoWrapper}>
          {/* Video placeholder - replace with actual video later */}
          <div className={styles.videoPlaceholder}>
            <div className={styles.playButton}>
              <span className={styles.playIcon}>▶</span>
            </div>
            <p className={styles.placeholderText}>Demo Video Coming Soon</p>
          </div>
        </div>

        <p className={styles.description}>
          Watch how players navigate through cyberpunk environments, solve security
          challenges using hand gestures, and earn rewards for mastering digital
          safety skills.
        </p>
      </div>
    </section>
  );
}
