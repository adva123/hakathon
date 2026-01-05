import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import styles from '../game.module.css';
import room from './ShopRoom.module.css';
import { GameContext } from '../../context/gameState.js';

const items = [
  {
    id: 'hat',
    name: 'Hat',
    price: 50,
    image: '/shop/hat.svg',
    description: 'Cosmetic upgrade: friendly explorer vibes.',
  },
  {
    id: 'gold',
    name: 'Gold Paint',
    price: 100,
    image: '/shop/gold.svg',
    description: 'Cosmetic upgrade: legendary finish.',
  },
];

function robotPortraitForEquipped(equippedItem) {
  if (equippedItem === 'hat') return '/robot/robot-hat.svg';
  if (equippedItem === 'gold') return '/robot/robot-gold.svg';
  return '/robot/robot.svg';
}

export default function ShopRoom() {
  const { score, shopState, buyItem, equipItem, handleBack } = useContext(GameContext);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState(''); // 'ok' | 'warn' | ''
  const [equipFx, setEquipFx] = useState(false);
  const equipFxTimerRef = useRef(null);

  const owned = useMemo(() => new Set(shopState?.ownedItems || []), [shopState?.ownedItems]);
  const equippedItem = shopState?.equippedItem || null;
  const portrait = useMemo(() => robotPortraitForEquipped(equippedItem), [equippedItem]);

  useEffect(() => {
    return () => {
      if (equipFxTimerRef.current) {
        window.clearTimeout(equipFxTimerRef.current);
        equipFxTimerRef.current = null;
      }
    };
  }, []);

  const triggerEquipFx = () => {
    setEquipFx(true);
    if (equipFxTimerRef.current) {
      window.clearTimeout(equipFxTimerRef.current);
      equipFxTimerRef.current = null;
    }
    equipFxTimerRef.current = window.setTimeout(() => {
      setEquipFx(false);
      equipFxTimerRef.current = null;
    }, 900);
  };

  const buy = (item) => {
    setMessage('');
    setMessageKind('');

    if (score < item.price) {
      setMessageKind('warn');
      setMessage(`Not enough score. Need ${item.price - score} more.`);
      return;
    }

    const res = buyItem({ itemId: item.id, price: item.price });
    if (!res.ok) {
      setMessageKind('warn');
      setMessage(res.reason === 'insufficient' ? 'Not enough score yet.' : 'Cannot buy item.');
      return;
    }

    // Bridge to 3D Upgrade Pod: fly the purchased accessory into place.
    window.dispatchEvent(new CustomEvent('hakathon.shop.buy', { detail: { itemId: item.id } }));
    triggerEquipFx();

    setMessageKind('ok');
    setMessage(`Purchased: ${item.name}. Equipped in the pod.`);
  };

  const equip = (item) => {
    setMessage('');
    setMessageKind('');
    equipItem(item.id);

    // Sync 3D visuals (no guaranteed animation here; buy handles the fly-in).
    window.dispatchEvent(new CustomEvent('hakathon.shop.equip', { detail: { itemId: item.id } }));

    triggerEquipFx();

    setMessageKind('ok');
    setMessage(`Equipped: ${item.name}`);
  };

  const back = () => handleBack();

  return (
    <div className={`${styles.panel} ${room.room}`}>
      <div className={room.header}>
        <div>
          <h2 className={room.title}>🛍️ Robot Upgrade Pod</h2>
          <div className={`${styles.small} ${room.subtitle}`}>
            Spend score to customize the robot. Equipped upgrades persist across rooms.
          </div>
        </div>
        <div className="neonGlow">POD ONLINE</div>
      </div>

      <div className={styles.hr} />

      <div className={room.layout}>
        <div className={`${room.pod} glassNeon`}>
          <div className={room.podTop}>
            <div className={room.podLabel}>Charging Pod</div>
            <div className={room.kpi}>Score: {score}</div>
          </div>

          <div className={room.robotStage} aria-label="Robot charging pod preview">
            <div className={`${room.glowRing} ${equipFx ? room.glowActive : ''}`} />
            <div className={`${room.arm} ${room.armLeft} ${equipFx ? room.armActive : ''}`} />
            <div className={`${room.arm} ${room.armRight} ${equipFx ? room.armActive : ''}`} />
            <img className={room.robotImg} src={portrait} alt="Robot" />
          </div>

          <div className={room.podHint}>
            Equipped: <strong>{equippedItem || 'None'}</strong> (stays equipped after leaving)
          </div>
        </div>

        <div className={`${room.shop} glassNeon`}>
          <div className={room.podTop}>
            <div className={room.podLabel}>Shop Items</div>
            <div className={room.kpi}>Global Score Wallet</div>
          </div>

          <div className={room.items}>
            {items.map((item, idx) => {
              const isOwned = owned.has(item.id);
              const isEquipped = equippedItem === item.id;
              const canAfford = score >= item.price;

              return (
                <div
                  key={item.id}
                  className={`${room.itemRow} ${idx === items.length - 1 ? room.itemRowLast : ''}`}
                >
                  <div className={room.itemIcon}>
                    <img src={item.image} alt={item.name} width={26} height={26} />
                  </div>

                  <div>
                    <div className={room.itemName}>
                      {item.name}
                      {isEquipped ? <span className={room.tagEquipped}>EQUIPPED</span> : null}
                    </div>
                    <div className={room.itemMeta}>
                      Price: {item.price} • {item.description}
                    </div>
                  </div>

                  {!isOwned ? (
                    <button
                      type="button"
                      className={`${styles.button} ${styles.buttonPrimary}`}
                      onClick={() => buy(item)}
                      disabled={!canAfford}
                      title={!canAfford ? 'Earn more score to buy this item' : undefined}
                    >
                      {canAfford ? 'Buy' : 'Locked'}
                    </button>
                  ) : (
                    <button type="button" className={styles.button} onClick={() => equip(item)} disabled={isEquipped}>
                      {isEquipped ? 'Equipped' : 'Equip'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.hr} />

          <div className={`${styles.row} ${room.actions}`}>
            <button type="button" className={styles.button} onClick={back}>
              Back
            </button>
          </div>

          {message ? (
            <div className={`${room.notice} ${messageKind === 'ok' ? room.noticeOk : room.noticeWarn}`}>{message}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
