import { useContext } from 'react';
import { GameContext } from '../context/GameContext.jsx';

export const useSound = () => {
  const { audioMuted } = useContext(GameContext);

  const playSFX = (file) => {
    if (audioMuted) return;
    const sfx = new Audio(`/sounds/${file}`);
    sfx.volume = 0.6;
    sfx.play();
  };

  return {
    playSuccess: () => playSFX('success.mp3'),
    playFail: () => playSFX('error.mp3'),
    playCoins: () => playSFX('drop-coins.mp3'),
    playLevelUp: () => playSFX('levelup.mp3'),
    playTeleport: () => playSFX('teleport.mp3'),
  };
};
