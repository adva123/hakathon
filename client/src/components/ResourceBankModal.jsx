import React from 'react';
import styles from './ResourceBank.module.css';

export default function ResourceBankModal({ isOpen, onClose, score, coins, energy, exchangePointsForCoins, buyEnergyWithCoins }) {
  if (!isOpen) return null;
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✖</button>
        <h2>🏦 בנק המשאבים: הצל את עצמך!</h2>
        <div className={styles.actionRow}>
          <p>המר נקודות למטבעות (50 ⭐ ➔ 25 💰)</p>
          <button onClick={() => exchangePointsForCoins(50)}>בצע המרה</button>
        </div>
        <div className={styles.actionRow}>
          <p>קנה אנרגיה (30 💰 ➔ 1 ⚡)</p>
          <button onClick={() => buyEnergyWithCoins(30)}>קנה חיים</button>
        </div>
        <div className={styles.footer}>
          יש לך: {score} ⭐ | {coins} 💰 | {energy} ⚡
        </div>
      </div>
    </div>
  );
}
