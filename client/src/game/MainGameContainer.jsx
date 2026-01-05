import { useContext, useMemo } from 'react';
import { GameContext, SCENES } from '../context/gameState.js';

import EntryPoint from './scenes/EntryPoint.jsx';
import Lobby from './scenes/Lobby.jsx';

// Mini-games (Feature 1-3)
import PasswordShield from './scenes/PasswordRoom.jsx';
import PrivacyScanner from './scenes/PrivacyRoom.jsx';
import UpgradePod from './scenes/ShopRoom.jsx';

import TryAgain from './scenes/TryAgain.jsx';

export default function MainGameContainer() {
  const { currentScene, activeOverlayRoom, addScore, awardBadge } = useContext(GameContext);

  const overlay = useMemo(() => {
    switch (activeOverlayRoom) {
      case SCENES.password:
        return <PasswordShield addScore={addScore} awardBadge={awardBadge} />;
      case SCENES.privacy:
        return <PrivacyScanner addScore={addScore} awardBadge={awardBadge} />;
      case SCENES.shop:
        return <UpgradePod addScore={addScore} awardBadge={awardBadge} />;
      default:
        return null;
    }
  }, [activeOverlayRoom, addScore, awardBadge]);

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
      case SCENES.tryAgain:
        return <TryAgain />;
      default:
        return <EntryPoint />;
    }
  }, [currentScene, overlay]);

  return view;
}
