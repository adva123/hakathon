import { useContext, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import styles from '../game.module.css';
import room from './ShopRoom.module.css';
import { Canvas } from '@react-three/fiber';
import MiniRobotPreview from '../../components/common/MiniRobotPreview/MiniRobotPreview';
import { GameContext } from '../../context/GameContext.jsx';
import { ROBOT_CATALOG } from '../../features/robot/robotCatalog.js';

export default function ShopRoom() {
  const { coins, shopState, buyRobot, selectRobot, handleBack } = useContext(GameContext);

  const ownedRobots = useMemo(() => new Set(shopState?.ownedRobots || []), [shopState?.ownedRobots]);
  
  // בדיקה אם יש רובוטים בבעלות המשתמש
  const hasOwnedRobots = (shopState?.ownedRobots && shopState.ownedRobots.length > 0);
  const selectedRobotId = shopState?.selectedRobotId || (hasOwnedRobots ? ROBOT_CATALOG[0].id : null);
  
  // State לתצוגה מקדימה (Preview) - מתעדכן ב-Hover
  const [previewId, setPreviewId] = useState(selectedRobotId || ROBOT_CATALOG[0].id);
  
  const previewSkin = useMemo(() => {
    return ROBOT_CATALOG.find(r => r.id === previewId) || ROBOT_CATALOG[0];
  }, [previewId]);

  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState('');
  const [equipFx, setEquipFx] = useState(false);
  const [pendingEquip, setPendingEquip] = useState(null);
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

  const buy = (robot) => {
    if (coins >= robot.price) {
      const res = buyRobot({ robotId: robot.id, price: robot.price, useCoins: true });
      if (res.ok) {
        setMessageKind('ok');
        setMessage(`Unlocked ${robot.name}!`);
        triggerEquipFx();
      }
    } else {
      setMessageKind('warn');
      setMessage(`Not enough coins! You need ${robot.price - coins} more.`);
    }
  };

  // פונקציית פעולה לכל רובוט (מחליטה איזה כפתור להציג)
  const renderRobotAction = (robot) => {
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
          onClick={() => {
            selectRobot(robot.id);
            triggerEquipFx();
          }}
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
        >
          BUY ({robot.price})
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
        <div className={room.podStatus}>POD ONLINE</div>
      </div>

      <div className={room.layout}>
        {/* צד שמאל: Charging Pod - תצוגה מקדימה ב-3D */}
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

        {/* צד ימין: Robot Shop - רשימת הרובוטים */}
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

      {message && (
        <div className={`${room.notice} ${messageKind === 'ok' ? room.noticeOk : room.noticeWarn}`}>
          {message}
        </div>
      )}

      {/* Confirmation Modal */}
      {pendingEquip && (
        <div className={room.modalOverlay}>
          <div className={room.modal}>
            <h3>Confirm Component Sync</h3>
            <p>Sync robot interface with <span style={{color: pendingEquip.color}}>{pendingEquip.name}</span>?</p>
            <div className={room.modalActions}>
              <button className={room.btnEquip} onClick={() => { selectRobot(pendingEquip.id); setPendingEquip(null); triggerEquipFx(); }}>SYNC</button>
              <button className={room.btnCancel} onClick={() => setPendingEquip(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}