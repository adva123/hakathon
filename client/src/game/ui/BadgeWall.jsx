import { useContext } from 'react';
import styles from '../game.module.css';
import { GameContext } from '../../context/GameContext.jsx';

const badgeList = [
  {
    id: 'goldenKey',
    title: 'Golden Key',
    src: '/badges/golden-key.svg',
  },
  {
    id: 'privacyShield',
    title: 'Privacy Shield',
    src: '/badges/privacy-shield.svg',
  },
];

export default function BadgeWall() {
  const { badges } = useContext(GameContext);

  return (
    <div className={styles.badgeWall} aria-label="Badges">
      {badgeList.map((b) => {
        const earned = Boolean(badges?.[b.id]);
        return (
          <div
            key={b.id}
            className={`${styles.badge} ${earned ? '' : styles.badgeLocked}`}
            title={earned ? b.title : `${b.title} (locked)`}
          >
            <img src={b.src} alt={b.title} width={38} height={38} />
          </div>
        );
      })}
    </div>
  );
}
