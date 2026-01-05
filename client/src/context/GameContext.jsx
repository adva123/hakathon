import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { GameContext, SCENES } from './gameState.js';

const defaultBadges = Object.freeze({
  goldenKey: false,
  privacyShield: false,
});

const defaultOwned = Object.freeze({
  ownedItems: [],
  equippedItem: null,
});

const storageKey = 'hakathon.gameState.v1';
const avatarStorageKey = 'hakathon.avatarFaceDataUrl.v1';
const avatarColorKey = 'hakathon.avatarDominantColor.v1';

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function uniqueArray(values) {
  return Array.from(new Set(values));
}

function readPersisted() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  return safeParse(raw);
}

function readPersistedAvatar() {
  if (typeof window === 'undefined') return '';
  // Prefer sessionStorage (avoids quota issues); fall back to localStorage if present.
  const s = window.sessionStorage.getItem(avatarStorageKey);
  if (s && typeof s === 'string') return s;
  const l = window.localStorage.getItem(avatarStorageKey);
  if (l && typeof l === 'string') return l;
  return '';
}

function persistAvatar(dataUrl) {
  if (typeof window === 'undefined') return;
  // Store large data in sessionStorage; attempt localStorage only for reasonably small strings.
  const value = typeof dataUrl === 'string' ? dataUrl : '';
  if (!value) {
    try {
      window.sessionStorage.removeItem(avatarStorageKey);
    } catch {
      // ignore
    }
    try {
      window.localStorage.removeItem(avatarStorageKey);
    } catch {
      // ignore
    }
    return;
  }

  // Always keep a session copy.
  try {
    window.sessionStorage.setItem(avatarStorageKey, value);
  } catch {
    // ignore
  }

  // Best-effort localStorage if small enough.
  // (Typical localStorage quota is ~5MB; keep a safe margin.)
  if (value.length <= 220_000) {
    try {
      window.localStorage.setItem(avatarStorageKey, value);
    } catch {
      // ignore quota errors
    }
  } else {
    try {
      window.localStorage.removeItem(avatarStorageKey);
    } catch {
      // ignore
    }
  }
}

function readPersistedAvatarColor(persisted) {
  if (persisted && typeof persisted.avatarDominantColor === 'string') return persisted.avatarDominantColor;
  if (typeof window === 'undefined') return '';
  // Backward/side-channel storage (small, safe for localStorage).
  try {
    const v = window.localStorage.getItem(avatarColorKey);
    return typeof v === 'string' ? v : '';
  } catch {
    return '';
  }
}

function persistAvatarColor(color) {
  if (typeof window === 'undefined') return;
  const v = typeof color === 'string' ? color : '';
  try {
    if (v) window.localStorage.setItem(avatarColorKey, v);
    else window.localStorage.removeItem(avatarColorKey);
  } catch {
    // ignore
  }
}

export function GameProvider({ children }) {
  const persisted = useMemo(() => readPersisted(), []);

  const [currentScene, setCurrentScene] = useState(SCENES.lobby);
  const [playerName, setPlayerName] = useState(() =>
    persisted && typeof persisted.playerName === 'string' ? persisted.playerName : ''
  );
  const [score, setScore] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [badges, setBadges] = useState(() => {
    if (persisted?.badges && typeof persisted.badges === 'object') {
      return { ...defaultBadges, ...persisted.badges };
    }
    return { ...defaultBadges };
  });
  const [audioMuted, setAudioMuted] = useState(() =>
    persisted && typeof persisted.audioMuted === 'boolean' ? persisted.audioMuted : false
  );
  const [avatarFaceDataUrl, setAvatarFaceDataUrl] = useState(() => readPersistedAvatar());
  const [avatarDominantColor, setAvatarDominantColor] = useState(() => readPersistedAvatarColor(persisted));
  const [shopState, setShopState] = useState(() => {
    if (persisted?.shopState && typeof persisted.shopState === 'object') {
      const ownedItems = Array.isArray(persisted.shopState.ownedItems)
        ? uniqueArray(persisted.shopState.ownedItems)
        : [];
      const equippedItem =
        typeof persisted.shopState.equippedItem === 'string'
          ? persisted.shopState.equippedItem
          : null;
      return { ownedItems, equippedItem };
    }
    return { ...defaultOwned };
  });

  // Robot walk-to-switch handshake with ThreeDemo
  const [robotAutoWalkTarget, setRobotAutoWalkTarget] = useState(null); // [x,y,z]
  const [pendingScene, setPendingScene] = useState(null);
  const [activeOverlayRoom, setActiveOverlayRoom] = useState(null); // password | privacy | shop | null

  // Lobby-return safety (prevents immediate re-entry after Back)
  const [lobbyReturnEvent, setLobbyReturnEvent] = useState(null); // { nonce, fromScene, at }
  const [gateCollisionCooldownUntil, setGateCollisionCooldownUntil] = useState(0); // performance.now timestamp
  const lobbyReturnNonceRef = useRef(0);

  useEffect(() => {
    const payload = {
      playerName,
      audioMuted,
      badges,
      shopState,
      avatarDominantColor,
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore quota/blocked storage
    }
  }, [playerName, audioMuted, badges, shopState, avatarDominantColor]);

  useEffect(() => {
    persistAvatar(avatarFaceDataUrl);
  }, [avatarFaceDataUrl]);

  useEffect(() => {
    persistAvatarColor(avatarDominantColor);
  }, [avatarDominantColor]);

  const startGame = useCallback((name) => {
    setPlayerName(name || '');
    setScore(0);
    setEnergy(100);
    setCurrentScene(SCENES.lobby);
  }, []);

  const resetRun = useCallback(() => {
    setScore(0);
    setEnergy(100);
    setBadges({ ...defaultBadges });
    setShopState({ ...defaultOwned });
    setAvatarDominantColor('');
    setCurrentScene(SCENES.entry);
    setRobotAutoWalkTarget(null);
    setPendingScene(null);
  }, []);

  const prepareLobbyReturn = useCallback(
    (fromScene) => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      setGateCollisionCooldownUntil(now + 1500);
      lobbyReturnNonceRef.current += 1;
      setLobbyReturnEvent({ nonce: lobbyReturnNonceRef.current, fromScene, at: now });
      // Clear any in-flight auto-walk transitions.
      setRobotAutoWalkTarget(null);
      setPendingScene(null);
    },
    [setRobotAutoWalkTarget, setPendingScene]
  );

  const switchRoom = useCallback(
    (targetScene) => {
      // If we're leaving a room back to lobby, do the safe-return choreography.
      if (
        targetScene === SCENES.lobby &&
        (currentScene === SCENES.password ||
          currentScene === SCENES.privacy ||
          currentScene === SCENES.shop)
      ) {
        prepareLobbyReturn(currentScene);
      }

      setCurrentScene(targetScene);
    },
    [currentScene, prepareLobbyReturn]
  );

  const handleBack = useCallback(() => {
    // Explicit Back handler used by mini-games.
    if (activeOverlayRoom) {
      prepareLobbyReturn(activeOverlayRoom);
      setActiveOverlayRoom(null);
      return;
    }
    if (
      currentScene === SCENES.password ||
      currentScene === SCENES.privacy ||
      currentScene === SCENES.shop
    ) {
      prepareLobbyReturn(currentScene);
    }
    setCurrentScene(SCENES.lobby);
  }, [activeOverlayRoom, currentScene, prepareLobbyReturn]);

  const switchRoomWithRobot = useCallback((targetScene, targetPosition) => {
    // Waze-style navigation: stay in lobby while the robot moves,
    // then show the room UI as an overlay when it arrives.
    setCurrentScene(SCENES.lobby);
    setActiveOverlayRoom(null);
    setPendingScene(targetScene);
    setRobotAutoWalkTarget(targetPosition);
  }, []);

  const onRobotArrived = useCallback(() => {
    if (!pendingScene) {
      setRobotAutoWalkTarget(null);
      return;
    }
    setActiveOverlayRoom(pendingScene);
    setPendingScene(null);
    setRobotAutoWalkTarget(null);
  }, [pendingScene]);

  const addScore = useCallback((delta) => {
    setScore((s) => Math.max(0, s + delta));
  }, []);

  const registerMistake = useCallback(() => {
    setEnergy((e) => {
      const next = e - 10;
      if (next <= 0) {
        // Switch to try again screen; keep score visible
        setCurrentScene(SCENES.tryAgain);
        return 0;
      }
      return next;
    });
  }, []);

  const awardBadge = useCallback((badgeId) => {
    setBadges((b) => ({ ...b, [badgeId]: true }));
  }, []);

  const buyItem = useCallback(
    ({ itemId, price }) => {
      if (!itemId || typeof price !== 'number') return { ok: false, reason: 'invalid' };
      let allowed = false;
      setScore((s) => {
        if (s >= price) {
          allowed = true;
          return s - price;
        }
        allowed = false;
        return s;
      });

      if (!allowed) return { ok: false, reason: 'insufficient' };

      setShopState((prev) => {
        const ownedItems = uniqueArray([...prev.ownedItems, itemId]);
        return { ownedItems, equippedItem: itemId };
      });

      return { ok: true };
    },
    [setScore]
  );

  const equipItem = useCallback((itemId) => {
    setShopState((prev) => {
      if (!prev.ownedItems.includes(itemId)) return prev;
      return { ...prev, equippedItem: itemId };
    });
  }, []);

  const value = useMemo(
    () => ({
      currentScene,
      playerName,
      score,
      energy,
      badges,
      audioMuted,
      avatarFaceDataUrl,
      avatarDominantColor,
      shopState,
      robotAutoWalkTarget,
      activeOverlayRoom,
      lobbyReturnEvent,
      gateCollisionCooldownUntil,
      startGame,
      resetRun,
      switchRoom,
      handleBack,
      switchRoomWithRobot,
      onRobotArrived,
      addScore,
      registerMistake,
      awardBadge,
      setAudioMuted,
      setAvatarFaceDataUrl,
      setAvatarDominantColor,
      buyItem,
      equipItem,
    }),
    [
      currentScene,
      playerName,
      score,
      energy,
      badges,
      audioMuted,
      avatarFaceDataUrl,
      avatarDominantColor,
      shopState,
      robotAutoWalkTarget,
      activeOverlayRoom,
      lobbyReturnEvent,
      gateCollisionCooldownUntil,
      startGame,
      resetRun,
      switchRoom,
      handleBack,
      switchRoomWithRobot,
      onRobotArrived,
      addScore,
      registerMistake,
      awardBadge,
      buyItem,
      equipItem,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

GameProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
