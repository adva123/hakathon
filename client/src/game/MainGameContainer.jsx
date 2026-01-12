// import { Canvas } from '@react-three/fiber';
// import { useContext, useMemo } from 'react';
// import GlobalGestureOverlay from './GlobalGestureOverlay.jsx';
// import PropTypes from 'prop-types';
// import { GameContext, SCENES } from '../context/GameContext.jsx';
// import ResourceBank from '../components/ResourceBank.jsx';
// import Lobby from './scenes/Lobby.jsx';

// // Mini-games (Feature 1-3)
// import PasswordShield from './scenes/PasswordRoom.jsx';
// import PrivacyScanner from './scenes/PrivacyRoom.jsx';
// import UpgradePod from './scenes/ShopRoom.jsx';
// import StrengthRoom from './scenes/StrengthRoom.jsx';
// import ClothingRoom from './scenes/ClothingRoom.jsx';

// import TryAgain from './scenes/TryAgain.jsx';

// import React from 'react';
// import Mission1Page from '../mission/Mission1Page.jsx';
// export default function MainGameContainer({ gestureRef } = {}) {
//   const { currentScene, activeOverlayRoom, addScore, awardBadge } = useContext(GameContext);
//   const [showMission1, setShowMission1] = React.useState(false);

//   React.useEffect(() => {
//     const handler = () => {
//       setShowMission1(true);
//     };
//     window.addEventListener('open-mission1', handler);
//     return () => window.removeEventListener('open-mission1', handler);
//   }, []);

//   const overlay = useMemo(() => {
//     switch (activeOverlayRoom) {
//       case SCENES.password:
//         return <PasswordShield addScore={addScore} awardBadge={awardBadge} gestureRef={gestureRef} />;
//       case SCENES.privacy:
//         return <PrivacyScanner addScore={addScore} awardBadge={awardBadge} gestureRef={gestureRef} />;
//       case SCENES.shop:
//         return <UpgradePod addScore={addScore} awardBadge={awardBadge} />;
//       case SCENES.strength:
//         return <StrengthRoom addScore={addScore} gestureRef={gestureRef} />;
//       case SCENES.clothing:
//         return <ClothingRoom addScore={addScore} gestureRef={gestureRef} />;
//       default:
//         return null;
//     }
//   }, [activeOverlayRoom, addScore, awardBadge, gestureRef]);

//   const view = useMemo(() => {
//     switch (currentScene) {
//       case SCENES.entry:
//         return <EntryPoint />;
//       case SCENES.lobby:
//         return (
//           <>
//             <Lobby />
//             {overlay}
//           </>
//         );
//       case SCENES.password:
//         return <PasswordShield addScore={addScore} awardBadge={awardBadge} gestureRef={gestureRef} />;
//       case SCENES.privacy:
//         return <PrivacyScanner addScore={addScore} awardBadge={awardBadge} gestureRef={gestureRef} />;
//       case SCENES.shop:
//         return <UpgradePod addScore={addScore} awardBadge={awardBadge} />;
//       case SCENES.strength:
//         return <StrengthRoom addScore={addScore} gestureRef={gestureRef} />;
//       case SCENES.tryAgain:
//         return <TryAgain />;
//       default:
//         return <EntryPoint />;
//     }
//   }, [currentScene, overlay, addScore, awardBadge, gestureRef]);

//   const handleMissionExit = () => {
//     setShowMission1(false);
//   };

//   return (
//     <>
//       {/* <EnergyNavBar /> */}
//       <GlobalGestureOverlay gestureRef={gestureRef} />
//       <ResourceBank />
//       {showMission1 ? (
//         // dpr=1 מוריד עומס גרפי, אפשר גם dpr={[1, 1.5]}
//         <Canvas dpr={1} shadows camera={{ position: [0, 10, 30], fov: 50 }} style={{ width: '100vw', height: '100vh', background: '#222' }}>
//           <Mission1Page gestureRef={gestureRef} onExit={handleMissionExit} />
//         </Canvas>
//       ) : (
//         <>
//           {view}
//           {/* Show overlay only if not in a room scene, and not כפול */}
//           {(currentScene === SCENES.lobby || currentScene === SCENES.entry) && activeOverlayRoom && activeOverlayRoom !== currentScene && overlay}
//         </>
//       )}
//     </>
//   );
// }

// MainGameContainer.propTypes = {
//   gestureRef: PropTypes.shape({ current: PropTypes.any }),
// };
import { Canvas } from '@react-three/fiber';
import { useContext, useMemo } from 'react';
import GlobalGestureOverlay from './GlobalGestureOverlay.jsx';
import PropTypes from 'prop-types';
import { GameContext, SCENES } from '../context/GameContext.jsx';
import ResourceBank from '../components/ResourceBank.jsx';
import Lobby from './scenes/Lobby.jsx';
import React from 'react';
import Mission1Page from '../mission/Mission1Page.jsx';

// Mini-games (Feature 1-3)
import PasswordShield from './scenes/PasswordRoom.jsx';
import PrivacyScanner from './scenes/PrivacyRoom.jsx';
import UpgradePod from './scenes/ShopRoom.jsx';
import StrengthRoom from './scenes/StrengthRoom.jsx';
import ClothingRoom from './scenes/ClothingRoom.jsx';
import TryAgain from './scenes/TryAgain.jsx';

export default function MainGameContainer({ gestureRef } = {}) {
  const { currentScene, activeOverlayRoom, addScore, awardBadge } = useContext(GameContext);
  const [showMission1, setShowMission1] = React.useState(false);

  React.useEffect(() => {
    const handler = () => {
      setShowMission1(true);
    };
    window.addEventListener('open-mission1', handler);
    return () => window.removeEventListener('open-mission1', handler);
  }, []);

  // ✅ FIX: overlay רק אם אנחנו בלובי ויש overlay
  const overlay = useMemo(() => {
    // רק אם נמצאים בלובי והיה activeOverlayRoom
    if (currentScene !== SCENES.lobby) return null;
    
    switch (activeOverlayRoom) {
      case SCENES.password:
        return <PasswordShield addScore={addScore} awardBadge={awardBadge} gestureRef={gestureRef} />;
      case SCENES.privacy:
        return <PrivacyScanner addScore={addScore} awardBadge={awardBadge} gestureRef={gestureRef} />;
      case SCENES.shop:
        return <UpgradePod addScore={addScore} awardBadge={awardBadge} />;
      case SCENES.strength:
        return <StrengthRoom addScore={addScore} gestureRef={gestureRef} />;
      case SCENES.clothing:
        return <ClothingRoom addScore={addScore} gestureRef={gestureRef} />;
      default:
        return null;
    }
  }, [currentScene, activeOverlayRoom, addScore, awardBadge, gestureRef]);

  // ✅ FIX: view רק אם לא בלובי או אין overlay
  const view = useMemo(() => {
    switch (currentScene) {
      case SCENES.lobby:
        return <Lobby />;
      
      // ✅ רק אם currentScene הוא ממש הסצנה (לא overlay)
      case SCENES.password:
        return <PasswordShield addScore={addScore} awardBadge={awardBadge} gestureRef={gestureRef} />;
      case SCENES.privacy:
        return <PrivacyScanner addScore={addScore} awardBadge={awardBadge} gestureRef={gestureRef} />;
      case SCENES.shop:
        return <UpgradePod addScore={addScore} awardBadge={awardBadge} />;
      case SCENES.strength:
        return <StrengthRoom addScore={addScore} gestureRef={gestureRef} />;
      case SCENES.tryAgain:
        return <TryAgain />;
      default:
        return <Lobby />;
    }
  }, [currentScene, addScore, awardBadge, gestureRef]);

  const handleMissionExit = () => {
    setShowMission1(false);
  };

  return (
    <>
      <GlobalGestureOverlay gestureRef={gestureRef} />
      <ResourceBank />
      
      {showMission1 ? (
        <Canvas 
          dpr={1} 
          shadows 
          camera={{ position: [0, 10, 30], fov: 50 }} 
          style={{ width: '100vw', height: '100vh', background: '#222' }}
        >
          <Mission1Page gestureRef={gestureRef} onExit={handleMissionExit} />
        </Canvas>
      ) : (
        <>
          {view}
          {/* ✅ overlay מופיע רק אם נמצאים בלובי */}
          {overlay}
        </>
      )}
    </>
  );
}

MainGameContainer.propTypes = {
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
};
