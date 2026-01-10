import React, { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { GameContext } from '../context/gameState.js';
import styles from './ResourceBank.module.css';

/**
 * רכיב המודאל הפנימי של הבנק
 */
function ResourceBankModal({ isOpen, onClose, score, coins, energy, exchangePointsForCoins, buyEnergyWithCoins }) {
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const showFeedback = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleExchange = () => {
    const res = exchangePointsForCoins(50);
    if (res?.success) {
      showFeedback('✅ המרת 50 נקודות ל-25 מטבעות!');
    } else {
      showFeedback('❌ אין מספיק נקודות!');
    }
  };

  const handleBuyEnergy = () => {
    const res = buyEnergyWithCoins(30);
    if (res?.success) {
      showFeedback('✅ קנית אנרגיה! ⚡');
    } else {
      showFeedback('❌ אין מספיק מטבעות!');
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✖</button>
        <h2 className={styles.title}>🏦 בנק המשאבים</h2>
        
        <div className={styles.resources}>
          <div className={styles.resource}>
            <span className={styles.icon}>⭐</span>
            <span className={styles.amount}>{score}</span>
            <span className={styles.label}>נקודות</span>
          </div>
          <div className={styles.resource}>
            <span className={styles.icon}>💰</span>
            <span className={styles.amount}>{coins}</span>
            <span className={styles.label}>מטבעות</span>
          </div>
          <div className={styles.resource}>
            <span className={styles.icon}>⚡</span>
            <span className={styles.amount}>{energy}</span>
            <span className={styles.label}>אנרגיה</span>
          </div>
        </div>

        <div className={styles.exchanges}>
          <button className={styles.exchangeBtn} onClick={handleExchange}>
            <div className={styles.exchangeContent}>
              <span className={styles.from}>⭐ 50</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.to}>💰 25</span>
            </div>
            <span className={styles.btnLabel}>המר נקודות למטבעות</span>
          </button>

          <button className={styles.energyBtn} onClick={handleBuyEnergy}>
            <div className={styles.exchangeContent}>
              <span className={styles.from}>💰 30</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.to}>⚡ +1</span>
            </div>
            <span className={styles.btnLabel}>קנה אנרגיה</span>
          </button>
        </div>

        {message && (
          <div className={styles.message}>{message}</div>
        )}
        <p className={styles.info}>💡 השתמש במשאבים בחכמה כדי להמשיך לשחק!</p>
      </div>
    </div>
  );
}

/**
 * הרכיב המרכזי שאותו מייצאים
 */
export default function ResourceBank() {
  const { 
    openBank, 
    setOpenBank, 
    score, 
    coins, 
    energy, 
    exchangePointsForCoins, 
    buyEnergyWithCoins 
  } = useContext(GameContext);

  return (
    <ResourceBankModal
      isOpen={openBank}
      onClose={() => setOpenBank(false)}
      score={score}
      coins={coins}
      energy={energy}
      exchangePointsForCoins={exchangePointsForCoins}
      buyEnergyWithCoins={buyEnergyWithCoins}
    />
  );
}

// הגדרת טיפוסים (PropTypes)
ResourceBankModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  score: PropTypes.number,
  coins: PropTypes.number,
  energy: PropTypes.number,
  exchangePointsForCoins: PropTypes.func,
  buyEnergyWithCoins: PropTypes.func,
};