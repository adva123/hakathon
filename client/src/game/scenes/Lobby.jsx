import { useContext, useMemo } from 'react';
import styles from '../game.module.css';
import { GameContext } from '../../context/gameState.js';
import Hud from '../ui/Hud.jsx';
import BadgeWall from '../ui/BadgeWall.jsx';

function robotPortraitForEquipped(equippedItem) {
  if (equippedItem === 'hat') return '/robot/robot-hat.svg';
  if (equippedItem === 'gold') return '/robot/robot-gold.svg';
  return '/robot/robot.svg';
}

export default function Lobby() {
  const { shopState } = useContext(GameContext);

  const portrait = useMemo(
    () => robotPortraitForEquipped(shopState?.equippedItem),
    [shopState?.equippedItem]
  );

  return (
    <>
      <Hud />
      <BadgeWall />

      <div className={styles.hud} style={{ top: 86, pointerEvents: 'none' }}>
      </div>
    </>
  );
}
