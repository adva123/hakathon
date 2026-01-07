import { useContext, useEffect, useRef, useState } from 'react';
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
  {
    id: 'hoodie',
    name: 'Stealth Hoodie',
    price: 90,
    category: 'clothing',
    image: '/shop/hoodie.svg',
    description: 'Stay incognito with this sleek hoodie.',
  },
  {
    id: 'pants',
    name: 'Cargo Pants',
    price: 70,
    category: 'clothing',
    image: '/shop/pants.svg',
    description: 'Tactical pants with extra pockets.',
  },
  {
    id: 'helmet',
    name: 'Smart Helmet',
    price: 150,
    category: 'accessory',
    image: '/shop/helmet.svg',
    description: 'Advanced helmet with HUD display.',
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

export default function ClothingRoom({ gestureRef }) {
  const { score, coins, energy, handleBack, buyItem, addEnergy } = useContext(GameContext);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState(''); // 'ok' | 'warn' | ''
  const [activeTab, setActiveTab] = useState('clothing'); // 'clothing' | 'energy'
  const gestureSeenRef = useRef({ lastAcceptedAt: 0 });

  // זיהוי מחוות ידיים - iLoveYou כדי לחזור
  useEffect(() => {
    if (!gestureRef?.current) return;
    
    const id = setInterval(() => {
      const g = gestureRef.current;
      if (!g || !g.hasHand) return;

      const gesture = String(g.gesture || 'none');
      const now = Date.now();

      // Cooldown למניעת הפעלה כפולה
      if (now - gestureSeenRef.current.lastAcceptedAt < 800) return;

      if (gesture === 'iLoveYou') {
        handleBack();
        gestureSeenRef.current.lastAcceptedAt = now;
      }
    }, 100);

    return () => clearInterval(id);
  }, [gestureRef, handleBack]);

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

  // Clothing shop disabled. Only robot shop is available.
  return (
    <div className={`${styles.panel} ${room.room}`}>
      <div className={room.header}>
        <h2 className={room.title}>Clothing & Accessories Shop Disabled</h2>
        <div className={`${styles.small} ${room.subtitle}`}>This shop is now closed. Please visit the Robot Shop to buy and select robots.</div>
      </div>
      <div className={styles.hr} />
      <div className={`${styles.row} ${room.actions}`}>
        <button type="button" className={styles.button} onClick={back}>
          Back
        </button>
      </div>
    </div>
  );
}

ClothingRoom.propTypes = {
  addScore: PropTypes.func,
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
};
