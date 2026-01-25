import { useNavigate } from 'react-router-dom';
import styles from './ModuleCard.module.css';

export default function ModuleCard({ module }) {
  const navigate = useNavigate();

  const getBadgeColor = (level) => {
    switch (level) {
      case 'beginner':
        return 'var(--badge-beginner)';
      case 'intermediate':
        return 'var(--badge-intermediate)';
      case 'advanced':
        return 'var(--badge-advanced)';
      default:
        return 'var(--badge-beginner)';
    }
  };

  const handleStartModule = () => {
    navigate('/login');
  };

  return (
    <div className={styles.moduleCard}>
      <div className={styles.badge} style={{ '--badge-color': getBadgeColor(module.level) }}>
        {module.level}
      </div>

      <div className={styles.imageWrapper}>
        <div className={styles.imageGradient} style={{ background: module.gradient }}>
          <span className={styles.moduleIcon}>{module.icon}</span>
        </div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{module.title}</h3>

        <div className={styles.meta}>
          <div className={styles.rating}>
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={styles.star}
                style={{ opacity: i < module.rating ? 1 : 0.3 }}
              >
                ★
              </span>
            ))}
          </div>

          <div className={styles.players}>
            <span className={styles.playersIcon}>👥</span>
            <span className={styles.playersCount}>{module.players}+</span>
          </div>
        </div>

        <button className={styles.ctaButton} onClick={handleStartModule}>
          Start Module
          <span className={styles.arrow}>→</span>
        </button>
      </div>
    </div>
  );
}
