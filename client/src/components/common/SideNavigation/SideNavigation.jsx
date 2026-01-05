import { useContext } from 'react';
import PropTypes from 'prop-types';
import { GameContext, SCENES } from '../../../context/gameState.js';
import { MAP_NODES } from '../../../game/mapTargets.js';
import EnergyBar from '../../../game/ui/EnergyBar.jsx';
import styles from './SideNavigation.module.css';

function NeonSvg({ children, viewBox = '0 0 64 64' }) {
  return (
    <svg
      width="34"
      height="34"
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.mapIcon}
    >
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

NeonSvg.propTypes = {
  children: PropTypes.node,
  viewBox: PropTypes.string,
};

function IconThumbUp() {
  return (
    <NeonSvg>
      <path d="M20 30v18" />
      <path d="M20 30c3-8 7-12 11-16 2-2 5 0 5 3v7h12c3 0 5 3 4 6l-4 14c-1 3-3 4-6 4H26c-3 0-6-3-6-6V30z" />
      <path d="M18 30h-4v22h4" />
    </NeonSvg>
  );
}

function IconThumbDown() {
  return (
    <NeonSvg>
      <path d="M20 34V16" />
      <path d="M20 34c3 8 7 12 11 16 2 2 5 0 5-3v-7h12c3 0 5-3 4-6l-4-14c-1-3-3-4-6-4H26c-3 0-6 3-6 6v16z" />
      <path d="M18 12h-4v22h4" />
    </NeonSvg>
  );
}

function IconPalm() {
  return (
    <NeonSvg>
      <path d="M22 42c-3 0-6-3-6-7V24c0-2 2-4 4-4s4 2 4 4v6" />
      <path d="M28 30V16c0-2 2-4 4-4s4 2 4 4v14" />
      <path d="M36 30V18c0-2 2-4 4-4s4 2 4 4v16" />
      <path d="M44 34V22c0-2 2-4 4-4s4 2 4 4v12c0 8-6 14-14 14H30c-2 0-4-1-6-2" />
    </NeonSvg>
  );
}

function IconFist() {
  return (
    <NeonSvg>
      <path d="M18 30v-8c0-2 2-4 4-4s4 2 4 4v8" />
      <path d="M26 30v-9c0-2 2-4 4-4s4 2 4 4v9" />
      <path d="M34 30v-9c0-2 2-4 4-4s4 2 4 4v9" />
      <path d="M42 30v-7c0-2 2-4 4-4s4 2 4 4v12c0 7-5 13-12 13H30c-7 0-12-6-12-13v-5h24" />
    </NeonSvg>
  );
}

function IconILoveYou() {
  return (
    <NeonSvg>
      <path d="M20 40c-3 0-6-3-6-6V22c0-2 2-4 4-4s4 2 4 4v8" />
      <path d="M24 30V16c0-2 2-4 4-4s4 2 4 4v14" />
      <path d="M32 30V20c0-2 2-4 4-4s4 2 4 4v18" />
      <path d="M40 30c2 0 4 2 4 4v6" />
      <path d="M50 44V14" />
    </NeonSvg>
  );
}

export default function SideNavigation({
  gestureEnabled,
  showCalibration,
  activeGesture,
}) {
  const { playerName, score, energy, audioMuted, setAudioMuted, switchRoomWithRobot } = useContext(GameContext);

  const items = [
    { key: 'thumbUp', name: 'Thumb Up', action: 'Right', icon: <IconThumbUp /> },
    { key: 'thumbDown', name: 'Thumb Down', action: 'Left', icon: <IconThumbDown /> },
    { key: 'openPalm', name: 'Open Palm', action: 'Forward', icon: <IconPalm /> },
    { key: 'iLoveYou', name: 'I Love You', action: 'Back', icon: <IconILoveYou /> },
    { key: 'fist', name: 'Fist', action: 'Stop + Block Rooms', icon: <IconFist /> },
  ];

  return (
    <aside className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>Control Panel</div>
        <div className={styles.small}>{playerName ? `Hi ${playerName}!` : 'Hi!'}</div>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.row}>
            <div>
              <div className={styles.title} style={{ marginBottom: 10 }}>Energy</div>
              <EnergyBar energy={energy} />
            </div>
            <div className={styles.kpi}>Score: {score}</div>
          </div>
          <div className={styles.kpis}>
            <button
              type="button"
              className={styles.kpi}
              onClick={() => setAudioMuted((m) => !m)}
            >
              {audioMuted ? 'Music: Off' : 'Music: On'}
            </button>
          </div>
        </div>

        <div className={`${styles.section} ${styles.destinationsSection}`}>
          <div className={styles.title} style={{ marginBottom: 10 }}>Destinations</div>
          <div className={`${styles.kpis} ${styles.destinationsMap}`}>
            <button
              type="button"
              className={`${styles.kpi} ${styles.mapPin}`}
              onClick={() => switchRoomWithRobot(SCENES.password, MAP_NODES[SCENES.password])}
            >
              🛡️ Passwords
            </button>
            <button
              type="button"
              className={`${styles.kpi} ${styles.mapPin}`}
              onClick={() => switchRoomWithRobot(SCENES.privacy, MAP_NODES[SCENES.privacy])}
            >
              🔒 Privacy
            </button>
            <button
              type="button"
              className={`${styles.kpi} ${styles.mapPin}`}
              onClick={() => switchRoomWithRobot(SCENES.shop, MAP_NODES[SCENES.shop])}
            >
              🛍️ Shop
            </button>
          </div>
          <div className={styles.small}>Robot auto-navigates on the map.</div>
        </div>

        <div className={styles.section}>
          <div className={styles.title} style={{ marginBottom: 10 }}>Gesture Guide</div>
          <div className={styles.gestureGrid}>
            {items.map((it) => (
              <div
                key={it.key}
                className={`${styles.gestureCard} ${activeGesture === it.key ? styles.active : ''}`}
              >
                <div className={styles.row}>
                  <div className={styles.iconWrap}>{it.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div className={styles.gestureName}>{it.action}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.title} style={{ marginBottom: 8 }}>Hand Tracking</div>
        <div className={styles.small}>
          {gestureEnabled
            ? showCalibration
              ? 'Calibrating… check the minimap (bottom-right).'
              : 'Active (see minimap bottom-right).'
            : 'Disabled'}
        </div>
      </div>
    </aside>
  );
}

SideNavigation.propTypes = {
  gestureEnabled: PropTypes.bool,
  showCalibration: PropTypes.bool,
  activeGesture: PropTypes.string,
};
