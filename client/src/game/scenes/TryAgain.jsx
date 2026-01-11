import { useContext } from 'react';
import styles from '../game.module.css';
import { GameContext } from '../../context/GameContext.jsx';

export default function TryAgain() {
  const { score, resetRun } = useContext(GameContext);

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Try Again</h1>
      <p className={styles.subTitle}>
        Your energy reached 0. Final score this run: <strong>{score}</strong>
      </p>
      <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={resetRun}>
        Restart
      </button>
      <div className={styles.hr} />
      <div className={styles.small}>
        Tip: Every wrong “Finish/Shield” costs 10 energy.
      </div>
    </div>
  );
}
