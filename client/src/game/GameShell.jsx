import { useContext, useEffect, useRef, useState } from 'react';
import ThreeDemo from '../ThreeDemo.jsx';
import { GameContext, SCENES } from '../context/gameState.js';
import { MAP_NODES } from './mapTargets.js';
import styles from './game.module.css';
import MainGameContainer from './MainGameContainer.jsx';
import SideNavigation from '../components/common/SideNavigation/SideNavigation.jsx';
import GestureManager from '../components/common/GestureManager/GestureManager.jsx';
import bgTrackUrl from '../music/A.mp3';

function useBackgroundAudio({ muted }) {
  const audioRef = useRef(null);

  // Lazy-create audio element once.
  useEffect(() => {
    const audio = new Audio(bgTrackUrl);
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;

    return () => {
      try {
        audio.pause();
      } catch {
        // ignore
      }
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (muted) {
      audio.muted = true;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
      return;
    }

    audio.muted = false;

    // Autoplay may be blocked until user interaction; ignore errors.
    audio.play().catch(() => {});
  }, [muted]);

  return audioRef;
}

export default function GameShell() {
  const {
    currentScene,
    audioMuted,
    robotAutoWalkTarget,
    onRobotArrived,
    switchRoom,
    switchRoomWithRobot,
    activeOverlayRoom,
    lobbyReturnEvent,
    gateCollisionCooldownUntil,
    shopState,
    badges,
    avatarFaceDataUrl,
    avatarDominantColor,
  } = useContext(GameContext);

  const bgAudioRef = useBackgroundAudio({ muted: audioMuted });

  // Start directly in the game (skip the level-map landing).
  const [showLevelMap, setShowLevelMap] = useState(false);

  // Quick “tunnel” transition when entering password rooms.
  const [tunnelActive, setTunnelActive] = useState(false);
  const prevOverlayRef = useRef(null);
  const tunnelTimerRef = useRef(null);

  useEffect(() => {
    const prev = prevOverlayRef.current;
    prevOverlayRef.current = activeOverlayRoom;

    const enteringOverlay = !prev && activeOverlayRoom === SCENES.password;
    const enteringCave = currentScene === SCENES.strength;
    const entering = enteringOverlay || enteringCave;
    if (!entering) return;

    setTunnelActive(true);
    if (tunnelTimerRef.current) clearTimeout(tunnelTimerRef.current);
    tunnelTimerRef.current = setTimeout(() => {
      setTunnelActive(false);
      tunnelTimerRef.current = null;
    }, 650);

    return () => {
      if (tunnelTimerRef.current) {
        clearTimeout(tunnelTimerRef.current);
        tunnelTimerRef.current = null;
      }
    };
  }, [activeOverlayRoom, currentScene]);

  // Avoid blocking the UI behind a "show your hand" calibration step.
  const [gestureCalibrated, setGestureCalibrated] = useState(true);
  const [activeGesture, setActiveGesture] = useState('none');
  const gestureRef = useRef({
    gesture: 'none',
    velocity: { x: 0, z: 0 },
    hasHand: false,
    updatedAt: 0,
  });
  const lastGestureForUiRef = useRef('none');

  const handTrackingEnabled = currentScene === SCENES.lobby || currentScene === SCENES.strength;

  const controlsEnabled = currentScene === SCENES.lobby && !activeOverlayRoom && !robotAutoWalkTarget;
  // Maintain consistent 3D lighting across all scenes.
  const neonMode = true;

  if (showLevelMap) {
    return (
      <div className={styles.root}>
        <div className={styles.mapWrap}>
          <iframe className={styles.mapFrame} src="/level-map/" title="Candy Crush Level Map" />

          <div className={styles.mapOverlay}>
            <div className={styles.mapCard}>
              <div className={styles.mapTitle}>Candy Crush Map</div>
              <div className={styles.mapSubtitle}>
                Choose a level on the map, then press Play.
              </div>
              <div className={styles.mapActions}>
                <button
                  type="button"
                  className={styles.mapPrimaryButton}
                  onClick={() => {
                    setShowLevelMap(false);
                    // Ensure we start from the lobby when entering the 3D world.
                    switchRoom(SCENES.lobby);
                  }}
                >
                  Play
                </button>

                <a className={styles.mapSecondaryButton} href="/candy-maze.html" target="_blank" rel="noreferrer">
                  Open Candy Maze
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <ThreeDemo
        autoWalkTarget={robotAutoWalkTarget}
        onAutoWalkArrived={onRobotArrived}
        controlsEnabled={controlsEnabled}
        sceneId={currentScene}
        neonMode={neonMode}
        lobbyReturnEvent={lobbyReturnEvent}
        gateCollisionCooldownUntil={gateCollisionCooldownUntil}
        bgAudioRef={bgAudioRef}
        avatarFaceUrl={avatarFaceDataUrl || null}
        avatarDominantColor={avatarDominantColor || null}
        badges={badges}
        shopState={shopState}
        equippedItem={shopState?.equippedItem || null}
        gestureRef={gestureRef}
        onLobbyPoiNavigate={(sceneId) => {
          if (sceneId && Object.values(SCENES).includes(sceneId) && MAP_NODES?.[sceneId]) {
            switchRoomWithRobot(sceneId, MAP_NODES[sceneId]);
          }
        }}
        onLobbyPortalEnter={(sceneId) => {
          // Scene IDs in ThreeDemo match SCENES keys.
          if (sceneId && Object.values(SCENES).includes(sceneId)) {
            switchRoom(sceneId);
          }
        }}
      />

      <SideNavigation
        gestureEnabled={handTrackingEnabled}
        showCalibration={currentScene === SCENES.lobby && !gestureCalibrated}
        activeGesture={activeGesture}
      />

      <GestureManager
        enabled={handTrackingEnabled}
        showCalibration={currentScene === SCENES.lobby && !gestureCalibrated}
        onCalibrated={() => setGestureCalibrated(true)}
        onGesture={(g) => {
          const nextGesture = g?.gesture || 'none';
          gestureRef.current = {
            gesture: nextGesture,
            velocity: g?.velocity || { x: 0, z: 0 },
            hasHand: Boolean(g?.hasHand),
            updatedAt: performance.now(),
          };

          if (nextGesture !== lastGestureForUiRef.current) {
            lastGestureForUiRef.current = nextGesture;
            setActiveGesture(nextGesture);
          }
        }}
        variant="minimap"
      />

      <div className={styles.overlay}>
        {tunnelActive ? <div className={styles.tunnelOverlay} aria-hidden="true" /> : null}
        <MainGameContainer gestureRef={gestureRef} />
      </div>
    </div>
  );
}
