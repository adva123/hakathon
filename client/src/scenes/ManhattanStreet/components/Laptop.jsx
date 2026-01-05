import React from 'react';
import styles from './Laptop.module.css';

export default function Laptop({ children }) {
  return (
    <div className={styles.wrap} aria-hidden>
      <div className={styles.laptop}>
        <div className={styles.screenBezel}>
          <div className={styles.screenGlow} />
          {children}
        </div>
        <div className={styles.base} />
      </div>
    </div>
  );
}
