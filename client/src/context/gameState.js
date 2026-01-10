import { createContext } from 'react';

export const SCENES = Object.freeze({
  entry: 'entry',
  lobby: 'lobby',
  password: 'password',
  miniPassword: 'miniPassword',
  privacy: 'privacy',
  shop: 'shop',
  strength: 'strength',
  clothing: 'clothing',
  tryAgain: 'tryAgain',
});

export const GameContext = createContext(null);
