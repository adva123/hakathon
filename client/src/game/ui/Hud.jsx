import { useContext } from 'react';
import styles from '../game.module.css';
import { GameContext } from '../../context/gameState.js';

export default function Hud() {
  const { audioMuted, setAudioMuted } = useContext(GameContext);

  return (
    <div className={styles.hud}>
    </div>
  );
}
