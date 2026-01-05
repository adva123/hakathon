// import { useContext, useMemo, useRef, useState } from 'react';
// import { GameContext, SCENES } from '../../context/gameState.js';
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
//     allOk: met === 4,
//   };
// }

// const criteriaMeta = [
//   { key: 'lengthOk', label: '8+ characters' },
//   { key: 'uppercaseOk', label: 'Uppercase (A-Z)' },
//   { key: 'numberOk', label: 'Number (0-9)' },
//   { key: 'specialOk', label: 'Special (!@#$%^&*)' },
// ];

// export default function PasswordRoom() {
//   const { playerName, addScore, registerMistake, awardBadge, switchRoom, badges } = useContext(GameContext);

//   const [password, setPassword] = useState('');
//   const [message, setMessage] = useState('');
//   const [defeated, setDefeated] = useState(false);
//   const [hitPulse, setHitPulse] = useState(0);
//   const [laserBursts, setLaserBursts] = useState([]); // [{id, key}]

//   // Persistently tracks which conditions have been achieved at least once.
//   const [achieved, setAchieved] = useState(() => new Set());
//   const [virusHp, setVirusHp] = useState(100);

//   const prevSatisfiedRef = useRef(new Set());
//   const timeoutsRef = useRef([]);

//   const result = useMemo(() => evaluatePassword(password), [password]);
//   const hp = virusHp;
//   const ticksOn = useMemo(() => achieved.size, [achieved]);

//   const alreadyEarned = Boolean(badges?.goldenKey);

//   const onPasswordChange = (e) => {
//     const next = e.target.value;
//     setPassword(next);

//     if (defeated) return;

//     // Track newly satisfied criteria to trigger laser + hit animation only once per criterion.
//     const nextResult = evaluatePassword(next);
//     const now = new Set(criteriaMeta.filter((c) => Boolean(nextResult[c.key])).map((c) => c.key));
//     const prev = prevSatisfiedRef.current;

//     const newlyMet = [];
//     for (const key of now) {
//       if (!prev.has(key)) newlyMet.push(key);
//     }

//     if (newlyMet.length > 0) {
//       addScore(5 * newlyMet.length);
//       setHitPulse((x) => x + 1);

//       const burstKeyBase = Date.now();
//       setLaserBursts((prevBursts) => [
//         ...prevBursts,
//         ...newlyMet.map((id, idx) => ({ id, key: `${burstKeyBase}-${idx}-${id}` })),
//       ]);

//       for (const t of timeoutsRef.current) clearTimeout(t);
//       timeoutsRef.current = [];
//       const t = setTimeout(() => {
//         setLaserBursts([]);
//       }, 500);
//       timeoutsRef.current.push(t);
//     }

//     prevSatisfiedRef.current = now;

//     // Persistently reduce virus HP for NEW achievements (HP never goes back up).
//     setAchieved((prevAchieved) => {
//       const nextAchieved = new Set(prevAchieved);
//       let newlyAchievedCount = 0;
//       for (const key of now) {
//         if (!nextAchieved.has(key)) {
//           nextAchieved.add(key);
//           newlyAchievedCount += 1;
//         }
//       }

//       if (newlyAchievedCount > 0) {
//         setVirusHp((prevHp) => {
//           const nextHp = Math.max(0, prevHp - newlyAchievedCount * 25);
//           if (nextHp === 0) {
//             setDefeated(true);
//             setMessage('✅ Virus crushed! Golden Key earned.');
//             awardBadge('goldenKey');
//             addScore(50);
//           }
//           return nextHp;
//         });
//       }

//       return nextAchieved;
//     });
//   };

//   const submit = () => {
//     if (virusHp === 0) return;
//     registerMistake();
//     const missing = [
//       result.lengthOk ? null : '8+ characters',
//       result.uppercaseOk ? null : 'uppercase letter',
//       result.numberOk ? null : 'number',
//       result.specialOk ? null : 'special symbol (!@#$%^&*)',
//     ].filter(Boolean);
//     setMessage(`⚠️ Shield weak. Missing: ${missing.join(', ')}`);
//   };

//   const back = () => switchRoom(SCENES.lobby);

//   // Map a criterion -> which “laser lane” to use.
//   const laserClassFor = (id) => {
//     if (id === 'lengthOk') return styles.laser;
//     if (id === 'uppercaseOk') return `${styles.laser} ${styles.laser2}`;
//     if (id === 'numberOk') return `${styles.laser} ${styles.laser3}`;
//     return `${styles.laser} ${styles.laser4}`;
//   };

//   return (
//     <div className={styles.wrap}>
//       <div className={styles.cockpit}>
//         <div className={styles.header}>
//           <div>
//             <h2 className={styles.title}>
//               Password Shield <span className={styles.neonTag}>{'// Virus Crusher'}</span>
//             </h2>
//             <p className={styles.subtitle}>
//               {playerName ? `${playerName}, build a strong password and fire neon lasers.` :
//                 'Build a strong password and fire neon lasers.'}
//             </p>
//           </div>
//           <div style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700 }}>
//             Target: <span className={styles.neonTag}>HP 0%</span>
//           </div>
//         </div>

//         <div className={styles.grid}>
//           {/* Lasers (robot -> virus), appear only when NEW criteria become satisfied */}
//           {laserBursts.map((b) => (
//             <div
//               key={b.key}
//               className={`${laserClassFor(b.id)} ${styles.laserFire}`}
//               aria-hidden="true"
//             />
//           ))}

//           <div className={styles.panel}>
//             <div className={styles.row}>
//               <input
//                 className={styles.input}
//                 value={password}
//                 onChange={onPasswordChange}
//                 placeholder="Type password…"
//                 aria-label="Password input"
//               />
//               <button
//                 type="button"
//                 className={`${styles.btn} ${styles.btnPrimary}`}
//                 onClick={submit}
//                 disabled={defeated}
//               >
//                 FIRE SHIELD
//               </button>
//               <button type="button" className={styles.btn} onClick={back}>
//                 Back
//               </button>
//             </div>

//             <div className={styles.criteria}>
//               {criteriaMeta.map((c) => {
//                 const ok = Boolean(result[c.key]);
//                 return (
//                   <div key={c.key} className={`${styles.crit} ${ok ? styles.critOn : ''}`}>
//                     <div>{c.label}</div>
//                     <div className={`${styles.pip} ${ok ? styles.pipOn : ''}`} aria-label={ok ? 'met' : 'not met'} />
//                   </div>
//                 );
//               })}
//             </div>

//             <div className={styles.hpWrap}>
//               <div className={styles.hpTop}>
//                 <div>Virus Health</div>
//                 <div>
//                   <span className={styles.neonTag}>{hp}%</span>
//                 </div>
//               </div>
//               <div className={styles.hpBar}>
//                 <div className={styles.hpFill} style={{ width: `${hp}%` }} />
//               </div>
//               <div className={styles.hpTicks}>
//                 {[0, 1, 2, 3].map((i) => (
//                   <div
//                     key={i}
//                     className={`${styles.hpTick} ${ticksOn > i ? styles.hpTickOn : ''}`}
//                     aria-hidden="true"
//                   />
//                 ))}
//               </div>
//             </div>

//             {message ? <div className={styles.message}>{message}</div> : null}
//             <div className={styles.hint}>
//               Each new rule triggers a laser and removes <span className={styles.neonTag}>25%</span> HP.
//               {alreadyEarned ? ' (Golden Key already saved)' : ''}
//             </div>
//           </div>

//           <div className={styles.virusBay}>
//             <div className={styles.robotEmitter} aria-hidden="true">
//               <div className={styles.emitterIcon}>🤖</div>
//               <div className={styles.emitterGlow} />
//             </div>
//             <div
//               className={`${styles.virus} ${hitPulse ? styles.hit : ''} ${defeated ? styles.defeated : ''}`}
//               aria-label="Virus"
//               key={`${defeated}-${hitPulse}`}
//             >
//               <div className={styles.virusCore}>☠</div>
//             </div>
//             <div className={styles.explosionRing} aria-hidden="true" />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
import { useContext, useMemo, useRef, useState } from 'react';
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
  };
}

const criteriaMeta = [
  { key: 'lengthOk', label: '8+ characters' },
  { key: 'uppercaseOk', label: 'Uppercase (A-Z)' },
  { key: 'numberOk', label: 'Number (0-9)' },
  { key: 'specialOk', label: 'Special (!@#$%^&*)' },
];

export default function PasswordRoom({ addScore: addScoreProp, awardBadge: awardBadgeProp } = {}) {
  const { playerName, addScore, registerMistake, awardBadge, handleBack, badges } = useContext(GameContext);
  const addScoreFn = addScoreProp || addScore;
  const awardBadgeFn = awardBadgeProp || awardBadge;

  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [defeated, setDefeated] = useState(false);

  // Laser + virus feedback
  const [hitPulse, setHitPulse] = useState(0);
  const [laserBursts, setLaserBursts] = useState([]); // [{ id, key }]

  // NEW condition tracking (persistent)
  const [achieved, setAchieved] = useState(() => new Set());
  const [virusHp, setVirusHp] = useState(100);

  const prevSatisfiedRef = useRef(new Set()); // for laser timing
  const timeoutsRef = useRef([]);

  const result = useMemo(() => evaluatePassword(password), [password]);
  const hp = virusHp;
  const ticksOn = useMemo(() => achieved.size, [achieved]);

  const alreadyEarned = Boolean(badges?.goldenKey);

  const onPasswordChange = (e) => {
    const next = e.target.value;
    setPassword(next);

    if (defeated) return;

    const nextResult = evaluatePassword(next);

    // Which conditions are satisfied right now (for laser animation)
    const now = new Set(
      criteriaMeta.filter((c) => Boolean(nextResult[c.key])).map((c) => c.key)
    );
    const prev = prevSatisfiedRef.current;

    // NEW satisfied (compared to previous keystroke) -> lasers + hit pulse
    const newlyMetForLaser = [];
    for (const key of now) {
      if (!prev.has(key)) newlyMetForLaser.push(key);
    }

    if (newlyMetForLaser.length > 0) {
      addScoreFn(5 * newlyMetForLaser.length);
      setHitPulse((x) => x + 1);

      const burstKeyBase = Date.now();
      setLaserBursts((prevBursts) => [
        ...prevBursts,
        ...newlyMetForLaser.map((id, idx) => ({
          id,
          key: `${burstKeyBase}-${idx}-${id}`,
        })),
      ]);

      for (const t of timeoutsRef.current) clearTimeout(t);
      timeoutsRef.current = [];
      const t = setTimeout(() => setLaserBursts([]), 500);
      timeoutsRef.current.push(t);

      // Bridge to 3D Password combat: fire beam + sparks in the R3F canvas.
      window.dispatchEvent(
        new CustomEvent('hakathon.password.hit', {
          detail: { count: newlyMetForLaser.length },
        }),
      );
    }

    prevSatisfiedRef.current = now;

    // NEW achievements (persistent) -> HP drops 25% per new condition
    setAchieved((prevAchieved) => {
      const nextAchieved = new Set(prevAchieved);
      let newlyAchievedCount = 0;

      for (const key of now) {
        if (!nextAchieved.has(key)) {
          nextAchieved.add(key);
          newlyAchievedCount += 1;
        }
      }

      if (newlyAchievedCount > 0) {
        setVirusHp((prevHp) => {
          const nextHp = Math.max(0, prevHp - newlyAchievedCount * 25);

          if (nextHp === 0) {
            setDefeated(true);
            setMessage('✅ Virus crushed! Golden Key earned.');
            awardBadgeFn('goldenKey');
            addScoreFn(50);
          }

          return nextHp;
        });
      }

      return nextAchieved;
    });
  };

  const submit = () => {
    if (virusHp === 0) return;

    registerMistake();

    const missing = [
      result.lengthOk ? null : '8+ characters',
      result.uppercaseOk ? null : 'uppercase letter',
      result.numberOk ? null : 'number',
      result.specialOk ? null : 'special symbol (!@#$%^&*)',
    ].filter(Boolean);

    setMessage(`⚠️ Shield weak. Missing: ${missing.join(', ')}`);
  };

  const back = () => handleBack();

  // Lane mapping: which laser line to fire for each condition
  const laserClassFor = (id) => {
    if (id === 'lengthOk') return styles.laser;
    if (id === 'uppercaseOk') return `${styles.laser} ${styles.laser2}`;
    if (id === 'numberOk') return `${styles.laser} ${styles.laser3}`;
    return `${styles.laser} ${styles.laser4}`;
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.cockpit}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              Password Shield <span className={styles.neonTag}>{'// Virus Crusher'}</span>
            </h2>
            <p className={styles.subtitle}>
              {playerName
                ? `${playerName}, build a strong password and fire neon lasers.`
                : 'Build a strong password and fire neon lasers.'}
            </p>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700 }}>
            Target: <span className={styles.neonTag}>HP 0%</span>
          </div>
        </div>

        <div className={styles.grid}>
          {/* Lasers (robot -> virus), only when a NEW condition becomes satisfied */}
          {laserBursts.map((b) => (
            <div
              key={b.key}
              className={`${laserClassFor(b.id)} ${styles.laserFire}`}
              aria-hidden="true"
            />
          ))}

          <div className={styles.panel}>
            <div className={styles.row}>
              <input
                className={styles.input}
                value={password}
                onChange={onPasswordChange}
                placeholder="Type password…"
                aria-label="Password input"
              />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={submit}
                disabled={defeated}
              >
                FIRE SHIELD
              </button>
              <button type="button" className={styles.btn} onClick={back}>
                Back
              </button>
            </div>

            <div className={styles.criteria}>
              {criteriaMeta.map((c) => {
                const ok = Boolean(result[c.key]);
                return (
                  <div key={c.key} className={`${styles.crit} ${ok ? styles.critOn : ''}`}>
                    <div>{c.label}</div>
                    <div
                      className={`${styles.pip} ${ok ? styles.pipOn : ''}`}
                      aria-label={ok ? 'met' : 'not met'}
                    />
                  </div>
                );
              })}
            </div>

            <div className={styles.hpWrap}>
              <div className={styles.hpTop}>
                <div>Virus Health</div>
                <div>
                  <span className={styles.neonTag}>{hp}%</span>
                </div>
              </div>

              <div className={styles.hpBar}>
                <div className={styles.hpFill} style={{ width: `${hp}%` }} />
              </div>

              <div className={styles.hpTicks}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`${styles.hpTick} ${ticksOn > i ? styles.hpTickOn : ''}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>

            {message ? <div className={styles.message}>{message}</div> : null}

            <div className={styles.hint}>
              Each new rule triggers a laser and removes{' '}
              <span className={styles.neonTag}>25%</span> HP.
              {alreadyEarned ? ' (Golden Key already saved)' : ''}
            </div>
          </div>

          <div className={styles.virusBay}>
            {/* Robot “emitter” (visual source of lasers) */}
            <div className={styles.robotEmitter} aria-hidden="true">
              <div className={styles.emitterIcon}>🤖</div>
              <div className={styles.emitterGlow} />
            </div>

            <div
              className={`${styles.virus} ${hitPulse ? styles.hit : ''} ${
                defeated ? styles.defeated : ''
              }`}
              aria-label="Virus"
              key={`${defeated}-${hitPulse}`}
            >
              <div className={styles.virusCore}>☠</div>
            </div>

            <div className={styles.explosionRing} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

PasswordRoom.propTypes = {
  addScore: PropTypes.func,
  awardBadge: PropTypes.func,
};