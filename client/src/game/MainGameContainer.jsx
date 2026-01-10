import { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { GameContext, SCENES } from '../context/gameState.js';

import EntryPoint from './scenes/EntryPoint.jsx';
import Lobby from './scenes/Lobby.jsx';

// Mini-games (Feature 1-3)
import PasswordShield from './scenes/PasswordRoom.jsx';
import PrivacyScanner from './scenes/PrivacyRoom.jsx';
import UpgradePod from './scenes/ShopRoom.jsx';
import StrengthRoom from './scenes/StrengthRoom.jsx';
import ClothingRoom from './scenes/ClothingRoom.jsx';

import TryAgain from './scenes/TryAgain.jsx';

export default function MainGameContainer({ gestureRef } = {}) {
  const { currentScene, activeOverlayRoom, addScore, awardBadge } = useContext(GameContext);

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

  return view;
}

MainGameContainer.propTypes = {
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
};
