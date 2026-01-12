import { Canvas } from '@react-three/fiber';
import { useContext, useMemo } from 'react';
import GlobalGestureOverlay from './GlobalGestureOverlay.jsx';
import PropTypes from 'prop-types';
import { GameContext, SCENES } from '../context/GameContext.jsx';
import ResourceBank from '../components/ResourceBank.jsx';
import Lobby from './scenes/Lobby.jsx';

// Mini-games (Feature 1-3)
import PasswordShield from './scenes/PasswordRoom.jsx';
import PrivacyScanner from './scenes/PrivacyRoom.jsx';
import UpgradePod from './scenes/ShopRoom.jsx';
import StrengthRoom from './scenes/StrengthRoom.jsx';
import ClothingRoom from './scenes/ClothingRoom.jsx';

import TryAgain from './scenes/TryAgain.jsx';

import React from 'react';
import Mission1Page from '../mission/Mission1Page.jsx';
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

  const overlay = useMemo(() => {
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
  }, [activeOverlayRoom, addScore, awardBadge, gestureRef]);

  const view = useMemo(() => {
    switch (currentScene) {
      case SCENES.entry:
        return <EntryPoint />;
      case SCENES.lobby:
        return (
          <>
            <Lobby />
            {overlay}
          </>
        );
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
        return <EntryPoint />;
    }
  }, [currentScene, overlay, addScore, awardBadge, gestureRef]);

  const handleMissionExit = () => {
    setShowMission1(false);
  };

  return (
    <>
      {/* <EnergyNavBar /> */}
      <GlobalGestureOverlay gestureRef={gestureRef} />
      <ResourceBank />
      {showMission1 ? (
        <Canvas shadows camera={{ position: [0, 10, 30], fov: 50 }} style={{ width: '100vw', height: '100vh', background: '#222' }}>
          <Mission1Page gestureRef={gestureRef} onExit={handleMissionExit} />
        </Canvas>
      ) : (
        <>
          {view}
          {activeOverlayRoom && overlay}
        </>
      )}
    </>
  );
}

MainGameContainer.propTypes = {
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
};
