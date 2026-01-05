import React from 'react';
import styles from './Background.module.css';

export default function Background({ src }) {
  return (
    <div className={styles.root}>
      <img className={styles.image} src={src} alt="Manhattan street" loading="eager" draggable={false} />
      <div className={styles.sunsetTint} />
    </div>
  );
}
