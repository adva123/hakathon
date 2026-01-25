import styles from './TestimonialCard.module.css';

export default function TestimonialCard({ testimonial }) {
  return (
    <div className={styles.testimonialCard}>
      <div className={styles.rating}>
        {[...Array(5)].map((_, i) => (
          <span key={i} className={styles.star}>★</span>
        ))}
      </div>

      <blockquote className={styles.quote}>
        "{testimonial.quote}"
      </blockquote>

      <div className={styles.author}>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatar}>{testimonial.avatar}</div>
        </div>
        <div className={styles.authorInfo}>
          <div className={styles.authorName}>{testimonial.name}</div>
          <div className={styles.authorTitle}>{testimonial.title}</div>
        </div>
      </div>
    </div>
  );
}
