import { useContext } from 'react';
import styles from '../game.module.css';
import { GameContext } from '../../context/gameState.js';

export default function Hud() {
  const { audioMuted, setAudioMuted } = useContext(GameContext);

  return (
    <div className={styles.hud}>
      <div className={styles.hudBlock}>
        <button
          type="button"
          className={`${styles.button} ${audioMuted ? styles.muted : ''}`}
          onClick={() => setAudioMuted((m) => !m)}
        >
          {audioMuted ? 'Music: Off' : 'Music: On'}
        </button>
      </div>
    </div>
  );
}
