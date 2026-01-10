import React, { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { GameContext } from '../context/gameState.js';
import styles from './ResourceBank.module.css';

/**
 * רכיב המודאל הפנימי של הבנק
 */
function ResourceBankModal({ isOpen, onClose, score, coins, energy, exchangePointsForCoins, buyEnergyWithCoins }) {
  const [message, setMessage] = useState('');

  const handleExchange = () => {
    console.log('🔄 Attempting to exchange points...');
    const res = exchangePointsForCoins(50);
    if (res?.success) {
      setMessage('✅ Exchanged 50 points for 25 coins!');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('❌ Not enough points!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleBuyEnergy = () => {
    console.log('⚡ Attempting to buy energy...');
    const res = buyEnergyWithCoins(30);
    if (res?.success) {
      setMessage('✅ Bought energy! ⚡');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('❌ Not enough coins!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        // Only close if clicking directly on the overlay (not modal)
        if (e.target.className && e.target.className.includes('overlay')) {
          onClose();
        }
      }}
      style={{ pointerEvents: 'all', zIndex: 100000, background: 'rgba(0,0,0,0.85)' }}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 100001, pointerEvents: 'all' }}
      >
        {/* Close button */}
        <button className={styles.closeBtn} onClick={onClose}>
          ✖
        </button>

        {/* Title */}
        <h2 className={styles.title}>🏦 Resource Bank</h2>

        {/* Current resources */}
        <div className={styles.resources}>
          <div className={styles.resource}>
            <span className={styles.icon}>⭐</span>
            <span className={styles.amount}>{score}</span>
            <span className={styles.label}>Points</span>
          </div>
          <div className={styles.resource}>
            <span className={styles.icon}>💰</span>
            <span className={styles.amount}>{coins}</span>
            <span className={styles.label}>Coins</span>
          </div>
          <div className={styles.resource}>
            <span className={styles.icon}>⚡</span>
            <span className={styles.amount}>{energy}</span>
            <span className={styles.label}>Energy</span>
          </div>
        </div>

        {/* Exchange buttons */}
        <div className={styles.exchanges}>
          {/* Exchange points for coins */}
          <button
            className={styles.exchangeBtn}
            style={{ cursor: 'pointer', zIndex: 100002, position: 'relative' }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleExchange();
            }}
          >
            <div className={styles.exchangeContent}>
              <span className={styles.from}>⭐ 50</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.to}>💰 25</span>
            </div>
            <span className={styles.btnLabel}>Exchange Points for Coins</span>
          </button>

          {/* Buy energy with coins */}
          <button
            className={styles.energyBtn}
            style={{ cursor: 'pointer', zIndex: 100002, position: 'relative' }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleBuyEnergy();
            }}
          >
            <div className={styles.exchangeContent}>
              <span className={styles.from}>💰 30</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.to}>⚡ +1</span>
            </div>
            <span className={styles.btnLabel}>Buy Energy</span>
          </button>
        </div>

        {/* Message feedback */}
        {message && <div className={styles.message}>{message}</div>}

        {/* Info text */}
        <p className={styles.info}>💡 Use your resources wisely to keep playing!</p>
      </div>
    </div>
  );
}

/**
 * הרכיב המרכזי שאותו מייצאים
 */
export default function ResourceBank() {
  const { openBank, setOpenBank, score, coins, energy, exchangePointsForCoins, buyEnergyWithCoins } =
    useContext(GameContext);

  // Don't render anything if bank is closed
  if (!openBank) return null;

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
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  score: PropTypes.number.isRequired,
  coins: PropTypes.number.isRequired,
  energy: PropTypes.number.isRequired,
  exchangePointsForCoins: PropTypes.func.isRequired,
  buyEnergyWithCoins: PropTypes.func.isRequired,
};
