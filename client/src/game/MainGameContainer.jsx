import Mission1Page from '../mission/Mission1Page.jsx';
import { Canvas } from '@react-three/fiber';
import React, { useContext, useMemo } from 'react';
import GlobalGestureOverlay from './GlobalGestureOverlay.jsx';
import PropTypes from 'prop-types';
import { GameContext, SCENES } from '../context/GameContext.jsx';
import ResourceBank from '../components/ResourceBank.jsx';
import ThreeDemo from '../features/world/ThreeDemo.jsx';

// Mini-games (Feature 1-3)
import PasswordShield from './scenes/PasswordRoom.jsx';
import PrivacyScanner from './scenes/PrivacyRoom.jsx';
import UpgradePod from './scenes/ShopRoom.jsx';
import StrengthRoom from './scenes/StrengthRoom.jsx';
import ClothingRoom from './scenes/ClothingRoom.jsx';

import TryAgain from './scenes/TryAgain.jsx';


export default function MainGameContainer() {
  const { currentScene, activeOverlayRoom, addScore, awardBadge, switchRoom, badges, shopState } = useContext(GameContext);
  const gestureRef = React.useRef();
  const [showMission1, setShowMission1] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setShowMission1(true);
    window.addEventListener('open-mission1', handler);
    return () => window.removeEventListener('open-mission1', handler);
  }, []);
  

  // Handler for exiting the mission, returns to lobby (forest world)
  const handleMissionExit = () => {
    setShowMission1(false);
    switchRoom(SCENES.lobby);
  };

  // Remove overlay logic for rooms, rely only on currentScene for room rendering
  const overlay = null;

  const view = useMemo(() => {
    switch (currentScene) {
      case SCENES.entry:
        return <EntryPoint />;
      case SCENES.lobby:
        return (
          <>
            <ThreeDemo
              autoWalkTarget={null}
              controlsEnabled={true}
              neonMode={false}
              sceneId={SCENES.lobby}
              gestureRef={gestureRef}
              avatarFaceUrl={null}
              onLobbyPoiNavigate={(sceneId) => switchRoom(sceneId)}
              onLobbyPortalEnter={(sceneId) => switchRoom(sceneId)}
              lobbyReturnEvent={null}
              badges={badges}
              shopState={shopState}
            />
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

  return (
    <>
      {/* <EnergyNavBar /> */}
      <GlobalGestureOverlay gestureRef={gestureRef} />
      <ResourceBank />
      {showMission1 ? (
        <Canvas shadows camera={{ position: [0, 10, 30], fov: 50 }} style={{ width: '100vw', height: '100vh', background: '#222' }}>
          <Mission1Page onExit={handleMissionExit} />
        </Canvas>
      ) : view}
    </>
  );
}

MainGameContainer.propTypes = {
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
};
