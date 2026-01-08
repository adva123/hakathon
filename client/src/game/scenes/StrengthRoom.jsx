// import { useContext, useEffect, useMemo, useRef, useState } from 'react';
// import PropTypes from 'prop-types';
// import { GameContext } from '../../context/gameState.js';
// import styles from './StrengthRoom.module.css';


// const QUESTION_COUNT = 10;

// export default function StrengthRoom({ addScore: addScoreProp, gestureRef }) {
//   const { addScore, registerMistake, handleBack } = useContext(GameContext);
//   const addScoreFn = addScoreProp || addScore;
//   const finishedRef = useRef(false);
//   const gestureSeenRef = useRef({ lastUpdatedAt: 0, lastAcceptedAt: 0 });
//   const nextTimerRef = useRef(null);

//   const [step, setStep] = useState(0);
//   const [answers, setAnswers] = useState(() => Array.from({ length: QUESTION_COUNT }, () => null));
//   const [showNextOverlay, setShowNextOverlay] = useState(false);
//   const [passwords, setPasswords] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const loadFromDB = async () => {
//       try {
//         const res = await api.get('/passwords/random');
//         setPasswords(res.data);
//         setLoading(false);
//       } catch (err) {
//         console.error("Failed to load passwords", err);
//         setLoading(false);
//       }
//     };
//     loadFromDB();
//   }, []);

//   if (loading) return <div>מכין את המשימות...</div>;

//   const isDone = step >= QUESTION_COUNT;
//   const current = passwords[step];
//   const locked = answers[step] != null;
//   const transitioning = Boolean(nextTimerRef.current);

// // --- הקומפוננטה המרכזית ---

// export default function StrengthRoom({ addScore: addScoreProp, gestureRef }) {
//   const { addScore, registerMistake, handleBack } = useContext(GameContext);
//   const addScoreFn = addScoreProp || addScore;
  
//   const finishedRef = useRef(false);
//   const gestureSeenRef = useRef({ lastUpdatedAt: 0, lastAcceptedAt: 0 });
//   const nextTimerRef = useRef(null);

//   const [step, setStep] = useState(0);
//   const [answers, setAnswers] = useState(() => Array.from({ length: QUESTION_COUNT }, () => null));
//   const [showNextOverlay, setShowNextOverlay] = useState(false);

//   const passwords = useMemo(() => {
//     return pickSessionPasswords().map((p) => ({ 
//       text: p, 
//       strong: isStrongPassword(p) 
//     }));
//   }, []);

//   const isDone = step >= QUESTION_COUNT;
//   const current = passwords[Math.min(step, QUESTION_COUNT - 1)];
//   const locked = answers[step] != null;
//   const transitioning = Boolean(nextTimerRef.current);

//   const choose = (choice) => {
//     if (isDone || nextTimerRef.current) return;

//     const answerStep = step;
//     setAnswers((prev) => {
//       const next = [...prev];
//       if (next[answerStep] != null) return prev;
//       next[answerStep] = choice;
//       return next;
//     });

//     setShowNextOverlay(true);
//     nextTimerRef.current = setTimeout(() => {
//       nextTimerRef.current = null;
//       setShowNextOverlay(false);
//       setStep((s) => Math.min(QUESTION_COUNT, s + 1));
//     }, 2000);
//   };

//   // לוגיקת ציונים בסיום
//   useEffect(() => {
//     if (!isDone || finishedRef.current) return;
//     finishedRef.current = true;

//     const expected = passwords.map((p) => (p.strong ? 'like' : 'dislike'));
//     const correctCount = answers.filter((a, idx) => a === expected[idx]).length;

//     if (correctCount === QUESTION_COUNT) addScoreFn(100);
//     else if (correctCount === 0) registerMistake();
//     else addScoreFn(20);
//   }, [isDone, answers, passwords, addScoreFn, registerMistake]);

//   // זיהוי מחוות ידיים (Thumbs Up/Down ו-ILoveYou)
//   useEffect(() => {
//     if (!gestureRef?.current) return;
    
//     const id = setInterval(() => {
//       const g = gestureRef.current;
//       if (!g || !g.hasHand) return;

//       const gesture = String(g.gesture || 'none');
//       const now = Date.now();

//       // אם סיימנו - מחפשים רק iLoveYou כדי לחזור
//       if (isDone) {
//         if (gesture === 'iLoveYou') handleBack();
//         return;
//       }

//       // אם באמצע משחק - מחפשים לייק/דיסלייק עם Cooldown
//       if (now - gestureSeenRef.current.lastAcceptedAt < 450) return;

//       if (gesture === 'thumbUp') {
//         choose('like');
//         gestureSeenRef.current.lastAcceptedAt = now;
//       } else if (gesture === 'thumbDown') {
//         choose('dislike');
//         gestureSeenRef.current.lastAcceptedAt = now;
//       }
//     }, 100);

//     return () => clearInterval(id);
//   }, [gestureRef, isDone, handleBack]);

//   const result = useMemo(() => {
//     const expected = passwords.map((p) => (p.strong ? 'like' : 'dislike'));
//     const correctCount = answers.filter((a, idx) => a != null && a === expected[idx]).length;
//     return { correctCount };
//   }, [answers, passwords]);

//   return (
//     <div className={styles.wrap}>
//       <div className={styles.room}>
//         <div className={styles.header}>
//           <div>
//             <div className={styles.title}>Password Meter</div>
//             <div className={styles.subtitle}>Decide if each password is strong or weak.</div>
//           </div>
//           <div className={styles.meta}>
//             <div className={styles.pill}>
//               Question {Math.min(step + 1, QUESTION_COUNT)}/{QUESTION_COUNT}
//             </div>
//           </div>
//         </div>

//         {!isDone ? (
//           <>
//             <div className={styles.screen}>
//               <div className={styles.screenLabel}>Password</div>
//               <div className={styles.password}>{current?.text || ''}</div>
//               <div className={styles.screenHint}>
//                 {locked
//                   ? ''
//                   : 'Use 👍 / 👎 hand gestures, or click the buttons.'}
//               </div>
//             </div>
//             <div className={styles.actions}>
//               <button
//                 className={`${styles.btn} ${styles.like}`}
//                 onClick={() => choose('like')}
//                 disabled={locked || transitioning}
//               >
//                 👍 Strong
//               </button>
//               <button
//                 className={`${styles.btn} ${styles.dislike}`}
//                 onClick={() => choose('dislike')}
//                 disabled={locked || transitioning}
//               >
//                 👎 Weak
//               </button>
//             </div>
//             {showNextOverlay && (
//               <div className={styles.nextOverlay}>Next question</div>
//             )}
//           </>
//         ) : (
//           <div className={styles.result}>
//             <div className={styles.resultTitle}>Session Complete</div>
//             <div className={styles.resultBody}>
//               Correct: <span className={styles.neon}>{result.correctCount}</span>/{QUESTION_COUNT}
//             </div>
//             <div className={styles.resultBody}>
//               {result.correctCount === QUESTION_COUNT
//                 ? '✅ Perfect: +100 points'
//                 : result.correctCount === 0
//                 ? '⚠️ All wrong: energy -10'
//                 : '➕ Mixed: +20 points'}
//             </div>
//             <div className={styles.resultBody}>
// To return to the forest, make the hand gesture <b>iloveyou</b>
//             </div>
//             <button className={styles.primaryBtn} onClick={() => handleBack()}>
//               Return
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// StrengthRoom.propTypes = {
//   addScore: PropTypes.func,
//   gestureRef: PropTypes.shape({ current: PropTypes.any }),
// };
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { GameContext } from '../../context/gameState.js';
import styles from './StrengthRoom.module.css';

const QUESTION_COUNT = 10;

export default function StrengthRoom({ addScore: addScoreProp, gestureRef }) {
  const { addScore, registerMistake, handleBack } = useContext(GameContext);
  const addScoreFn = addScoreProp || addScore;

  const finishedRef = useRef(false);
  const gestureSeenRef = useRef({ lastUpdatedAt: 0, lastAcceptedAt: 0 });
  const nextTimerRef = useRef(null);

  // States
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => Array.from({ length: QUESTION_COUNT }, () => null));
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(true);

  // טעינת סיסמאות מה-DB
  useEffect(() => {
    const loadFromDB = async () => {
      try {
        // וודאי ש-api מוגדר אצלך בפרויקט (או השתמשי ב-fetch/axios)
        const response = await fetch('http://localhost:5000/api/passwords/random');
        const data = await response.json();
        setPasswords(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load passwords", err);
        setLoading(false);
      }
    };
    loadFromDB();
  }, []);

  const isDone = step >= QUESTION_COUNT;
  const current = passwords[step];
  const locked = answers[step] != null;
  const transitioning = Boolean(nextTimerRef.current);

  const choose = (choice) => {
    if (isDone || nextTimerRef.current) return;

    const answerStep = step;
    setAnswers((prev) => {
      const next = [...prev];
      if (next[answerStep] != null) return prev;
      next[answerStep] = choice;
      return next;
    });

    setShowNextOverlay(true);
    nextTimerRef.current = setTimeout(() => {
      nextTimerRef.current = null;
      setShowNextOverlay(false);
      setStep((s) => Math.min(QUESTION_COUNT, s + 1));
    }, 2000);
  };

  // לוגיקת ציונים בסיום
  useEffect(() => {
    if (!isDone || finishedRef.current || passwords.length === 0) return;
    finishedRef.current = true;

    const expected = passwords.map((p) => (p.isStrong ? 'like' : 'dislike'));
    const correctCount = answers.filter((a, idx) => a === expected[idx]).length;

    if (correctCount === QUESTION_COUNT) addScoreFn(100);
    else if (correctCount === 0) registerMistake();
    else addScoreFn(20);
  }, [isDone, answers, passwords, addScoreFn, registerMistake]);

  // זיהוי מחוות ידיים
  useEffect(() => {
    if (!gestureRef?.current) return;

    const id = setInterval(() => {
      const g = gestureRef.current;
      if (!g || !g.hasHand) return;

      const gesture = String(g.gesture || 'none');
      const now = Date.now();

      if (isDone) {
        if (gesture === 'iLoveYou' || gesture === 'iloveyou') handleBack();
        return;
      }

      if (now - gestureSeenRef.current.lastAcceptedAt < 450) return;

      if (gesture === 'thumbUp') {
        choose('like');
        gestureSeenRef.current.lastAcceptedAt = now;
      } else if (gesture === 'thumbDown') {
        choose('dislike');
        gestureSeenRef.current.lastAcceptedAt = now;
      }
    }, 100);

    return () => clearInterval(id);
  }, [gestureRef, isDone, handleBack]);

  const result = useMemo(() => {
    if (passwords.length === 0) return { correctCount: 0 };
    const expected = passwords.map((p) => (p.isStrong ? 'like' : 'dislike'));
    const correctCount = answers.filter((a, idx) => a != null && a === expected[idx]).length;
    return { correctCount };
  }, [answers, passwords]);

  if (loading) return <div className={styles.loading}>מכין את המשימות...</div>;

  return (
    <div className={styles.wrap}>
      <div className={styles.room}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Password Meter</div>
            <div className={styles.subtitle}>Decide if each password is strong or weak.</div>
          </div>
          <div className={styles.meta}>
            <div className={styles.pill}>
              Question {Math.min(step + 1, QUESTION_COUNT)}/{QUESTION_COUNT}
            </div>
          </div>
        </div>

        {!isDone ? (
          <>
            <div className={styles.screen}>
              <div className={styles.screenLabel}>Password</div>
              <div className={styles.password}>{current?.password || ''}</div>
              <div className={styles.screenHint}>
                {locked ? '' : 'Use 👍 / 👎 hand gestures, or click the buttons.'}
              </div>
            </div>
            <div className={styles.actions}>
              <button
                className={`${styles.btn} ${styles.like}`}
                onClick={() => choose('like')}
                disabled={locked || transitioning}
              >
                👍 Strong
              </button>
              <button
                className={`${styles.btn} ${styles.dislike}`}
                onClick={() => choose('dislike')}
                disabled={locked || transitioning}
              >
                👎 Weak
              </button>
            </div>
            {showNextOverlay && <div className={styles.nextOverlay}>Next question</div>}
          </>
        ) : (
          <div className={styles.result}>
            <div className={styles.resultTitle}>Session Complete</div>
            <div className={styles.resultBody}>
              Correct: <span className={styles.neon}>{result.correctCount}</span>/{QUESTION_COUNT}
            </div>
            <div className={styles.resultBody}>
              {result.correctCount === QUESTION_COUNT
                ? '✅ Perfect: +100 points'
                : result.correctCount === 0
                ? '⚠️ All wrong: energy -10'
                : '➕ Mixed: +20 points'}
            </div>
            <div className={styles.resultBody}>
              To return to the forest, make the hand gesture <b>iloveyou</b>
            </div>
            <button className={styles.primaryBtn} onClick={() => handleBack()}>
              Return
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

StrengthRoom.propTypes = {
  addScore: PropTypes.func,
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
};