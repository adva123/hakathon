import { useRef, useEffect, useState } from 'react';
import TestimonialCard from './TestimonialCard';
import styles from './TestimonialsSection.module.css';

export default function TestimonialsSection() {
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

  const testimonials = [
    {
      quote: "SafeForest made learning cybersecurity actually fun! The gesture controls are incredible and the 3D environment keeps me engaged. I've learned more here in a week than months of traditional courses.",
      avatar: '👨‍💻',
      name: 'Alex Chen',
      title: 'Computer Science Student',
    },
    {
      quote: "As a teacher, I'm always looking for innovative ways to engage students. SafeForest's gamified approach to security education is brilliant. My students are actually excited about learning password safety!",
      avatar: '👩‍🏫',
      name: 'Sarah Martinez',
      title: 'High School Teacher',
    },
    {
      quote: "The AI companion feature is genius! Having a personalized guide through the challenges makes the learning experience feel unique. Plus, the forest-cyberpunk aesthetic is stunning.",
      avatar: '👨‍🎓',
      name: 'David Kim',
      title: 'Cybersecurity Enthusiast',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className={`${styles.testimonialsSection} ${isVisible ? styles.visible : ''}`}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.heading}>What Learners Say</h2>
          <p className={styles.subheading}>
            Join thousands discovering cybersecurity through immersive gameplay
          </p>
        </div>

        <div className={styles.testimonialsGrid}>
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={styles.gridItem}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
