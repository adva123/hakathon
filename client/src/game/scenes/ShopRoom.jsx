
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Suspense } from 'react';
import styles from '../game.module.css';
import room from './ShopRoom.module.css';
import { Canvas } from '@react-three/fiber';
import MiniRobotPreview from '../../components/common/MiniRobotPreview/MiniRobotPreview';
import { GameContext } from '../../context/gameState.js';
import { ROBOT_CATALOG } from '../../robotCatalog.js';

export default function ShopRoom() {
  const { score, shopState, buyRobot, selectRobot, handleBack } = useContext(GameContext);
  
  const ownedRobots = useMemo(() => new Set(shopState?.ownedRobots || []), [shopState?.ownedRobots]);
  const selectedRobotId = shopState?.selectedRobotId || ROBOT_CATALOG[0].id;
  
  // State לתצוגה מקדימה (Preview)
  const [previewId, setPreviewId] = useState(selectedRobotId);
  const previewSkin = useMemo(() => ROBOT_CATALOG.find(r => r.id === previewId) || ROBOT_CATALOG[0], [previewId]);

  // פונקציית פעולה לכל רובוט (כפתור מתאים)
  const renderRobotAction = (robot) => {
    const isOwned = ownedRobots.has(robot.id);
    const isSelected = selectedRobotId === robot.id;
    const canAfford = score >= robot.price;

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
          onClick={() => buy(robot)}
        >
          BUY ({robot.price})
        </button>
      );
    }
    return (
      <div className={room.lockedStatus}>
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M12 17a2 2 0 100-4 2 2 0 000 4z" fill="currentColor" />
          <path d="M18 8h-1V6a5 5 0 00-10 0v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zM9 6a3 3 0 016 0v2H9V6z" fill="currentColor" />
        </svg>
        LOCKED
      </div>
    );
  };
  const selectedSkin = useMemo(() => ROBOT_CATALOG.find(r => r.id === selectedRobotId), [selectedRobotId]);

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
    if (score >= robot.price) {
      const res = buyRobot({ robotId: robot.id, price: robot.price });
      if (res.ok) {
        setMessageKind('ok');
        setMessage(`Successfully unlocked ${robot.name}! -${robot.price} Score`);
        triggerEquipFx();
        window.dispatchEvent(new CustomEvent('hakathon.shop.buy', { 
          detail: { robotId: robot.id, price: robot.price } 
        }));
      }
    } else {
      setMessageKind('warn');
      setMessage(`Insufficient score! You need ${robot.price - score} more.`);
    }
  };

  const handleAction = (robot) => {
    const isOwned = ownedRobots.has(robot.id);
    if (isOwned) {
      setPendingEquip(robot);
    } else {
      buy(robot);
    }
  };

  return (
    <div className={`${styles.panel} ${room.room}`}>
      <div className={room.header}>
        <div>
          <h2 className={room.title}>🛍️ Robot Upgrade Pod</h2>
          <div className={`${styles.small} ${room.subtitle}`}>
            Spend score to customize your appearance.
          </div>
        </div>
        <div className={room.podStatus}>POD ONLINE</div>
      </div>

      <div className={room.layout}>
        {/* צד שמאל: Charging Pod - תצוגה מקדימה ב-3D */}
        <div className={`${room.pod} ${room.glassNeon}`}>
          <div className={room.podTop}>
            <div className={room.podLabel}>PREVIEW UNIT</div>
            <div className={room.kpi}>Wallet: {score}</div>
          </div>

          <div className={room.robotStage}>
            <div className={room.robotGlow} style={{ '--robot-glow-color': previewSkin.color }} />
            <div className={room.robotScan} />
            
            <Suspense fallback={<div style={{color: 'white'}}>Loading Systems...</div>}>
            <Canvas camera={{ position: [0, 0, 4.5] }} style={{ width: '100%', height: '100%', zIndex: 3 }}>
              <ambientLight intensity={0.7} />
              <pointLight position={[10, 10, 10]} color={previewSkin.color} intensity={1.5} />
              <MiniRobotPreview color={previewSkin.color} type={previewSkin.type} />
            </Canvas>
            </Suspense>

            <Canvas 
              camera={{ position: [0, 1.5, 6], fov: 45 }} 
              style={{ width: '100%', height: '100%', zIndex: 3 }}
            >
              <ambientLight intensity={0.8} />
              <pointLight position={[5, 5, 5]} intensity={1.5} />
              <Suspense fallback={null}>
                <MiniRobotPreview color={previewSkin.color} type={previewSkin.type} />
              </Suspense>
            </Canvas>
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

      {message && <div className={`${room.notice} ${messageKind === 'ok' ? room.noticeOk : room.noticeWarn}`}>{message}</div>}

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