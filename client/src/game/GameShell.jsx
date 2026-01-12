// import { useContext, useEffect, useRef, useState } from 'react';
// import ThreeDemo from '../features/world/ThreeDemo.jsx';
// import { GameContext, SCENES } from '../context/GameContext.jsx';
// import { MAP_NODES } from './mapTargets.js';
// import styles from './game.module.css';
// import MainGameContainer from './MainGameContainer.jsx';
// import SideNavigation from '../components/common/SideNavigation/SideNavigation.jsx';
// import GestureManager from '../components/common/GestureManager/GestureManager.jsx';
// import bgTrackUrl from '../music/A.mp3';

// function useBackgroundAudio({ muted }) {
//   const audioRef = useRef(null);

//   // Lazy-create audio element once.
//   useEffect(() => {
//     const audio = new Audio(bgTrackUrl);
//     audio.loop = true;
//     audio.volume = 0.35;
//     audioRef.current = audio;

//     return () => {
//       try {
//         audio.pause();
//       } catch {
//         // ignore
//       }
//       audioRef.current = null;
//     };
//   }, []);

//   useEffect(() => {
//     const audio = audioRef.current;
//     if (!audio) return;

//     if (muted) {
//       audio.muted = true;
//       try {
//         audio.pause();
//         audio.currentTime = 0;
//       } catch {
//         // ignore
//       }
//       return;
//     }

//     audio.muted = false;

//     // Autoplay may be blocked until user interaction; ignore errors.
//     audio.play().catch(() => {});
//   }, [muted]);

//   return audioRef;
// }

// export default function GameShell() {
//   const {
//     currentScene,
//     audioMuted,
//     robotAutoWalkTarget,
//     onRobotArrived,
//     switchRoom,
//     switchRoomWithRobot,
//     activeOverlayRoom,
//     lobbyReturnEvent,
//     gateCollisionCooldownUntil,
//     shopState,
//     badges,
//     avatarFaceDataUrl,
//     avatarDominantColor,
//   } = useContext(GameContext);

//   const bgAudioRef = useBackgroundAudio({ muted: audioMuted });

//   // Start directly in the game (skip the level-map landing).
//   const [showLevelMap, setShowLevelMap] = useState(false);

//   // Quick “tunnel” transition when entering password rooms.
//   const [tunnelActive, setTunnelActive] = useState(false);
//   const prevOverlayRef = useRef(null);
//   const tunnelTimerRef = useRef(null);

//   useEffect(() => {
//     const prev = prevOverlayRef.current;
//     prevOverlayRef.current = activeOverlayRoom;

//     const enteringOverlay = !prev && activeOverlayRoom === SCENES.password;
//     const enteringCave = currentScene === SCENES.strength;
//     const entering = enteringOverlay || enteringCave;
//     if (!entering) return;

//     setTunnelActive(true);
//     if (tunnelTimerRef.current) clearTimeout(tunnelTimerRef.current);
//     tunnelTimerRef.current = setTimeout(() => {
//       setTunnelActive(false);
//       tunnelTimerRef.current = null;
//     }, 650);

//     return () => {
//       if (tunnelTimerRef.current) {
//         clearTimeout(tunnelTimerRef.current);
//         tunnelTimerRef.current = null;
//       }
//     };
//   }, [activeOverlayRoom, currentScene]);

//   // Avoid blocking the UI behind a "show your hand" calibration step.
//   const [gestureCalibrated, setGestureCalibrated] = useState(true);
//   const [activeGesture, setActiveGesture] = useState('none');
//   const gestureRef = useRef({
//     gesture: 'none',
//     velocity: { x: 0, z: 0 },
//     hasHand: false,
//     updatedAt: 0,
//   });
//   const lastGestureForUiRef = useRef('none');

//   const handTrackingEnabled = currentScene === SCENES.lobby || currentScene === SCENES.strength;

//   const controlsEnabled = currentScene === SCENES.lobby && !activeOverlayRoom && !robotAutoWalkTarget;
//   // Maintain consistent 3D lighting across all scenes.
//   const neonMode = true;

//   if (showLevelMap) {
//     return (
//       <div className={styles.root}>
//         <div className={styles.mapWrap}>
//           <iframe className={styles.mapFrame} src="/level-map/" title="Candy Crush Level Map" />

//           <div className={styles.mapOverlay}>
//             <div className={styles.mapCard}>
//               <div className={styles.mapTitle}>Candy Crush Map</div>
//               <div className={styles.mapSubtitle}>
//                 Choose a level on the map, then press Play.
//               </div>
//               <div className={styles.mapActions}>
//                 <button
//                   type="button"
//                   className={styles.mapPrimaryButton}
//                   onClick={() => {
//                     setShowLevelMap(false);
//                     // Ensure we start from the lobby when entering the 3D world.
//                     switchRoom(SCENES.lobby);
//                   }}
//                 >
//                   Play
//                 </button>

//                 <a className={styles.mapSecondaryButton} href="/candy-maze.html" target="_blank" rel="noreferrer">
//                   Open Candy Maze
//                 </a>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.root}>
//       <ThreeDemo
//         autoWalkTarget={robotAutoWalkTarget}
//         onAutoWalkArrived={onRobotArrived}
//         controlsEnabled={controlsEnabled}
//         sceneId={currentScene}
//         activeOverlayRoom={activeOverlayRoom}
//         neonMode={neonMode}
//         lobbyReturnEvent={lobbyReturnEvent}
//         gateCollisionCooldownUntil={gateCollisionCooldownUntil}
//         bgAudioRef={bgAudioRef}
//         avatarFaceUrl={avatarFaceDataUrl || null}
//         avatarDominantColor={avatarDominantColor || null}
//         badges={badges}
//         shopState={shopState}
//         equippedItem={shopState?.equippedItem || null}
//         gestureRef={gestureRef}
//         onLobbyPoiNavigate={(sceneId) => {
//           if (sceneId && Object.values(SCENES).includes(sceneId) && MAP_NODES?.[sceneId]) {
//             switchRoomWithRobot(sceneId, MAP_NODES[sceneId]);
//           }
//         }}
//         onLobbyPortalEnter={(sceneId) => {
//           // Scene IDs in ThreeDemo match SCENES keys.
//           if (sceneId && Object.values(SCENES).includes(sceneId)) {
//             switchRoom(sceneId);
//           }
//         }}
//       />

//       <SideNavigation
//         gestureEnabled={handTrackingEnabled}
//         showCalibration={currentScene === SCENES.lobby && !gestureCalibrated}
//         activeGesture={activeGesture}
//       />

//       <GestureManager
//         enabled={handTrackingEnabled}
//         showCalibration={currentScene === SCENES.lobby && !gestureCalibrated}
//         onCalibrated={() => setGestureCalibrated(true)}
//         onGesture={(g) => {
//           const nextGesture = g?.gesture || 'none';
//           gestureRef.current = {
//             gesture: nextGesture,
//             velocity: g?.velocity || { x: 0, z: 0 },
//             hasHand: Boolean(g?.hasHand),
//             updatedAt: performance.now(),
//           };

//           if (nextGesture !== lastGestureForUiRef.current) {
//             lastGestureForUiRef.current = nextGesture;
//             setActiveGesture(nextGesture);
//           }
//         }}
//         variant="minimap"
//       />

//       <div className={styles.overlay}>
//         {tunnelActive ? <div className={styles.tunnelOverlay} aria-hidden="true" /> : null}
//         <MainGameContainer gestureRef={gestureRef} />
//       </div>
//     </div>
//   );
// }
import { useContext, useEffect, useRef, useState } from 'react';
import ThreeDemo from '../features/world/ThreeDemo.jsx';
import { GameContext, SCENES } from '../context/GameContext.jsx';
import { MAP_NODES } from './mapTargets.js';
import styles from './game.module.css';
import blurStyles from '../game/scenes/RoomOverlayBg.jsx';
import MainGameContainer from './MainGameContainer.jsx';
import SideNavigation from '../components/common/SideNavigation/SideNavigation.jsx';
import GestureManager from '../components/common/GestureManager/GestureManager.jsx';
import RoomProximityPopup from '../components/RoomProximityPopup.jsx';
import bgTrackUrl from '../music/A.mp3';

function useBackgroundAudio({ muted }) {
  const audioRef = useRef(null);

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
    audio.play().catch(() => {});
  }, [muted]);

  return audioRef;
}

export default function GameShell() {
  const context = useContext(GameContext);

  if (!context) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '24px',
        color: 'red'
      }}>
        ❌ GameContext not found! Make sure App is wrapped with GameProvider.
      </div>
    );
  }

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
  } = context;

  const bgAudioRef = useBackgroundAudio({ muted: audioMuted });

  const [showLevelMap, setShowLevelMap] = useState(false);
  const [tunnelActive, setTunnelActive] = useState(false);
  const prevOverlayRef = useRef(null);
  const tunnelTimerRef = useRef(null);

  // ✅ מצב לחלון הקרבה
  const [nearbyRoom, setNearbyRoom] = useState(null);
  const proximityCheckRef = useRef(null);
  const lastNotifiedRoomRef = useRef(null);

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
  const neonMode = true;

  // ✅ בדיקה אם יש חדר פעיל
  const isRoomActive = activeOverlayRoom || currentScene !== SCENES.lobby;

  // ✅ פונקציה לבדיקת קרבה לחדרים
  const checkRoomProximity = (robotPosition) => {
    if (!robotPosition || isRoomActive) {
      setNearbyRoom(null);
      return;
    }

    // מיקומי החדרים (עדכני לפי המיקומים האמיתיים ב-MAP_NODES)
    const roomLocations = {
      password: MAP_NODES.password || { x: -5, z: -5 },
      privacy: MAP_NODES.privacy || { x: 5, z: -5 },
      shop: MAP_NODES.shop || { x: 5, z: 5 },
      strength: MAP_NODES.strength || { x: -5, z: 5 },
    };

    const proximityThreshold = 3; // מרחק לזיהוי קרבה

    for (const [roomId, roomPos] of Object.entries(roomLocations)) {
      const distance = Math.sqrt(
        Math.pow(robotPosition.x - roomPos.x, 2) +
        Math.pow(robotPosition.z - roomPos.z, 2)
      );

      if (distance < proximityThreshold) {
        // מצאנו חדר קרוב!
        if (lastNotifiedRoomRef.current !== roomId) {
          lastNotifiedRoomRef.current = roomId;
          setNearbyRoom(roomId);
        }
        return;
      }
    }

    // אין חדר קרוב
    if (nearbyRoom) {
      setNearbyRoom(null);
      lastNotifiedRoomRef.current = null;
    }
  };

  // ✅ טיימר לבדיקת קרבה
  useEffect(() => {
    if (currentScene !== SCENES.lobby || isRoomActive) {
      if (proximityCheckRef.current) {
        clearInterval(proximityCheckRef.current);
        proximityCheckRef.current = null;
      }
      setNearbyRoom(null);
      return;
    }

    proximityCheckRef.current = setInterval(() => {
      // כאן צריך לקבל את מיקום הרובוט מ-ThreeDemo
      // זה דורש העברת callback או ref מ-ThreeDemo
      // לעת עתה נשתמש ב-placeholder
      const robotPosition = gestureRef.current?.robotPosition;
      if (robotPosition) {
        checkRoomProximity(robotPosition);
      }
    }, 500); // בדיקה כל חצי שניה

    return () => {
      if (proximityCheckRef.current) {
        clearInterval(proximityCheckRef.current);
      }
    };
  }, [currentScene, isRoomActive, nearbyRoom]);

  // ✅ טיפול בכניסה לחדר מהחלון
  const handleEnterRoom = (roomId) => {
    setNearbyRoom(null);
    lastNotifiedRoomRef.current = null;
    
    // בדיקה אם יש מיקום ב-MAP_NODES
    if (MAP_NODES?.[roomId]) {
      switchRoomWithRobot(roomId, MAP_NODES[roomId]);
    } else {
      switchRoom(roomId);
    }
  };

  // ✅ טיפול בדחיית החלון
  const handleDismissPopup = () => {
    setNearbyRoom(null);
    // לא מאפס את lastNotifiedRoomRef כדי שלא יקפוץ שוב באותו מקום
  };

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
      {/* ✅ הלובי והעולם התלת-ממדי - עם טשטוש כשחדר פתוח */}
      <div className={isRoomActive ? blurStyles.lobbyBlurred : ''}>
        <ThreeDemo
          autoWalkTarget={robotAutoWalkTarget}
          onAutoWalkArrived={onRobotArrived}
          controlsEnabled={controlsEnabled}
          sceneId={currentScene}
          activeOverlayRoom={activeOverlayRoom}
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
      </div>

      {/* ✅ GestureManager - תמיד מעל */}
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

      {/* ✅ החדרים - מעל הכל */}
      <div className={styles.overlay}>
        {tunnelActive ? <div className={styles.tunnelOverlay} aria-hidden="true" /> : null}
        <MainGameContainer gestureRef={gestureRef} />
      </div>

      {/* ✅ חלון הודעת קרבה לחדר */}
      {nearbyRoom && !isRoomActive && (
        <RoomProximityPopup
          roomId={nearbyRoom}
          onEnter={handleEnterRoom}
          onDismiss={handleDismissPopup}
        />
      )}
    </div>
  );
}