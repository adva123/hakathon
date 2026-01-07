import { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import styles from '../game.module.css';
import room from './ClothingRoom.module.css';
import { GameContext } from '../../context/gameState.js';

const clothingItems = [
  // Clothing
  {
    id: 'jacket',
    name: 'Cyber Jacket',
    price: 80,
    category: 'clothing',
    image: '/shop/jacket.svg',
    description: 'Stylish neon jacket for the urban explorer.',
  },
  {
    id: 'boots',
    name: 'Speed Boots',
    price: 60,
    category: 'clothing',
    image: '/shop/boots.svg',
    description: 'Lightweight boots for faster movement.',
  },
  {
    id: 'gloves',
    name: 'Digital Gloves',
    price: 50,
    category: 'clothing',
    image: '/shop/gloves.svg',
    description: 'Enhanced gesture control gloves.',
  },
  {
    id: 'visor',
    name: 'AR Visor',
    price: 120,
    category: 'accessory',
    image: '/shop/visor.svg',
    description: 'Augmented reality visor for enhanced vision.',
  },
  // Accessories
  {
    id: 'backpack',
    name: 'Tech Backpack',
    price: 70,
    category: 'accessory',
    image: '/shop/backpack.svg',
    description: 'Carry more items with style.',
  },
  {
    id: 'necklace',
    name: 'Neon Necklace',
    price: 40,
    category: 'accessory',
    image: '/shop/necklace.svg',
    description: 'Glowing necklace that lights up.',
  },
  {
    id: 'bracelet',
    name: 'Data Bracelet',
    price: 45,
    category: 'accessory',
    image: '/shop/bracelet.svg',
    description: 'Tracks your game stats in style.',
  },
  {
    id: 'belt',
    name: 'Utility Belt',
    price: 55,
    category: 'accessory',
    image: '/shop/belt.svg',
    description: 'Multiple pockets for extra storage.',
  },
];

const energyItems = [
  {
    id: 'energy_small',
    name: 'Energy Boost S',
    price: 30,
    energyAmount: 20,
    image: '/shop/energy-s.svg',
    description: 'Restore 20 energy points.',
  },
  {
    id: 'energy_medium',
    name: 'Energy Boost M',
    price: 50,
    energyAmount: 40,
    image: '/shop/energy-m.svg',
    description: 'Restore 40 energy points.',
  },
  {
    id: 'energy_large',
    name: 'Energy Boost L',
    price: 80,
    energyAmount: 70,
    image: '/shop/energy-l.svg',
    description: 'Restore 70 energy points.',
  },
];

export default function ClothingRoom() {
  const { score, coins, energy, handleBack, buyItem, addEnergy } = useContext(GameContext);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState(''); // 'ok' | 'warn' | ''
  const [activeTab, setActiveTab] = useState('clothing'); // 'clothing' | 'energy'

  const buyClothing = (item) => {
    setMessage('');
    setMessageKind('');

    if (coins < item.price) {
      setMessageKind('warn');
      setMessage(`Not enough coins. Need ${item.price - coins} more.`);
      return;
    }

    const res = buyItem({ itemId: item.id, price: item.price, useCoins: true });
    if (!res.ok) {
      setMessageKind('warn');
      setMessage(res.reason === 'insufficient' ? 'Not enough coins yet.' : 'Cannot buy item.');
      return;
    }

    setMessageKind('ok');
    setMessage(`Purchased: ${item.name}!`);
  };

  const buyEnergy = (item) => {
    setMessage('');
    setMessageKind('');

    if (coins < item.price) {
      setMessageKind('warn');
      setMessage(`Not enough coins. Need ${item.price - coins} more.`);
      return;
    }

    if (energy >= 100) {
      setMessageKind('warn');
      setMessage('Energy is already full!');
      return;
    }

    // Deduct coins and add energy
    const res = buyItem({ itemId: item.id, price: item.price, useCoins: true });
    if (!res.ok) {
      setMessageKind('warn');
      setMessage('Purchase failed.');
      return;
    }

    addEnergy(item.energyAmount);
    setMessageKind('ok');
    setMessage(`Energy restored: +${item.energyAmount} points!`);
  };

  const back = () => handleBack();

  return (
    <div className={`${styles.panel} ${room.room}`}>
      <div className={room.header}>
        <div>
          <h2 className={room.title}>👗 Clothing & Accessories Shop</h2>
          <div className={`${styles.small} ${room.subtitle}`}>
            Your score has been converted to coins (1 point = 5 coins). Upgrade your style and restore energy!
          </div>
        </div>
        <div className={room.stats}>
          <div className={room.statItem}>Coins: <strong>🪙 {coins}</strong></div>
          <div className={room.statItem}>Energy: <strong>{energy}/100</strong></div>
        </div>
      </div>

      <div className={styles.hr} />

      <div className={room.tabs}>
        <button
          type="button"
          className={`${room.tab} ${activeTab === 'clothing' ? room.tabActive : ''}`}
          onClick={() => setActiveTab('clothing')}
        >
          Clothing & Accessories
        </button>
        <button
          type="button"
          className={`${room.tab} ${activeTab === 'energy' ? room.tabActive : ''}`}
          onClick={() => setActiveTab('energy')}
        >
          Energy Boost
        </button>
      </div>

      <div className={room.content}>
        {activeTab === 'clothing' ? (
          <div className={room.grid}>
            {clothingItems.map((item) => {
              const canAfford = coins >= item.price;
              return (
                <div key={item.id} className={`${room.card} glassNeon`}>
                  <div className={room.cardIcon}>
                    <div className={room.iconPlaceholder}>
                      {item.category === 'clothing' ? '👕' : '💎'}
                    </div>
                  </div>
                  <div className={room.cardTitle}>{item.name}</div>
                  <div className={room.cardDesc}>{item.description}</div>
                  <div className={room.cardPrice}>🪙 {item.price} coins</div>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonPrimary} ${room.cardBtn}`}
                    onClick={() => buyClothing(item)}
                    disabled={!canAfford}
                  >
                    {canAfford ? 'Buy' : 'Locked'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={room.grid}>
            {energyItems.map((item) => {
              const canAfford = coins >= item.price;
              const isFull = energy >= 100;
              return (
                <div key={item.id} className={`${room.card} glassNeon`}>
                  <div className={room.cardIcon}>
                    <div className={room.iconPlaceholder}>⚡</div>
                  </div>
                  <div className={room.cardTitle}>{item.name}</div>
                  <div className={room.cardDesc}>{item.description}</div>
                  <div className={room.cardPrice}>🪙 {item.price} coins</div>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonPrimary} ${room.cardBtn}`}
                    onClick={() => buyEnergy(item)}
                    disabled={!canAfford || isFull}
                  >
                    {isFull ? 'Full' : canAfford ? 'Buy' : 'Locked'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.hr} />

      <div className={`${styles.row} ${room.actions}`}>
        <button type="button" className={styles.button} onClick={back}>
          Back
        </button>
      </div>

      {message ? (
        <div className={`${room.notice} ${messageKind === 'ok' ? room.noticeOk : room.noticeWarn}`}>
          {message}
        </div>
      ) : null}
    </div>
  );
}

ClothingRoom.propTypes = {
  addScore: PropTypes.func,
};
