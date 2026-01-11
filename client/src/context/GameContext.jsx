import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

// ✅ יצירת ה-Context
export const GameContext = createContext(null);

// ✅ ייבוא SCENES מקובץ נפרד (אם קיים)
// אם אין לך קובץ gameState.js, הוסיפי את SCENES כאן:
export const SCENES = {
  entry: 'entry',
  lobby: 'lobby',
  password: 'password',
  privacy: 'privacy',
  shop: 'shop',
  strength: 'strength',
  tryAgain: 'tryAgain'
};

const defaultBadges = Object.freeze({
  goldenKey: false,
  privacyShield: false,
});

const defaultOwned = Object.freeze({
  ownedItems: [],
  equippedItems: [],
  ownedRobots: [],
  selectedRobotId: null,
  generatedDolls: [],
});

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
  return null;
}

function readPersistedAvatar() {
  return '';
}

function persistAvatar(dataUrl) {}

function readPersistedAvatarColor(persisted) {
  return '';
}

function persistAvatarColor(color) {}

export function GameProvider({ children }) {
  const persisted = useMemo(() => readPersisted(), []);

  // Core game state
  const [currentScene, setCurrentScene] = useState(SCENES.lobby);
  const [playerName, setPlayerName] = useState(() =>
    persisted && typeof persisted.playerName === 'string' ? persisted.playerName : ''
  );
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(50);
  const [energy, setEnergy] = useState(100);
  const [openBank, setOpenBank] = useState(false);
  const [userId, setUserId] = useState(null);
  const [googleUser, setGoogleUser] = useState(null);

  // ✅ פונקציה מתוקנת שמעדכנת את כל הפרטים מה-DB
  const handleLogin = useCallback((userData) => {
    console.log("🔐 handleLogin called with:", userData);
    
    if (!userData || !userData.id) {
      console.error("❌ Invalid user data:", userData);
      return;
    }
    
    // עדכן את כל ה-state מהנתונים שקיבלנו מה-DB
    setUserId(userData.id);
    setPlayerName(userData.username || '');
    setScore(userData.score || 0);
    setCoins(userData.coins || 50);
    setEnergy(userData.energy || 100);
    
    console.log("✅ User state updated:", {
      id: userData.id,
      name: userData.username,
      score: userData.score,
      coins: userData.coins,
      energy: userData.energy
    });
  }, []);

  // Convert points to coins
  const exchangePointsForCoins = useCallback((pointsToSpend) => {
    const rate = 2; // 2 points = 1 coin
    if (score >= pointsToSpend) {
      setScore(prev => prev - pointsToSpend);
      setCoins(prev => prev + Math.floor(pointsToSpend / rate));
      return { success: true, message: "ההחלפה בוצעה בהצלחה!" };
    }
    return { success: false, message: "אין לך מספיק נקודות!" };
  }, [score]);

  // Buy energy with coins
  const buyEnergyWithCoins = useCallback((cost) => {
    if (coins >= cost) {
      setCoins(prev => prev - cost);
      setEnergy(prev => Math.min(prev + 1, 100));
      return { success: true, message: "קנית אנרגיה! ⚡" };
    }
    return { success: false, message: "אין לך מספיק מטבעות!" };
  }, [coins]);

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
      const equippedItems = Array.isArray(persisted.shopState.equippedItems)
        ? uniqueArray(persisted.shopState.equippedItems)
        : [];
      const ownedRobots = Array.isArray(persisted.shopState.ownedRobots)
        ? uniqueArray(persisted.shopState.ownedRobots)
        : [];
      const selectedRobotId = persisted.shopState.selectedRobotId || null;
      const generatedDolls = Array.isArray(persisted.shopState.generatedDolls)
        ? persisted.shopState.generatedDolls
        : [];
      return { ownedItems, equippedItems, ownedRobots, selectedRobotId, generatedDolls };
    }
    return { ...defaultOwned };
  });

  const addDollToInventory = useCallback((doll) => {
    if (!doll) return;
    setShopState((prev) => {
      const generatedDolls = Array.isArray(prev.generatedDolls)
        ? [...prev.generatedDolls, doll]
        : [doll];
      return { ...prev, generatedDolls };
    });
  }, []);

  const buyRobot = useCallback(({ robotId, price, useCoins = false }) => {
    if (!robotId || typeof price !== 'number') return { ok: false, reason: 'invalid' };
    let allowed = false;
    if (useCoins) {
      setCoins((c) => {
        if (c >= price) {
          allowed = true;
          return c - price;
        }
        allowed = false;
        return c;
      });
    } else {
      setScore((s) => {
        if (s >= price) {
          allowed = true;
          return s - price;
        }
        allowed = false;
        return s;
      });
    }
    if (!allowed) return { ok: false, reason: 'insufficient' };
    setShopState((prev) => {
      const ownedRobots = uniqueArray([...prev.ownedRobots, robotId]);
      return { ...prev, ownedRobots, selectedRobotId: robotId };
    });
    return { ok: true };
  }, []);

  const selectRobot = useCallback((robotId) => {
    setShopState((prev) => {
      if (!prev.ownedRobots.includes(robotId)) return prev;
      return { ...prev, selectedRobotId: robotId };
    });
  }, []);

  const [robotAutoWalkTarget, setRobotAutoWalkTarget] = useState(null);
  const [pendingScene, setPendingScene] = useState(null);
  const [activeOverlayRoom, setActiveOverlayRoom] = useState(null);
  const [lobbyReturnEvent, setLobbyReturnEvent] = useState(null);
  const [gateCollisionCooldownUntil, setGateCollisionCooldownUntil] = useState(0);
  const lobbyReturnNonceRef = useRef(0);

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
      setRobotAutoWalkTarget(null);
      setPendingScene(null);
    },
    []
  );

  const switchRoom = useCallback(
    (targetScene) => {
      if (
        targetScene === SCENES.lobby &&
        (currentScene === SCENES.password ||
          currentScene === SCENES.privacy ||
          currentScene === SCENES.shop ||
          currentScene === SCENES.strength)
      ) {
        prepareLobbyReturn(currentScene);
      }
      setCurrentScene(targetScene);
    },
    [currentScene, prepareLobbyReturn]
  );

  const handleBack = useCallback(() => {
    if (activeOverlayRoom) {
      prepareLobbyReturn(activeOverlayRoom);
      setActiveOverlayRoom(null);
      return;
    }
    if (
      currentScene === SCENES.strength ||
      currentScene === SCENES.password ||
      currentScene === SCENES.privacy ||
      currentScene === SCENES.shop
    ) {
      prepareLobbyReturn(currentScene);
    }
    setCurrentScene(SCENES.lobby);
  }, [activeOverlayRoom, currentScene, prepareLobbyReturn]);

  const switchRoomWithRobot = useCallback((targetScene, targetPosition) => {
    setCurrentScene(SCENES.lobby);
    setActiveOverlayRoom(null);
    setPendingScene(targetScene);
    setRobotAutoWalkTarget(targetPosition);
  }, []);

  const onRobotArrived = useCallback(() => {
    console.log('🎯 Robot arrived! pendingScene:', pendingScene);
    if (!pendingScene) {
      setRobotAutoWalkTarget(null);
      return;
    }
    if (pendingScene === SCENES.strength) {
      console.log('📍 Setting strength as scene');
      setActiveOverlayRoom(null);
      setCurrentScene(pendingScene);
    } else if (pendingScene === SCENES.shop) {
      console.log('📍 Setting shop as overlay');
      setActiveOverlayRoom(SCENES.shop);
    } else {
      console.log('📍 Setting as overlay:', pendingScene);
      setActiveOverlayRoom(pendingScene);
    }
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
        setCurrentScene(SCENES.tryAgain);
        return 0;
      }
      return next;
    });
  }, []);

  const addEnergy = useCallback((amount) => {
    setEnergy((e) => Math.min(100, e + amount));
  }, []);

  const awardBadge = useCallback((badgeId) => {
    setBadges((b) => ({ ...b, [badgeId]: true }));
  }, []);

  const buyItem = useCallback(
    ({ itemId, price, useCoins = false }) => {
      if (!itemId || typeof price !== 'number') return { ok: false, reason: 'invalid' };
      let allowed = false;
      if (useCoins) {
        setCoins((c) => {
          if (c >= price) {
            allowed = true;
            return c - price;
          }
          allowed = false;
          return c;
        });
      } else {
        setScore((s) => {
          if (s >= price) {
            allowed = true;
            return s - price;
          }
          allowed = false;
          return s;
        });
      }
      if (!allowed) return { ok: false, reason: 'insufficient' };
      setShopState((prev) => {
        const ownedItems = uniqueArray([...prev.ownedItems, itemId]);
        const equippedItems = uniqueArray([...prev.equippedItems, itemId]);
        return { ...prev, ownedItems, equippedItems };
      });
      return { ok: true };
    },
    []
  );

  const equipItem = useCallback((itemId) => {
    setShopState((prev) => {
      if (!prev.ownedItems.includes(itemId)) return prev;
      const equippedItems = uniqueArray([...prev.equippedItems, itemId]);
      return { ...prev, equippedItems };
    });
  }, []);

  // ✅ Context value עם כל הפונקציות והערכים
  const value = useMemo(
    () => ({
      currentScene,
      playerName,
      score,
      setScore, // ✅ הוספה
      coins,
      setCoins,
      energy,
      setEnergy, // ✅ הוספה
      badges,
      audioMuted,
      avatarFaceDataUrl,
      avatarDominantColor,
      shopState,
      robotAutoWalkTarget,
      activeOverlayRoom,
      lobbyReturnEvent,
      gateCollisionCooldownUntil,
      openBank,
      setOpenBank,
      startGame,
      resetRun,
      switchRoom,
      handleBack,
      switchRoomWithRobot,
      onRobotArrived,
      addScore,
      addEnergy,
      registerMistake,
      awardBadge,
      setAudioMuted,
      setAvatarFaceDataUrl,
      setAvatarDominantColor,
      buyItem,
      equipItem,
      buyRobot,
      selectRobot,
      addDollToInventory,
      exchangePointsForCoins,
      buyEnergyWithCoins,
      userId,
      setUserId,
      googleUser,
      setGoogleUser,
      handleLogin,
    }),
    [
      currentScene,
      playerName,
      score,
      coins,
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
      openBank,
      startGame,
      resetRun,
      switchRoom,
      handleBack,
      switchRoomWithRobot,
      onRobotArrived,
      addScore,
      addEnergy,
      registerMistake,
      awardBadge,
      buyItem,
      equipItem,
      buyRobot,
      selectRobot,
      addDollToInventory,
      exchangePointsForCoins,
      buyEnergyWithCoins,
      userId,
      googleUser,
      handleLogin, // ✅ הוספה ל-dependencies
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

GameProvider.propTypes = {
  children: PropTypes.node.isRequired,
};