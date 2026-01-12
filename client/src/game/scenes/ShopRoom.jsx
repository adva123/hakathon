import React, { useContext, useEffect,useMemo ,useState ,useRef,Suspense  } from 'react';
import { useSound } from '../../hooks/useSound.js';
import styles from '../game.module.css';
import room from './ShopRoom.module.css';
import { Canvas } from '@react-three/fiber';
import MiniRobotPreview from '../../components/common/MiniRobotPreview/MiniRobotPreview';
import { GameContext } from '../../context/GameContext.jsx';
import { ROBOT_CATALOG } from '../../features/robot/robotCatalog.js';
import api from '../../services/api';
import RoomOverlayBg from './RoomOverlayBg';

export default function ShopRoom() {
  const { playCoins } = useSound();
  const gameContext = useContext(GameContext);
  const { coins, shopState, buyRobot, selectRobot, handleBack } = gameContext;

  /**
   * 🔐 IMPROVED: Get userId from multiple sources with debugging
   */
  const getUserId = () => {
    console.log('🔍 Debugging userId sources:');
    console.log('1. shopState:', shopState);
    console.log('2. shopState?.user:', shopState?.user);
    console.log('3. gameContext:', Object.keys(gameContext));
    
    // Priority 1: From GameContext directly (if you added userId there)
    if (gameContext.userId) {
      console.log('✅ Found userId in GameContext:', gameContext.userId);
      return gameContext.userId;
    }

    // Priority 2: From shopState.user
    if (shopState?.user?.id) {
      console.log('✅ Found userId in shopState.user.id:', shopState.user.id);
      return shopState.user.id;
    }

    // Priority 3: From localStorage (Google user)
    try {
      const storedUser = localStorage.getItem('google_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const id = user.id || user.sub || user.email;
        console.log('✅ Found userId in localStorage (google_user):', id);
        return id;
      }
    } catch (e) {
      console.error('❌ Failed to parse google_user:', e);
    }

    // Priority 4: From localStorage (userId directly)
    try {
      const userId = localStorage.getItem('userId');
      if (userId) {
        console.log('✅ Found userId in localStorage (userId):', userId);
        return userId;
      }
    } catch (e) {
      console.error('❌ Failed to get userId from localStorage:', e);
    }

    // Priority 5: From localStorage (user object)
    try {
      const userObj = localStorage.getItem('user');
      if (userObj) {
        const user = JSON.parse(userObj);
        const id = user.id || user.email;
        console.log('✅ Found userId in localStorage (user):', id);
        return id;
      }
    } catch (e) {
      console.error('❌ Failed to parse user:', e);
    }

    // Priority 6: Check all localStorage keys
    console.log('🔍 All localStorage keys:', Object.keys(localStorage));
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      console.log(`  - ${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
    }

    console.error('❌ No userId found anywhere!');
    return null;
  };

  const userId = getUserId();

  // Debug: Show userId status
  useEffect(() => {
    console.log('🎮 ShopRoom mounted with userId:', userId);
    if (!userId) {
      console.error('⚠️ WARNING: No userId available in ShopRoom!');
    }
  }, [userId]);

  const ownedRobots = useMemo(() => new Set(shopState?.ownedRobots || []), [shopState?.ownedRobots]);
  owned.add(defaultRobotId);
  
  const hasOwnedRobots = (shopState?.ownedRobots && shopState.ownedRobots.length > 0);
  const selectedRobotId = shopState?.selectedRobotId || (hasOwnedRobots ? ROBOT_CATALOG[0].id : null);
  
  const [previewId, setPreviewId] = useState(selectedRobotId || ROBOT_CATALOG[0].id);
  
  const previewSkin = useMemo(() => {
    return ROBOT_CATALOG.find(r => r.id === previewId) || ROBOT_CATALOG[0];
  }, [previewId]);

  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState('');
  const [equipFx, setEquipFx] = useState(false);
  const [pendingEquip, setPendingEquip] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const equipFxTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (equipFxTimerRef.current) window.clearTimeout(equipFxTimerRef.current);
    };
  }, []);

  const triggerEquipFx = () => {
    setEquipFx(true);
    if (equipFxTimerRef.current) window.clearTimeout(equipFxTimerRef.current);
    equipFxTimerRef.current = window.setTimeout(() => setEquipFx(false), 900);
  };

  /**
   * 🛍️ Buy Robot - WITH DATABASE SAVE
   */
  const buy = async (robot) => {
    console.log('🛍️ Buy attempt:', { userId, robot: robot.id, coins });

    if (!userId) {
      console.error('❌ No userId - cannot buy!');
      setMessageKind('warn');
      setMessage('Please log in to buy robots! (Debug: Check console for userId info)');
      return;
    }

    if (coins < robot.price) {
      setMessageKind('warn');
      setMessage(`Not enough coins! You need ${robot.price - coins} more.`);
      return;
    }

    setIsLoading(true);

    try {
      console.log('📡 Sending buy request to server:', {
        userId,
        robotId: robot.id,
        price: robot.price
      });

      const response = await api.post('/shop/buy-robot', {
        userId: userId,
        robotId: robot.id,
        price: robot.price
      });

      console.log('📦 Server response:', response.data);

      if (response.data.success) {
        // Update local state
        const localResult = buyRobot({ 
          robotId: robot.id, 
          price: robot.price, 
          useCoins: true 
        });

        if (localResult.ok) {
          setMessageKind('ok');
          setMessage(response.data.message || `Unlocked ${robot.name}!`);
          triggerEquipFx();
          console.log('Calling playCoins() from ShopRoom');
          playCoins();
        }
      } else {
        setMessageKind('warn');
        setMessage(response.data.message || 'Purchase failed');
      }

    } catch (error) {
      console.error('❌ Error buying robot:', error);
      setMessageKind('warn');
      setMessage(error.response?.data?.message || 'Failed to purchase robot');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🎨 Select Robot - WITH DATABASE SAVE
   */
  const selectRobotWithDB = async (robotId) => {
    if (!userId) {
      console.error('❌ No userId - cannot select!');
      setMessageKind('warn');
      setMessage('Please log in!');
      return;
    }

    const robot = ROBOT_CATALOG.find(r => r.id === robotId);
    if (!robot) return;

    console.log('🎨 Select attempt:', { userId, robotId });

    try {
      const response = await api.post('/shop/select-robot', {
        userId: userId,
        robotId: robotId,
        robotColor: robot.color
      });

      if (response.data.success) {
        selectRobot(robotId);
        triggerEquipFx();
        setMessageKind('ok');
        setMessage(`Equipped ${robot.name}!`);
      } else {
        setMessageKind('warn');
        setMessage(response.data.message || 'Failed to equip robot');
      }

    } catch (error) {
      console.error('❌ Error selecting robot:', error);
      setMessageKind('warn');
      setMessage('Failed to equip robot');
    }
  };

  /**
   * 🎯 Render robot action button
   */
  const renderRobotAction = (robot) => {
    const isDefaultRobot = robot.id === ROBOT_CATALOG[0].id;
    const isOwned = ownedRobots.has(robot.id);
    const isSelected = selectedRobotId === robot.id;
    const canAfford = coins >= robot.price;

    if (isSelected) {
      return <button className={room.btnSelected} disabled>ACTIVE</button>;
    }

    if (isOwned) {
      return (
        <button 
          className={room.btnEquip} 
          onClick={() => selectRobotWithDB(robot.id)}
          disabled={isLoading}
        >
          SELECT
        </button>
      );
    }

    if (canAfford) {
      return (
        <button 
          className={room.btnBuy} 
          onClick={(e) => {
            e.stopPropagation();
            buy(robot);
          }}
          disabled={isLoading}
        >
          {isLoading ? 'PROCESSING...' : `BUY (${robot.price})`}
        </button>
      );
    }

    return (
      <div className={room.lockedStatus}>
        <svg viewBox="0 0 20 20" width="16" style={{marginRight: '5px'}}>
          <path d="M6 8V6a4 4 0 1 1 8 0v2" stroke="currentColor" fill="none" strokeWidth="2"/>
          <rect x="4" y="8" width="12" height="8" rx="2" fill="currentColor"/>
        </svg>
        LOCKED
      </div>
    );
  };

  return (
    <>
      <RoomOverlayBg />
      <div className={`${styles.panel} ${room.room}`}>
        <div className={room.header}>
          <button className={room.btnBack} onClick={handleBack}>
            ← Back
          </button>
          <div>
            <h2 className={room.title}>🛍️ Robot Upgrade Pod</h2>
            <div className={`${styles.small} ${room.subtitle}`}>
              Spend coins to customize your appearance. Selected skins persist in the forest.
            </div>
          </div>
          <div className={room.podStatus}>
            {userId ? `POD ONLINE ` : 'POD OFFLINE - NOT LOGGED IN'}
          </div>
        </div>

        {/* DEBUG PANEL */}
        {!userId && (
          <div style={{
            background: 'rgba(255, 0, 85, 0.1)',
            border: '2px solid #ff0055',
            borderRadius: '12px',
            padding: '20px',
            margin: '20px',
            color: '#fff'
          }}>
            <h3 style={{ color: '#ff0055', marginTop: 0 }}>⚠️ Debug: No User ID Found</h3>
            <p>Check the browser console (F12) for detailed debugging info.</p>
            <p><strong>Possible solutions:</strong></p>
            <ul>
              <li>Make sure you're logged in with Google</li>
              <li>Check if userId is saved in GameContext</li>
              <li>Check localStorage for 'google_user' or 'userId'</li>
            </ul>
            <button 
              onClick={getUserId}
              style={{
                background: '#ff0055',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🔍 Re-check userId (see console)
            </button>
          </div>
        )}

        <div className={room.layout}>
          {/* Left side: Preview */}
          <div className={`${room.pod} ${room.glassNeon}`}>
            <div className={room.podTop}>
              <div className={room.podLabel}>PREVIEW UNIT</div>
              <div className={room.kpi}>Wallet: {coins} 🪙</div>
            </div>

            <div className={room.robotStage}>
              <div className={room.robotGlow} style={{ '--robot-glow-color': previewSkin.color }} />
              <div className={room.robotScan} />
              
              <Suspense fallback={<div className={room.loading}>Loading Systems...</div>}>
                <Canvas 
                  camera={{ position: [0, 1.5, 6], fov: 45 }} 
                  style={{ width: '100%', height: '100%', zIndex: 3 }}
                >
                  <ambientLight intensity={0.8} />
                  <pointLight position={[5, 5, 5]} intensity={1.5} />
                  <MiniRobotPreview color={previewSkin.color} type={previewSkin.type} />
                </Canvas>
              </Suspense>

              <div className={room.previewLabel}>
                {previewSkin.name}
              </div>
            </div>
            
            <div className={room.podHint}>
              Hover to preview • Click to action
            </div>
          </div>

          {/* Right side: Shop */}
          <div className={room.shop}>
            <div className={room.podTop}>
              <div className={room.podLabel}>AVAILABLE SKINS</div>
            </div>

            <div className={room.items}>
               {ROBOT_CATALOG.map((robot) => (
                 <div
                   key={robot.id}
                   className={`${room.shopItem} ${selectedRobotId === robot.id ? room.shopItemActive : ''} ${robot.type === 'luxury' ? room.shopItemLuxury : ''} ${robot.type === 'special' ? room.shopItemSpecial : ''}`}
                   onMouseEnter={() => setPreviewId(robot.id)}
                 >
                   <div className={room.itemInfo}>
                     <div className={room.itemName}>
                       {robot.name}
                       {selectedRobotId === robot.id && <span className={room.tagEquipped}>SELECTED</span>}
                     </div>
                     <div className={room.itemMeta}>
                       Price: {robot.price} • {robot.type.toUpperCase()}
                     </div>
                   </div>
                   <div className={room.itemAction}>
                     {renderRobotAction(robot)}
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Message notification */}
        {message && (
          <div className={`${room.notice} ${messageKind === 'ok' ? room.noticeOk : room.noticeWarn}`}>
            {message}
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '20px 40px',
            borderRadius: '12px',
            color: '#00f2ff',
            fontSize: '1.2rem',
            zIndex: 10000
          }}>
            Processing transaction...
          </div>
        )}

        {/* Confirmation Modal */}
        {pendingEquip && (
          <div className={room.modalOverlay}>
            <div className={room.modal}>
              <h3>Confirm Component Sync</h3>
              <p>Sync robot interface with <span style={{color: pendingEquip.color}}>{pendingEquip.name}</span>?</p>
              <div className={room.modalActions}>
                <button 
                  className={room.btnEquip} 
                  onClick={() => { 
                    selectRobotWithDB(pendingEquip.id); 
                    setPendingEquip(null); 
                  }}
                >
                  SYNC
                </button>
                <button className={room.btnCancel} onClick={() => setPendingEquip(null)}>CANCEL</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
