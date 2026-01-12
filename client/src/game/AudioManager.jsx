import { useContext, useEffect, useRef } from 'react';
import { GameContext } from '../context/GameContext.jsx';

const SCENE_MUSIC = {
  lobby: '/music/forest-ambient.mp3',
  password: '/music/cyber-puzzle.mp3',
  privacy: '/music/creative-factory.mp3',
  shop: '/music/shop-theme.mp3',
};

export default function AudioManager() {
  const { currentScene, audioMuted } = useContext(GameContext);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const audio = audioRef.current;
    // הגדרות בסיסיות
    audio.loop = true;
    audio.volume = 0.4;

    // החלפת שיר בהתאם לסצנה
    const newTrack = SCENE_MUSIC[currentScene] || SCENE_MUSIC.lobby;
    const fullSrc = window.location.origin + newTrack;
    if (audio.src !== fullSrc) {
      audio.src = newTrack;
      if (!audioMuted) {
        audio.play().catch(e => console.log('לחצי על המסך כדי לאפשר שמע'));
      }
    }
  }, [currentScene]);

  useEffect(() => {
    audioRef.current.muted = audioMuted;
  }, [audioMuted]);

  return null;
}
