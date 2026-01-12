import { useContext, useEffect, useRef } from 'react';
import { GameContext } from '../context/GameContext.jsx';

const SCENE_MUSIC = {
  lobby: '/sounds/A.mp3', // fallback to available file
  password: '/sounds/AB.mp3', // fallback to available file
  privacy: '/sounds/ABC.mp3', // fallback to available file
  shop: '/sounds/ABCD.mp3', // fallback to available file
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
