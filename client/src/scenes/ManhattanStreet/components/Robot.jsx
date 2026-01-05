import React from 'react';
import styles from './Robot.module.css';

export default function Robot({ walking }) {
  return (
    <div className={styles.wrap} aria-hidden>
      <div className={`${styles.robot} ${walking ? styles.walking : ''}`}>
        <div className={styles.shadow} />

        <div className={styles.legs}>
          <div className={`${styles.leg} ${styles.legLeft}`} />
          <div className={`${styles.leg} ${styles.legRight}`} />
        </div>

        <div className={styles.body}>
          <div className={styles.backPanel} />
          <div className={styles.armLeft} />
          <div className={styles.armRight} />
        </div>

        <div className={styles.head}>
          <div className={styles.antenna}>
            <div className={styles.antennaTip} />
          </div>
          <div className={styles.eyeGlow} />
        </div>
      </div>
    </div>
  );
}
