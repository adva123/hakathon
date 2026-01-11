import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { GameContext } from '../../context/GameContext.jsx';
import api from '../../services/api';
import styles from './PasswordRoom.module.css';
import RoomOverlayBg from './RoomOverlayBg';

function evaluatePassword(pw) {
  if (!pw) return { met: 0, isStrong: false };
  const lengthOk = pw.length >= 8;
  const uppercaseOk = /[A-Z]/.test(pw);
  const numberOk = /\d/.test(pw);
  const specialOk = /[!@#$%^&*]/.test(pw);
  const met = [lengthOk, uppercaseOk, numberOk, specialOk].filter(Boolean).length;
  return { met, isStrong: met >= 3 };
}

export default function PasswordRoom({ addScore: addScoreProp, awardBadge: awardBadgeProp, gestureRef } = {}) {
  // הוספת user מה-Context
  const { user, addScore, registerMistake, awardBadge, handleBack, badges, coins, setCoins, score, setScore, energy, setEnergy, userId } = useContext(GameContext);
  const addScoreFn = addScoreProp || addScore;
  const awardBadgeFn = awardBadgeProp || awardBadge;

  // States
  const [passwordSamples, setPasswordSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPasswordIndex, setCurrentPasswordIndex] = useState(0);
  // score is now from context only
  const [lives, setLives] = useState(3);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState('');
  const [gestureProcessed, setGestureProcessed] = useState(false);

  // Refs
  const gestureTimeoutRef = useRef(null);
  const lastProcessedGestureRef = useRef('none');

  const alreadyEarned = Boolean(badges?.goldenKey);

  // טעינה של 10 סיסמאות
  useEffect(() => {
    const fetchPasswords = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/passwords/random/10');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const formattedData = data.map(pw => ({
            ...pw,
            isStrong: Boolean(pw.is_safe)
          }));
          setPasswordSamples(formattedData);
        } else {
          setMessage('❌ No passwords found');
        }
      } catch (err) {
        setMessage('❌ Failed to load passwords');
      } finally {
        setLoading(false);
      }
    };
    fetchPasswords();
  }, []);

  const currentPassword = passwordSamples[currentPasswordIndex];

  const handleGesture = useCallback((gesture) => {
    if (gesture === 'iLoveYou' || gesture === 'iloveyou') {
      handleBack();
      return;
    }

    if (gameOver || victory || !currentPassword || gestureTimeoutRef.current || gestureProcessed) {
      return;
    }

    let isCorrect = false;
    let validGesture = false;

    if (gesture === 'thumbUp') {
      validGesture = true;
      isCorrect = currentPassword.isStrong === true;
    } else if (gesture === 'thumbDown') {
      validGesture = true;
      isCorrect = currentPassword.isStrong === false;
    }

    if (!validGesture) return;

    setGestureProcessed(true);
    setShowFeedback(true);
    setFeedbackType(isCorrect ? 'correct' : 'wrong');



    if (isCorrect) {
      const points = 20;
      const newCoins = coins + 10;
      setScore(prev => prev + points);
      setCoins(newCoins);
      setMessage('✅ Correct! (+10 coins)');

      gestureTimeoutRef.current = setTimeout(() => {
        const nextIndex = currentPasswordIndex + 1;
        if (nextIndex >= passwordSamples.length) {
          setVictory(true);
          awardBadgeFn('goldenKey');
          addScoreFn(100);
        } else {
          setCurrentPasswordIndex(nextIndex);
          setMessage('');
        }
        setShowFeedback(false);
        setGestureProcessed(false);
        gestureTimeoutRef.current = null;
      }, 1000);
    } else {
      registerMistake();
      // הורדת אנרגיה רק כאשר התשובה שגויה
      const ENERGY_COST = 10;
      if (energy > 0) {
        setEnergy(prev => Math.max(prev - ENERGY_COST, 0)); // גם מעדכן ב-DB
      }
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        setGameOver(true);
        setMessage('❌ Game over!');
      } else {
        setMessage(`❌ Wrong! ${newLives} lives left`);
      }
      gestureTimeoutRef.current = setTimeout(() => {
        setMessage('');
        setShowFeedback(false);
        setGestureProcessed(false);
        gestureTimeoutRef.current = null;
      }, 1000);
    }
  }, [gameOver, victory, currentPassword, lives, currentPasswordIndex, passwordSamples.length, addScoreFn, awardBadgeFn, registerMistake, handleBack, setCoins, gestureProcessed]);

  // זיהוי מחוות - מיידי וללא המתנה
  useEffect(() => {
    if (!gestureRef) return;

    const checkGesture = () => {
      const currentGesture = gestureRef.current?.gesture;
      
      // רק thumbUp או thumbDown
      if (currentGesture === 'thumbUp' || currentGesture === 'thumbDown') {
        // בדוק אם זו מחווה חדשה
        if (currentGesture !== lastProcessedGestureRef.current && !gestureProcessed) {
          lastProcessedGestureRef.current = currentGesture;
          handleGesture(currentGesture);
        }
      } else if (currentGesture === 'iLoveYou' || currentGesture === 'iloveyou') {
        if (currentGesture !== lastProcessedGestureRef.current) {
          lastProcessedGestureRef.current = currentGesture;
          handleGesture(currentGesture);
        }
      } else if (currentGesture === 'none' || !currentGesture) {
        // איפוס כשאין מחווה
        lastProcessedGestureRef.current = 'none';
      }
    };

    const interval = setInterval(checkGesture, 50); // בדיקה כל 50ms - סופר מהיר!
    return () => clearInterval(interval);
  }, [gestureRef, handleGesture, gestureProcessed]);

  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.wrap}>
        <div className={styles.loading}>Loading passwords...</div>
      </div>
    );
  }

  if (passwordSamples.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.cockpit}>
          <div className={styles.header}>
            <h2>No Passwords Found</h2>
            <p>Please add passwords to the database</p>
            <button className={styles.btn} onClick={handleBack}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  const restart = async () => {
    setCurrentPasswordIndex(0);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setVictory(false);
    setMessage('');
    setGestureProcessed(false);
    lastProcessedGestureRef.current = 'none';
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/passwords/random/10');
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const formattedData = data.map(pw => ({
          ...pw,
          isStrong: Boolean(pw.is_safe)
        }));
        setPasswordSamples(formattedData);
      }
    } catch (err) {
      console.error("Error reloading passwords:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <RoomOverlayBg />
      <div className={styles.wrap}>
        <div className={styles.cockpit}>
          <div className={styles.header}>
            <h2 className={styles.title}>Password Strength Detector</h2>
            <div className={styles.statsRow}>
              <div>Score: <span className={styles.neonTag}>{score}</span></div>
              <div>Coins: <span className={styles.neonTag}>🪙 {coins}</span></div>
              <div>Lives: <span className={styles.neonTag}>{'❤️'.repeat(lives)}</span></div>
            </div>
          </div>

          <div className={styles.panel}>
            {!gameOver && !victory && currentPassword && (
              <div className={styles.passwordDisplay}>
                <h3>Analyze this password:</h3>
                <div className={styles.passwordText}>{currentPassword.password}</div>
                <div className={styles.hint}>
                  👍 Thumbs Up = Strong | 👎 Thumbs Down = Weak
                </div>
                <div className={styles.progress}>
                  {currentPasswordIndex + 1} / {passwordSamples.length}
                </div>
              </div>
            )}

            {showFeedback && (
              <div className={`${styles.feedbackOverlay} ${styles[feedbackType]}`}>
                {feedbackType === 'correct' ? '✅ Correct!' : '❌ Wrong!'}
              </div>
            )}

            {(gameOver || victory) && (
              <div className={victory ? styles.victoryScreen : styles.gameOverScreen}>
                <h3>{victory ? '🎉 Victory!' : '❌ Game Over'}</h3>
                <p>Final Score: {score}</p>
                <button className={styles.btn} onClick={restart}>Try Again</button>
                <button className={styles.btn} onClick={handleBack}>Back to Lobby</button>
              </div>
            )}

            {message && <div className={styles.message}>{message}</div>}
          </div>
        </div>
      </div>
    </>
  );
}

PasswordRoom.propTypes = {
  addScore: PropTypes.func,
  awardBadge: PropTypes.func,
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
};