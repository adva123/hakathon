// import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
// import PropTypes from 'prop-types';
// import { GameContext } from '../../context/gameState.js';
// import styles from './PasswordRoom.module.css';

// function evaluatePassword(pw) {
//   const lengthOk = pw.length >= 8;
//   const uppercaseOk = /[A-Z]/.test(pw);
//   const numberOk = /\d/.test(pw);
//   const specialOk = /[!@#$%^&*]/.test(pw);

//   const met = [lengthOk, uppercaseOk, numberOk, specialOk].filter(Boolean).length;

//   return {
//     lengthOk,
//     uppercaseOk,
//     numberOk,
//     specialOk,
//     met,
//     isStrong: met >= 3, // Strong password = at least 3 criteria
//   };
// }




// export default function PasswordRoom({ addScore: addScoreProp, awardBadge: awardBadgeProp, gestureRef } = {}) {
//   const { playerName, addScore, registerMistake, awardBadge, handleBack, badges, coins, setCoins } = useContext(GameContext);
//   const addScoreFn = addScoreProp || addScore;
//   const awardBadgeFn = awardBadgeProp || awardBadge;

//   // Game state
//   const [currentPasswordIndex, setCurrentPasswordIndex] = useState(0);
//   const [score, setScore] = useState(0);
//   const [lives, setLives] = useState(3);
//   const [message, setMessage] = useState('');
//   const [gameOver, setGameOver] = useState(false);
//   const [victory, setVictory] = useState(false);
//   const [showFeedback, setShowFeedback] = useState(false);
//   const [feedbackType, setFeedbackType] = useState(''); // 'correct' or 'wrong'

//   const gestureTimeoutRef = useRef(null);
//   const feedbackTimeoutRef = useRef(null);
//   const lastGestureRef = useRef('none');
//   const gestureCheckIntervalRef = useRef(null);

// import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
// import PropTypes from 'prop-types';
// import { GameContext } from '../../context/gameState.js';
// import styles from './PasswordRoom.module.css';

// // פונקציית עזר חיצונית לבדיקת חוזק סיסמה
// function evaluatePassword(pw) {
//   if (!pw) return { met: 0, isStrong: false };
//   const lengthOk = pw.length >= 8;
//   const uppercaseOk = /[A-Z]/.test(pw);
//   const numberOk = /\d/.test(pw);
//   const specialOk = /[!@#$%^&*]/.test(pw);
//   const met = [lengthOk, uppercaseOk, numberOk, specialOk].filter(Boolean).length;
//   return { met, isStrong: met >= 3 };
// }

// export default function PasswordRoom({ addScore: addScoreProp, awardBadge: awardBadgeProp, gestureRef } = {}) {
//   const { playerName, addScore, registerMistake, awardBadge, handleBack, badges, coins, setCoins } = useContext(GameContext);
//   const addScoreFn = addScoreProp || addScore;
//   const awardBadgeFn = awardBadgeProp || awardBadge;

//   // --- 1. כל ה-Hooks חייבים להיות בראש הקומפוננטה ---
//   const [passwordSamples, setPasswordSamples] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [currentPasswordIndex, setCurrentPasswordIndex] = useState(0);
//   const [score, setScore] = useState(0);
//   const [lives, setLives] = useState(3);
//   const [message, setMessage] = useState('');
//   const [gameOver, setGameOver] = useState(false);
//   const [victory, setVictory] = useState(false);
//   const [showFeedback, setShowFeedback] = useState(false);
//   const [feedbackType, setFeedbackType] = useState('');

//   const gestureTimeoutRef = useRef(null);
//   const feedbackTimeoutRef = useRef(null);
//   const lastGestureRef = useRef('none');
//   const gestureCheckIntervalRef = useRef(null);

//   // --- 2. טעינת נתונים מה-DB ---
//   useEffect(() => {
//     const fetchPasswords = async () => {
//       try {
//         const response = await fetch('http://localhost:5000/api/passwords/random');
//         const data = await response.json();
//         setPasswordSamples(data);
//         setLoading(false);
//       } catch (err) {
//         console.error("Error loading passwords:", err);
//         setLoading(false);
//       }
//     };
//     fetchPasswords();
//   }, []);

//   const currentPassword = passwordSamples[currentPasswordIndex];
//   const alreadyEarned = Boolean(badges?.goldenKey);

//   // --- 3. לוגיקת הטיפול במחוות (handleGesture) ---
//   const handleGesture = useCallback((gesture) => {
//     if (gesture === 'iLoveYou' || gesture === 'iloveyou') {
//       handleBack();
//       return;
//     }
//     if (gameOver || victory || !currentPassword) return;
//     if (gestureTimeoutRef.current) return;

//     // בדיקת תשובה
//     let isCorrect = false;
//     if (gesture === 'thumbUp' && currentPassword.isStrong) isCorrect = true;
//     else if (gesture === 'thumbDown' && !currentPassword.isStrong) isCorrect = true;
//     else if (gesture === 'thumbUp' || gesture === 'thumbDown') isCorrect = false;
//     else return; // מחווה לא רלוונטית

//     setShowFeedback(true);
//     setFeedbackType(isCorrect ? 'correct' : 'wrong');

//     if (isCorrect) {
//       const points = 20;
//       setScore(s => s + points);
//       addScoreFn(points);
//       setCoins(c => c + 10);
//       setMessage('✅ Correct! (+10 coins)');
      
//       gestureTimeoutRef.current = setTimeout(() => {
//         const nextIndex = currentPasswordIndex + 1;
//         if (nextIndex >= passwordSamples.length) {
//           setVictory(true);
//           awardBadgeFn('goldenKey');
//           addScoreFn(100);
//         } else {
//           setCurrentPasswordIndex(nextIndex);
//           setMessage('');
//         }
//         setShowFeedback(false);
//         gestureTimeoutRef.current = null;
//       }, 1500);
//     } else {
//       registerMistake();
//       const newLives = lives - 1;
//       setLives(newLives);
//       if (newLives <= 0) {
//         setGameOver(true);
//         setMessage('❌ Game over!');
//       } else {
//         setMessage(`❌ Wrong! ${newLives} lives left`);
//       }
      
//       gestureTimeoutRef.current = setTimeout(() => {
//         setMessage('');
//         setShowFeedback(false);
//         gestureTimeoutRef.current = null;
//       }, 1500);
//     }
//   }, [gameOver, victory, currentPassword, lives, currentPasswordIndex, passwordSamples.length, addScoreFn, awardBadgeFn, registerMistake, handleBack, setCoins]);

//   // --- 4. ניטור מחוות מהמצלמה ---
//   useEffect(() => {
//     if (!gestureRef) return;
//     gestureCheckIntervalRef.current = setInterval(() => {
//       const currentGesture = gestureRef.current?.gesture;
//       if (currentGesture && currentGesture !== lastGestureRef.current && currentGesture !== 'none') {
//         lastGestureRef.current = currentGesture;
//         handleGesture(currentGesture);
//       }
//     }, 200);
//     return () => clearInterval(gestureCheckIntervalRef.current);
//   }, [gestureRef, handleGesture]);

//   // --- 5. ניקוי טיימרים ---
//   useEffect(() => {
//     return () => {
//       if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
//       if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
//     };
//   }, []);

//   // --- 6. תנאי רינדור (חייב לבוא אחרי כל ה-Hooks) ---
//   if (loading) return <div className={styles.loading}>Loading missions...</div>;
//   if (!passwordSamples.length && !victory && !gameOver) return <div className={styles.error}>No passwords found in DB.</div>;

//   const restart = () => {
//     setCurrentPasswordIndex(0);
//     setScore(0);
//     setLives(3);
//     setGameOver(false);
//     setVictory(false);
//     setMessage('');
//   };

//   return (
//     <div className={styles.wrap}>
//       <div className={styles.cockpit}>
//         <div className={styles.header}>
//           <div>
//             <h2 className={styles.title}>Password Strength Detector</h2>
//             <p className={styles.subtitle}>
//               {playerName ? `${playerName}, identify the passwords` : '👍 = Strong | 👎 = Weak'}
//             </p>
//           </div>
//           <div style={{ color: 'white', fontWeight: 700 }}>
//             Score: <span className={styles.neonTag}>{score}</span> | 
//             Coins: <span className={styles.neonTag}>🪙 {coins}</span> | 
//             Lives: <span className={styles.neonTag}>{'❤️'.repeat(lives)}</span>
//           </div>
//         </div>

//         <div className={styles.grid}>
//           <div className={styles.panel}>
//             {!gameOver && !victory && currentPassword && (
//               <div className={styles.passwordDisplay}>
//                 <h3 className={styles.passwordTitle}>Password to Analyze:</h3>
//                 <div className={styles.passwordText}>{currentPassword.password}</div>
//                 <div className={styles.passwordProgress}>
//                   {currentPasswordIndex + 1} / {passwordSamples.length}
//                 </div>
//               </div>
//             )}

//             {showFeedback && (
//               <div className={`${styles.feedbackOverlay} ${styles[feedbackType]}`}>
//                 {feedbackType === 'correct' ? '✅ Correct!' : '❌ Wrong!'}
//               </div>
//             )}

//             {(gameOver || victory) && (
//               <div className={victory ? styles.victoryScreen : styles.gameOverScreen}>
//                 <h3>{victory ? '🎉 Victory!' : '❌ Game Over'}</h3>
//                 <p>Final Score: {score}</p>
//                 {victory && !alreadyEarned && <p className={styles.neonTag}>🔑 Golden Key earned!</p>}
//                 <div className={styles.row}>
//                   <button className={styles.btn} onClick={restart}>Try Again</button>
//                   <button className={styles.btn} onClick={handleBack}>Back</button>
//                 </div>
//               </div>
//             )}

//             {message && <div className={styles.message}>{message}</div>}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// PasswordRoom.propTypes = {
//   addScore: PropTypes.func,
//   awardBadge: PropTypes.func,
//   gestureRef: PropTypes.shape({ current: PropTypes.any }),
// };
//                 </div>
// 1. ה-imports תמיד בראש הקובץ, מחוץ לכל פונקציה
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { GameContext } from '../../context/gameState.js';
import styles from './PasswordRoom.module.css';

// פונקציית עזר חיצונית
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
  const { playerName, addScore, registerMistake, awardBadge, handleBack, badges, coins, setCoins } = useContext(GameContext);
  const addScoreFn = addScoreProp || addScore;
  const awardBadgeFn = awardBadgeProp || awardBadge;

  // States
  const [passwordSamples, setPasswordSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPasswordIndex, setCurrentPasswordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState('');

  // Refs
  const gestureTimeoutRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);
  const lastGestureRef = useRef('none');
  const gestureCheckIntervalRef = useRef(null);

  const alreadyEarned = Boolean(badges?.goldenKey);

  // טעינה מה-DB
  useEffect(() => {
    const fetchPasswords = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/passwords/random');
        const data = await response.json();
        setPasswordSamples(data);
        setLoading(false);
      } catch (err) {
        console.error("Error loading passwords:", err);
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
    if (gameOver || victory || !currentPassword) return;
    if (gestureTimeoutRef.current) return;

    let isCorrect = false;
    if (gesture === 'thumbUp' && currentPassword.isStrong) isCorrect = true;
    else if (gesture === 'thumbDown' && !currentPassword.isStrong) isCorrect = true;
    else if (gesture === 'thumbUp' || gesture === 'thumbDown') isCorrect = false;
    else return;

    setShowFeedback(true);
    setFeedbackType(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      const points = 20;
      setScore(s => s + points);
      addScoreFn(points);
      setCoins(c => c + 10);
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
        gestureTimeoutRef.current = null;
      }, 1500);
    } else {
      registerMistake();
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
        gestureTimeoutRef.current = null;
      }, 1500);
    }
  }, [gameOver, victory, currentPassword, lives, currentPasswordIndex, passwordSamples.length, addScoreFn, awardBadgeFn, registerMistake, handleBack, setCoins]);

  useEffect(() => {
    if (!gestureRef) return;
    gestureCheckIntervalRef.current = setInterval(() => {
      const currentGesture = gestureRef.current?.gesture;
      if (currentGesture && currentGesture !== lastGestureRef.current && currentGesture !== 'none') {
        lastGestureRef.current = currentGesture;
        handleGesture(currentGesture);
      }
    }, 200);
    return () => clearInterval(gestureCheckIntervalRef.current);
  }, [gestureRef, handleGesture]);

  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  if (loading) return <div className={styles.loading}>Loading passwords...</div>;

  const restart = () => {
    setCurrentPasswordIndex(0);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setVictory(false);
    setMessage('');
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.cockpit}>
        <div className={styles.header}>
          <h2 className={styles.title}>Password Strength Detector</h2>
          <div style={{ color: 'white', fontWeight: 700 }}>
            Score: {score} | Coins: 🪙 {coins} | Lives: {'❤️'.repeat(lives)}
          </div>
        </div>

        <div className={styles.panel}>
          {!gameOver && !victory && currentPassword && (
            <div className={styles.passwordDisplay}>
              <h3>Analyze this:</h3>
              <div className={styles.passwordText}>{currentPassword.password}</div>
              <div>{currentPasswordIndex + 1} / {passwordSamples.length}</div>
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
              <button className={styles.btn} onClick={restart}>Try Again</button>
              <button className={styles.btn} onClick={handleBack}>Back</button>
            </div>
          )}
          {message && <div className={styles.message}>{message}</div>}
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