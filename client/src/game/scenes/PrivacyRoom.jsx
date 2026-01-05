import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import styles from '../game.module.css';
import room from './PrivacyRoom.module.css';
import { GameContext } from '../../context/gameState.js';

const initial = Object.freeze({
  firstName: true,
  photo: true,
  hobbies: true,
  school: false,
  address: false,
  phone: false,
});

export default function PrivacyRoom({ addScore: addScoreProp, awardBadge: awardBadgeProp } = {}) {
  const { playerName, addScore, registerMistake, awardBadge, handleBack, badges } = useContext(GameContext);
  const addScoreFn = addScoreProp || addScore;
  const awardBadgeFn = awardBadgeProp || awardBadge;

  const [toggles, setToggles] = useState({ ...initial });
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState(''); // 'danger' | 'ok' | ''
  const [scanning, setScanning] = useState(false);
  const scanTimerRef = useRef(null);

  const unsafeOn = useMemo(() => {
    return Boolean(toggles.address || toggles.phone);
  }, [toggles]);

  const alreadyEarned = Boolean(badges?.privacyShield);

  // Bridge state to 3D UI (floating glass panel in the canvas)
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('hakathon.privacy.profile', {
        detail: {
          toggles,
          scanning,
          unsafeOn,
          message,
          messageKind,
          playerName: playerName || '',
        },
      }),
    );
  }, [toggles, scanning, unsafeOn, message, messageKind, playerName]);

  const submit = () => {
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    setMessage('');
    setMessageKind('');
    setScanning(true);

    scanTimerRef.current = window.setTimeout(() => {
      setScanning(false);
      scanTimerRef.current = null;

      if (unsafeOn) {
        registerMistake();
        setMessageKind('danger');
        setMessage('⚠️ Warning: Home Address / Phone should not be public. Turn them OFF.');
        return;
      }

      setMessageKind('ok');
      if (alreadyEarned) {
        setMessage('✅ Privacy Shield already earned — great choices.');
        return;
      }

      awardBadgeFn('privacyShield');
      addScoreFn(50);
      setMessage('✅ Scan complete — you earned the Privacy Shield badge.');
    }, 900);
  };

  const back = () => handleBack();

  const toggle = (key) => {
    setToggles((t) => ({ ...t, [key]: !t[key] }));
  };

  return (
    <div className={`${styles.panel} ${room.room}`}>
      <div className={room.header}>
        <div>
          <h2 className={room.title}>🔒 Privacy Scanner — Social Profile</h2>
          <div className={`${styles.small} ${room.subtitle}`}>
            {playerName ? `${playerName}, keep sensitive info private.` : 'Keep sensitive info private.'}
          </div>
        </div>
        <div className="neonGlow">SCAN MODE</div>
      </div>

      <div className={styles.hr} />

      <div className={`${room.controls} glassNeon`}>
        <div className={room.cardTop}>
          <div className={room.cardName}>3D Profile Panel</div>
          <div className={room.badge}>{unsafeOn ? 'SENSITIVE DATA ON' : 'SAFE MODE'}</div>
        </div>

        <div className={room.controls}>
          <div className={room.toggleRow}>
            <div className={room.toggleText}>
              <div>First name</div>
              <div className={room.toggleHint}>Safe to share in many cases</div>
            </div>
            <button type="button" className={styles.button} onClick={() => toggle('firstName')}>
              {toggles.firstName ? 'ON ✅' : 'OFF ❌'}
            </button>
          </div>

          <div className={room.toggleRow}>
            <div className={room.toggleText}>
              <div>Photo</div>
              <div className={room.toggleHint}>Only share with people you trust</div>
            </div>
            <button type="button" className={styles.button} onClick={() => toggle('photo')}>
              {toggles.photo ? 'ON ✅' : 'OFF ❌'}
            </button>
          </div>

          <div className={room.toggleRow}>
            <div className={room.toggleText}>
              <div>Hobbies</div>
              <div className={room.toggleHint}>General info is usually OK</div>
            </div>
            <button type="button" className={styles.button} onClick={() => toggle('hobbies')}>
              {toggles.hobbies ? 'ON ✅' : 'OFF ❌'}
            </button>
          </div>

          <div className={room.toggleRow}>
            <div className={room.toggleText}>
              <div>School</div>
              <div className={room.toggleHint}>Be careful with identifying details</div>
            </div>
            <button type="button" className={styles.button} onClick={() => toggle('school')}>
              {toggles.school ? 'ON ✅' : 'OFF ❌'}
            </button>
          </div>

          <div className={room.toggleRow}>
            <div className={room.toggleText}>
              <div>Home Address</div>
              <div className={room.toggleHint}>Sensitive — keep private</div>
            </div>
            <button type="button" className={styles.button} onClick={() => toggle('address')}>
              {toggles.address ? 'ON ✅' : 'OFF ❌'}
            </button>
          </div>

          <div className={`${room.toggleRow} ${room.toggleRowLast}`}>
            <div className={room.toggleText}>
              <div>Phone</div>
              <div className={room.toggleHint}>Sensitive — keep private</div>
            </div>
            <button type="button" className={styles.button} onClick={() => toggle('phone')}>
              {toggles.phone ? 'ON ✅' : 'OFF ❌'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.hr} />

      <div className={`${styles.row} ${room.actions}`}>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={submit}
          disabled={scanning}
        >
          {scanning ? 'Scanning…' : 'Finish'}
        </button>
        <button type="button" className={styles.button} onClick={back}>
          Back
        </button>
      </div>

      {message ? (
        <div
          role={messageKind === 'danger' ? 'alert' : undefined}
          className={`${room.alert} ${messageKind === 'danger' ? room.alertDanger : room.alertOk}`}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}

PrivacyRoom.propTypes = {
  addScore: PropTypes.func,
  awardBadge: PropTypes.func,
};
