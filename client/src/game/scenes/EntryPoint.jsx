import { useContext, useMemo, useState } from 'react';
import styles from '../game.module.css';
import { GameContext } from '../../context/GameContext.jsx';

export default function EntryPoint() {
  const { startGame, playerName: savedName } = useContext(GameContext);
  const [name, setName] = useState(savedName || '');

  const canStart = useMemo(() => true, []);

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Cyber Robot: Safe Quest</h1>
      <p className={styles.subTitle}>
        Enter your name, press START, and help the robot stay safe online.
      </p>

      <div className={styles.row}>
        <input
          className={styles.input}
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Player name"
        />
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          disabled={!canStart}
          onClick={() => startGame(name.trim())}
        >
          START
        </button>
      </div>

      <div className={styles.hr} />
      <div className={styles.small}>
        Tip: In the lobby, click a room button and the robot will walk there before switching.
      </div>
    </div>
  );
}
