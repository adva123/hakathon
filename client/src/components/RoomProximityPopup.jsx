import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './RoomProximityPopup.module.css';

const ROOM_NAMES = {
  password: '🔒 Password Room',
  privacy: '🛡️ Privacy Room',
  shop: '🛒 Shop',
  strength: '💪 Strength Room',
};

const ROOM_DESCRIPTIONS = {
  password: 'Test your password strength skills!',
  privacy: 'Learn about online privacy',
  shop: 'Buy items and upgrades',
  strength: 'Challenge yourself!',
};

export default function RoomProximityPopup({ roomId, onEnter, onDismiss }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // אנימציה של כניסה
    const timer = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    setShow(false);
    setTimeout(() => {
      onEnter(roomId);
    }, 300);
  };

  const handleDismiss = () => {
    setShow(false);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  return (
    <div className={`${styles.overlay} ${show ? styles.show : ''}`}>
      <div className={`${styles.popup} ${show ? styles.popupShow : ''}`}>
        <div className={styles.icon}>🚪</div>
        <h2 className={styles.title}>{ROOM_NAMES[roomId] || 'Room'}</h2>
        <p className={styles.description}>
          {ROOM_DESCRIPTIONS[roomId] || 'Would you like to enter?'}
        </p>
        
        <div className={styles.buttons}>
          <button className={styles.enterBtn} onClick={handleEnter}>
            ✓ Enter Room
          </button>
          <button className={styles.dismissBtn} onClick={handleDismiss}>
            ✗ Continue Walking
          </button>
        </div>

        <div className={styles.hint}>
          💡 You can also enter rooms from the navigation bar
        </div>
      </div>
    </div>
  );
}

RoomProximityPopup.propTypes = {
  roomId: PropTypes.string.isRequired,
  onEnter: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};