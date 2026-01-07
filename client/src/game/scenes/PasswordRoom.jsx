import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { GameContext } from '../../context/gameState.js';
import styles from './PasswordRoom.module.css';

function evaluatePassword(pw) {
  const lengthOk = pw.length >= 8;
  const uppercaseOk = /[A-Z]/.test(pw);
  const numberOk = /\d/.test(pw);
  const specialOk = /[!@#$%^&*]/.test(pw);

  const met = [lengthOk, uppercaseOk, numberOk, specialOk].filter(Boolean).length;

  return {
    lengthOk,
    uppercaseOk,
    numberOk,
    specialOk,
    met,
    isStrong: met >= 3, // סיסמה חזקה = לפחות 3 קריטריונים
  };
}

// מאגר סיסמאות לבדיקה
const PASSWORD_SAMPLES = [
  { password: 'password', isStrong: false },
  { password: '12345678', isStrong: false },
  { password: 'Abc123', isStrong: false },
  { password: 'MyP@ssw0rd', isStrong: true },
  { password: 'hello', isStrong: false },
  { password: 'Secure#2024', isStrong: true },
  { password: 'admin', isStrong: false },
  { password: 'C0mpl3x!Pass', isStrong: true },
  { password: 'qwerty', isStrong: false },
  { password: 'Str0ng&Safe', isStrong: true },
  { password: '123abc', isStrong: false },
  { password: 'P@ssword123', isStrong: true },
];

export default function PasswordRoom({ addScore: addScoreProp, awardBadge: awardBadgeProp, gestureRef } = {}) {
  const { playerName, addScore, registerMistake, awardBadge, handleBack, badges } = useContext(GameContext);
  const addScoreFn = addScoreProp || addScore;
  const awardBadgeFn = awardBadgeProp || awardBadge;

  // Game state
  const [currentPasswordIndex, setCurrentPasswordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState(''); // 'correct' או 'wrong'
  
  const gestureTimeoutRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);
  const lastGestureRef = useRef('none');
  const gestureCheckIntervalRef = useRef(null);

  const alreadyEarned = Boolean(badges?.goldenKey);
  const currentPassword = PASSWORD_SAMPLES[currentPasswordIndex];
  const passwordEval = useMemo(() => 
    currentPassword ? evaluatePassword(currentPassword.password) : null, 
    [currentPassword]
  );

  // ניקוי טיימרים
  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (gestureCheckIntervalRef.current) clearInterval(gestureCheckIntervalRef.current);
    };
  }, []);

  const handleGesture = useCallback((gesture) => {
    if (gameOver || victory || !currentPassword) return;
    
    // מניעת מחוות כפולות מהירות
    if (gestureTimeoutRef.current) return;

    let isCorrect = false;

    if (gesture === 'thumbUp' && currentPassword.isStrong) {
      isCorrect = true;
    } else if (gesture === 'thumbDown' && !currentPassword.isStrong) {
      isCorrect = true;
    } else if (gesture === 'thumbUp' || gesture === 'thumbDown') {
      // תגובה שגויה
      isCorrect = false;
    } else {
      // מחווה לא רלוונטית
      return;
    }

    // הצגת פידבק ויזואלי
    setShowFeedback(true);
    setFeedbackType(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      // תשובה נכונה
      const points = 20;
      setScore(s => s + points);
      addScoreFn(points);
      setMessage('✅ נכון! סיסמה זוהתה נכון');
      
      // מעבר לסיסמה הבאה
      gestureTimeoutRef.current = setTimeout(() => {
        const nextIndex = currentPasswordIndex + 1;
        if (nextIndex >= PASSWORD_SAMPLES.length) {
          // ניצחון!
          setVictory(true);
          setMessage('🎉 ניצחת! זיהית את כל הסיסמאות נכון!');
          awardBadgeFn('goldenKey');
          addScoreFn(100);
        } else {
          setCurrentPasswordIndex(nextIndex);
          setMessage('');
          setShowFeedback(false);
        }
        gestureTimeoutRef.current = null;
      }, 1500);
    } else {
      // תשובה שגויה
      registerMistake();
      const newLives = lives - 1;
      setLives(newLives);
      
      if (newLives <= 0) {
        setGameOver(true);
        setMessage('❌ המשחק נגמר! נסה שוב');
      } else {
        setMessage(`❌ שגוי! נותרו ${newLives} חיים`);
      }

      gestureTimeoutRef.current = setTimeout(() => {
        if (newLives > 0) {
          setMessage('');
          setShowFeedback(false);
        }
        gestureTimeoutRef.current = null;
      }, 1500);
    }

    // הסתרת פידבק ויזואלי אחרי זמן קצר
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setShowFeedback(false);
    }, 1000);
  }, [gameOver, victory, currentPassword, lives, currentPasswordIndex, addScoreFn, awardBadgeFn, registerMistake]);

  // ניטור מחוות יד מ-gestureRef
  useEffect(() => {
    if (!gestureRef) return;

    // בדיקה קבועה של מחוות חדשות
    gestureCheckIntervalRef.current = setInterval(() => {
      const currentGesture = gestureRef.current?.gesture;
      if (currentGesture && currentGesture !== lastGestureRef.current && currentGesture !== 'none') {
        lastGestureRef.current = currentGesture;
        handleGesture(currentGesture);
      }
    }, 200);

    return () => {
      if (gestureCheckIntervalRef.current) {
        clearInterval(gestureCheckIntervalRef.current);
      }
    };
  }, [gestureRef, handleGesture]);

  const restart = () => {
    setCurrentPasswordIndex(0);
    setScore(0);
    setLives(3);
    setMessage('');
    setGameOver(false);
    setVictory(false);
    setShowFeedback(false);
  };

  const back = () => handleBack();

  return (
    <div className={styles.wrap}>
      <div className={styles.cockpit}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              Password Strength Detector
            </h2>
            <p className={styles.subtitle}>
              {playerName
                ? `${playerName}, use hand gestures to identify strong and weak passwords`
                : 'Use hand gestures: 👍 for strong password | 👎 for weak password'}
            </p>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700 }}>
            Score: <span className={styles.neonTag}>{score}</span> | 
            Lives: <span className={styles.neonTag}>{'❤️'.repeat(lives)}</span>
          </div>
        </div>

        <div className={styles.grid}>
          {showFeedback && (
            <div className={`${styles.feedbackOverlay} ${styles[feedbackType]}`}>
              {feedbackType === 'correct' ? '✅ Correct!' : '❌ Wrong!'}
            </div>
          )}

          <div className={styles.panel}>
            {!gameOver && !victory && currentPassword && (
              <>
                <div className={styles.passwordDisplay}>
                  <h3 className={styles.passwordTitle}>Password to Analyze:</h3>
                  <div className={styles.passwordText}>{currentPassword.password}</div>
                  <div className={styles.passwordProgress}>
                    {currentPasswordIndex + 1} / {PASSWORD_SAMPLES.length}
                  </div>
                </div>

                <div className={styles.gestureHint}>
                  <p>🖐️ Use hand gestures:</p>
                  <p>👍 = Strong Password (3+ criteria)</p>
                  <p>👎 = Weak Password</p>
                </div>
              </>
            )}

            {gameOver && (
              <div className={styles.gameOverScreen}>
                <h3>❌ Game Over</h3>
                <p>Final Score: {score}</p>
                <p>Passwords Detected: {currentPasswordIndex} / {PASSWORD_SAMPLES.length}</p>
                <div className={styles.row}>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={restart}>
                    Try Again
                  </button>
                  <button className={styles.btn} onClick={back}>
                    Back
                  </button>
                </div>
              </div>
            )}

            {victory && (
              <div className={styles.victoryScreen}>
                <h3>🎉 Victory!</h3>
                <p>You identified all passwords correctly!</p>
                <p>Final Score: {score}</p>
                {!alreadyEarned && <p className={styles.neonTag}>🔑 Golden Key earned!</p>}
                <div className={styles.row}>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={restart}>
                    Play Again
                  </button>
                  <button className={styles.btn} onClick={back}>
                    Back
                  </button>
                </div>
              </div>
            )}

            {message && <div className={styles.message}>{message}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

PasswordRoom.propTypes = {
  addScore: PropTypes.func,
  awardBadge: PropTypes.func,
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
};
