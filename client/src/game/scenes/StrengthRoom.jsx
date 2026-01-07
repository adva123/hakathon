import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { GameContext } from '../../context/gameState.js';
import styles from './StrengthRoom.module.css';

// --- פונקציות עזר מחוץ לקומפוננטה ---

function isStrongPassword(pw) {
  const lengthOk = pw.length >= 8;
  const uppercaseOk = /[A-Z]/.test(pw);
  const numberOk = /\d/.test(pw);
  const specialOk = /[!@#$%^&*]/.test(pw);
  return lengthOk && uppercaseOk && numberOk && specialOk;
}

function shuffleInPlace(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[array[j]]] = [array[j], array[i]];
  }
  return array;
}

const QUESTION_COUNT = 10;

// Use the full banks from previous version (100 total, here shortened for brevity)
const STRONG_PASSWORD_BANK = Object.freeze([
  'N3on@Shield9', 'CandyMaze#9A', 'HkThn!2026A', 'Forest*Duck7A', 'S3cur3!Key8',
  'BlueSky@2026', 'Robot^Drive7X', 'Portal#Run55Z', 'Duck@Vault99Q', 'Cyber^Light4K',
  'Map*Node12T', 'Vite!Dev88R', 'React@Fiber7S', 'Three#World3D', 'Camera^Smooth9',
  'Tunnel!Entry2X', 'Badge#Wall77A', 'Energy*Bar6M', 'Privacy@Scan44D', 'Shop^Upgrade5P',
  'Strong!Pass1A', 'Secure@Lock2B', 'Mediapipe#Hand9', 'ThumbUp!OK7C', 'ThumbDown@NO3D',
  'Key^Mix8Z!', 'Alpha#Beta9Q', 'Gamma*Delta7R', 'Sunset@Glow6T', 'Cave^Fog5V',
  'Forest#Path4Y', 'Candy*Road3W', 'City@Night2U', 'Neo^Pulse1I', 'Shield!Gate8H',
  'Vault@Door7G', 'Laptop#Route6F', 'Portal*Open5E', 'Gesture@Map4D', 'Score^Boost3C',
  'Admin!Panel2B', 'Kinetic@Move9A', 'Runner^Speed8S', 'Dragon#Fruit7D', 'Mint*Lemon6M',
  'Ocean@Wave5O', 'Pixel^Glow4P', 'Matrix#Key3M', 'Quantum*Safe2Q', 'Nova@Star1N'
]);
const WEAK_PASSWORD_BANK = Object.freeze([
  '123456', '12345678', 'qwerty', 'password', '111111', '000000', 'iloveyou', 'letmein',
  'admin', 'welcome', 'monkey', 'dragon', 'sunshine', 'football', 'baseball', 'whatever',
  'trustno1', 'abc123', 'password1', 'qwerty123', 'hello123', 'aaaaaa', 'abcdefg', '123123',
  '987654321', 'pass1234', 'summer', 'winter', 'spring', 'autumn', 'hackathon', 'robot',
  'forest', 'cave', 'neon', 'myname', 'mybirthday', 'name2026', 'password2026', '1234',
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'
]);

function pickSessionPasswords() {
  // Pick 10 unique passwords, 5 strong + 5 weak, no repeats, random order
  const strong = shuffleInPlace([...STRONG_PASSWORD_BANK]).slice(0, 5);
  const weak = shuffleInPlace([...WEAK_PASSWORD_BANK]).slice(0, 5);
  return shuffleInPlace([...strong, ...weak]);
}

// --- הקומפוננטה המרכזית ---

export default function StrengthRoom({ addScore: addScoreProp, gestureRef }) {
  const { addScore, registerMistake, handleBack } = useContext(GameContext);
  const addScoreFn = addScoreProp || addScore;
  
  const finishedRef = useRef(false);
  const gestureSeenRef = useRef({ lastUpdatedAt: 0, lastAcceptedAt: 0 });
  const nextTimerRef = useRef(null);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => Array.from({ length: QUESTION_COUNT }, () => null));
  const [showNextOverlay, setShowNextOverlay] = useState(false);

  const passwords = useMemo(() => {
    return pickSessionPasswords().map((p) => ({ 
      text: p, 
      strong: isStrongPassword(p) 
    }));
  }, []);

  const isDone = step >= QUESTION_COUNT;
  const current = passwords[Math.min(step, QUESTION_COUNT - 1)];
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
    if (!isDone || finishedRef.current) return;
    finishedRef.current = true;

    const expected = passwords.map((p) => (p.strong ? 'like' : 'dislike'));
    const correctCount = answers.filter((a, idx) => a === expected[idx]).length;

    if (correctCount === QUESTION_COUNT) addScoreFn(100);
    else if (correctCount === 0) registerMistake();
    else addScoreFn(20);
  }, [isDone, answers, passwords, addScoreFn, registerMistake]);

  // זיהוי מחוות ידיים (Thumbs Up/Down ו-ILoveYou)
  useEffect(() => {
    if (!gestureRef?.current) return;
    
    const id = setInterval(() => {
      const g = gestureRef.current;
      if (!g || !g.hasHand) return;

      const gesture = String(g.gesture || 'none');
      const now = Date.now();

      // אם סיימנו - מחפשים רק iLoveYou כדי לחזור
      if (isDone) {
        if (gesture === 'iLoveYou') handleBack();
        return;
      }

      // אם באמצע משחק - מחפשים לייק/דיסלייק עם Cooldown
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
    const expected = passwords.map((p) => (p.strong ? 'like' : 'dislike'));
    const correctCount = answers.filter((a, idx) => a != null && a === expected[idx]).length;
    return { correctCount };
  }, [answers, passwords]);

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
              <div className={styles.password}>{current?.text || ''}</div>
              <div className={styles.screenHint}>
                {locked
                  ? ''
                  : 'Use 👍 / 👎 hand gestures, or click the buttons.'}
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
            {showNextOverlay && (
              <div className={styles.nextOverlay}>Next question</div>
            )}
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