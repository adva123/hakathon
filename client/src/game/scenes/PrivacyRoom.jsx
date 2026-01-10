import React, { useState, useContext, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { GameContext } from '../../context/gameState.js';
import api from '../../services/api';
import styles from './PrivacyRoom.module.css';

/**
 * Privacy Room Component - AI Doll Factory & Museum
 * WITH VISIBLE RESOURCE BANK (Inline Styles)
 */
const PrivacyRoom = ({ gestureRef }) => {
  // State management
  const [dollDescription, setDollDescription] = useState('');
  const [privacySettings, setPrivacySettings] = useState({
    isNamePublic: false,
    isAgePublic: false,
    isSchoolPublic: false,
    isPhonePublic: false,
    isAddressPublic: false,
    isPhotoPublic: false,
    isLocationPublic: false,
  });
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState('');
  const [generatedDoll, setGeneratedDoll] = useState(null);
  const [selectedDoll, setSelectedDoll] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [useDALLE, setUseDALLE] = useState(false);
  const [imageLoadStates, setImageLoadStates] = useState({});
  
  // Refs
  const badImageCountRef = useRef(0);

  // Context
  const {
    score,
    coins,
    energy,
    addDollToInventory,
    setCoins,
    addScore,
    registerMistake,
    shopState,
    handleBack,
    exchangePointsForCoins,
    buyEnergyWithCoins
  } = useContext(GameContext);

  // Gesture-based navigation
  useEffect(() => {
    if (!gestureRef?.current) return;
    const interval = setInterval(() => {
      const g = gestureRef.current;
      if (!g || !g.hasHand) return;
      const gesture = String(g.gesture || 'none');
      if (gesture === 'iLoveYou' || gesture === 'iloveyou') {
        if (handleBack) handleBack();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [gestureRef, handleBack]);

  // Load dolls from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('saved_dolls');
    if (saved) {
      try {
        const dolls = JSON.parse(saved);
        if (Array.isArray(dolls) && dolls.length > 0) {
          setSelectedDoll(dolls[dolls.length - 1]);
        }
      } catch (err) {
        console.error('Failed to load saved dolls:', err);
      }
    }
  }, []);

  // Handlers
  const handleToggle = (field) => {
    setPrivacySettings(prev => ({ ...prev, [field]: !prev[field] }));
    setMessage('');
  };

  const calculateRisk = () => {
    let risk = 0;
    if (privacySettings.isPhonePublic) risk += 3;
    if (privacySettings.isAddressPublic) risk += 4;
    if (privacySettings.isLocationPublic) risk += 2;
    if (privacySettings.isPhotoPublic) risk += 1;
    return risk;
  };

  const handleGenerateDoll = async () => {
    if (!dollDescription.trim()) {
      setMessageKind('warn');
      setMessage('Please describe your doll first!');
      return;
    }

    setIsLoading(true);
    setMessage('Creating your AI doll... 🎨');
    setMessageKind('info');
    setGeneratedDoll(null);

    console.log('🎭 Generating doll with AI:', dollDescription);

    try {
      const response = await api.post('/dolls/generate', {
        dollDescription,
        privacySettings,
        useDALLE
      });

      if (response.data.success) {
        const isUnsafe = response.data.isUnsafe;
        if (isUnsafe) {
          const redXDoll = {
            id: 'blocked_' + Date.now(),
            name: 'Blocked Content',
            imageUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png',
            description: 'This creation was blocked for safety reasons.'
          };
          setGeneratedDoll(redXDoll);
          setSelectedDoll(redXDoll);
          setMessageKind('error');
          setMessage('⚠️ Safety Warning: Do not share personal info! -1 Energy.');
          if (registerMistake) registerMistake();
        } else {
          const doll = response.data.doll;
          setGeneratedDoll(doll);
          setSelectedDoll(doll);
          if (addScore) addScore(10);
          if (setCoins) setCoins(prev => prev + 5);
          setMessageKind('ok');
          setMessage('🌟 Amazing! +10 points & +5 coins!');
          if (addDollToInventory) addDollToInventory(doll);
        }
      }
    } catch (error) {
      console.error('❌ Error generating doll:', error);
      setMessageKind('error');
      setMessage(error.response?.data?.message || 'Failed to create doll. Check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFromAlbum = (doll) => {
    console.log('📌 Selected from album:', doll);
    setSelectedDoll(doll);
    setGeneratedDoll(doll);
  };

  const downloadDoll = async (url, name) => {
    console.log('📥 Downloading:', url);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${name}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      console.log('✅ Download successful');
    } catch (e) {
      console.error('❌ Download failed:', e);
      alert('Download failed. Try again in a few seconds.');
    }
  };

  const handleImageLoad = (dollId) => {
    console.log('✅ Image loaded:', dollId);
    setImageLoadStates(prev => ({ ...prev, [dollId]: 'loaded' }));
  };

  const handleImageError = (e, dollId, dollName) => {
    console.error('❌ Image failed:', dollId);
    setImageLoadStates(prev => ({ ...prev, [dollId]: 'error' }));
    e.target.src = `https://via.placeholder.com/500/cccccc/666666?text=${encodeURIComponent(dollName)}`;
  };

  const currentRisk = calculateRisk();

  return (
    <div className={styles.privacyRoom} onClick={e => e.stopPropagation()}>
      <h2 className={styles.neonTitle}>🎨 AI Doll Factory & Museum</h2>

      {/* Status bar */}
      <div className={styles.statusBar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <span>🎭 Collection: {shopState?.generatedDolls?.length || 0} dolls</span>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', fontSize: '1.1rem' }}>
          <span title="Score" style={{ color: '#00f2ff', fontWeight: 600 }}>⭐ {score}</span>
          <span title="Coins" style={{ color: '#ffd700', fontWeight: 600 }}>🪙 {coins}</span>
          <span title="Energy" style={{ color: '#ff0055', fontWeight: 600 }}>⚡ {energy}</span>
        </div>
      </div>

      <div className={styles.mainLayout}>
        {/* Back button */}
        <button
          className={styles.backButton}
          onClick={handleBack}
          style={{
            position: 'absolute',
            top: 18,
            left: 18,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            borderRadius: '12px',
            color: '#00f2ff',
            fontSize: '1.3rem',
            padding: '8px 18px',
            boxShadow: '0 0 12px #00f2ff55',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          ← Back
        </button>

        {/* Display side */}
        <div className={styles.displaySide}>
          <div className={styles.previewZone}>
            {selectedDoll ? (
              <div className={styles.bigFocus}>
                <div className={styles.imageContainer}>
                  {imageLoadStates[selectedDoll.id] === 'loading' && (
                    <div className={styles.imageLoader}>
                      <div className={styles.spinner}>🎨</div>
                      <p>AI is creating your image...</p>
                    </div>
                  )}
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    {selectedDoll.imageUrl ? (
                      <>
                        <img
                          src={selectedDoll.imageUrl}
                          className={selectedDoll.blur ? styles.blurred : ''}
                          alt={selectedDoll.name}
                          onLoad={() => handleImageLoad(selectedDoll.id)}
                          onError={(e) => handleImageError(e, selectedDoll.id, selectedDoll.name)}
                          style={{
                            display: imageLoadStates[selectedDoll.id] === 'loading' ? 'none' : 'block',
                            cursor: 'zoom-in',
                            borderRadius: '12px',
                            maxWidth: '100%',
                            boxShadow: '0 0 18px #00f2ff33'
                          }}
                          onClick={() => setShowFullImage(true)}
                        />
                        {!selectedDoll.blur && imageLoadStates[selectedDoll.id] === 'loaded' && (
                          <button
                            className={styles.downloadIconSmall}
                            title="Download image"
                            onClick={e => {
                              e.stopPropagation();
                              downloadDoll(selectedDoll.imageUrl, selectedDoll.name);
                            }}
                          >
                            📥
                          </button>
                        )}
                      </>
                    ) : (
                      <div style={{
                        padding: '40px',
                        background: 'rgba(255,0,85,0.1)',
                        borderRadius: '12px',
                        textAlign: 'center',
                        color: '#ff0055'
                      }}>
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚠️</div>
                        <p>Image generation failed</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                          {selectedDoll.generationMethod || 'Unknown error'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {showFullImage && (
                  <div className={styles.fullImageOverlay} onClick={() => setShowFullImage(false)}>
                    <div className={styles.fullImageContainer} onClick={e => e.stopPropagation()}>
                      <img src={selectedDoll.imageUrl} alt={selectedDoll.name} className={styles.fullImage} />
                      <button className={styles.closeFullImage} onClick={e => { e.stopPropagation(); setShowFullImage(false); }}>✖</button>
                    </div>
                  </div>
                )}

                <h3>{selectedDoll.name}</h3>
                <p className={styles.dollDescription}>{selectedDoll.description}</p>
                {selectedDoll.generationMethod && (
                  <p className={styles.generationInfo}>Created with: {selectedDoll.generationMethod}</p>
                )}
              </div>
            ) : (
              <div className={styles.emptyPreview}>
                <p>👆 Select a doll from your collection</p>
                <p>or</p>
                <p>✨ Create a new AI doll below!</p>
              </div>
            )}
          </div>

          <div className={styles.albumContainer}>
            <h4>My AI Collection ({shopState?.generatedDolls?.length || 0})</h4>
            <div className={styles.dollGrid}>
              {shopState?.generatedDolls?.length > 0 ? (
                shopState.generatedDolls.map((doll) => (
                  <div
                    key={doll.id}
                    className={`${styles.dollCard} ${selectedDoll?.id === doll.id ? styles.selected : ''}`}
                    onClick={() => handleSelectFromAlbum(doll)}
                  >
                    <img
                      src={doll.imageUrl}
                      alt={doll.name}
                      onLoad={() => handleImageLoad(doll.id)}
                      onError={(e) => handleImageError(e, doll.id, doll.name)}
                    />
                    <span>{doll.name}</span>
                  </div>
                ))
              ) : (
                <p className={styles.emptyAlbum}>No dolls yet. Create your first AI doll!</p>
              )}
            </div>
          </div>
        </div>

        {/* Control side */}
        <div className={styles.controlSide}>
          {/* Motivational panel */}
          <div style={{
            background: 'rgba(0,0,0,0.18)',
            borderRadius: '18px',
            padding: '28px 18px',
            marginBottom: '18px',
            boxShadow: '0 0 18px #00f2ff33',
            textAlign: 'center',
            color: '#fff',
            fontSize: '1.1rem',
            lineHeight: 1.7
          }}>
            <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>
              🌌 <span style={{ color: '#00f2ff' }}>Create Your Own World!</span>
            </div>
            <div style={{ fontSize: '1.5rem', margin: '10px 0' }}>
              🎁 Earn rewards for every creative doll you make!
            </div>
            <div style={{ fontSize: '1.2rem', margin: '10px 0' }}>
              ✨ The more original and positive your world, the more coins you get!
            </div>
            <div style={{ fontSize: '1.2rem', margin: '10px 0' }}>
              🤖 Robots love imagination!
            </div>
            <div style={{ fontSize: '1.1rem', margin: '18px 0 0 0', color: '#ff0055', fontWeight: 'bold' }}>
              ⚠️ Inappropriate or unsafe creations lose points and may be removed.
            </div>
          </div>

          {/* 🏦 RESOURCE BANK - WITH INLINE STYLES (GUARANTEED VISIBLE!) */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(40, 20, 60, 0.85) 100%)',
            border: '3px solid #ffd700',
            borderRadius: '18px',
            padding: '25px 20px',
            marginBottom: '25px',
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(255, 215, 0, 0.1)',
            position: 'relative',
            zIndex: 1000
          }}>
            <h4 style={{
              color: '#ffd700',
              margin: '0 0 20px 0',
              fontSize: '1.6rem',
              textAlign: 'center',
              textShadow: '0 0 10px rgba(255, 215, 0, 0.8)',
              fontWeight: 'bold'
            }}>
              🏦 בנק המשאבים
            </h4>
            
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              {/* Exchange Points for Coins */}
              <button
                onClick={() => {
                  console.log('🔄 Attempting to exchange points for coins...');
                  if (!exchangePointsForCoins) {
                    console.error('❌ exchangePointsForCoins function not available!');
                    setMessage('❌ שגיאה: הפונקציה לא זמינה');
                    return;
                  }
                  const res = exchangePointsForCoins(50);
                  console.log('📊 Exchange result:', res);
                  if (res?.success) {
                    setMessage('✅ המרת 50 נקודות ל-25 מטבעות! 💰');
                    setMessageKind('ok');
                  } else {
                    setMessage(res?.message || '❌ שגיאה בהמרה');
                    setMessageKind('error');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                  color: '#000',
                  border: 'none',
                  padding: '15px 25px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                  transition: 'all 0.3s',
                  minWidth: '160px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)';
                }}
              >
                ⭐ 50 ➔ 💰 25
              </button>

              {/* Buy Energy with Coins */}
              <button
                onClick={() => {
                  console.log('⚡ Attempting to buy energy...');
                  if (!buyEnergyWithCoins) {
                    console.error('❌ buyEnergyWithCoins function not available!');
                    setMessage('❌ שגיאה: הפונקציה לא זמינה');
                    return;
                  }
                  const res = buyEnergyWithCoins(30);
                  console.log('📊 Buy energy result:', res);
                  if (res?.success) {
                    setMessage('✅ האנרגיה התחדשה! ⚡');
                    setMessageKind('ok');
                  } else {
                    setMessage(res?.message || '❌ אין מספיק מטבעות');
                    setMessageKind('error');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #ff0055 0%, #ff4088 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '15px 25px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(255, 0, 85, 0.4)',
                  transition: 'all 0.3s',
                  minWidth: '160px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(255, 0, 85, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(255, 0, 85, 0.4)';
                }}
              >
                💰 30 ➔ ⚡ +1
              </button>
            </div>

            {/* Info text */}
            <p style={{
              marginTop: '15px',
              fontSize: '0.9rem',
              color: '#aaa',
              textAlign: 'center',
              lineHeight: 1.5
            }}>
              💡 המר נקודות למטבעות או קנה אנרגיה!
            </p>
          </div>

          {/* Input area */}
          <div className={styles.inputArea}>
            <textarea
              className={styles.dollInput}
              value={dollDescription}
              onChange={e => setDollDescription(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              placeholder="Describe your dream world or doll... (e.g., 'A neon robot princess in a glass city')"
              rows="3"
            />
            <button
              className={styles.generateBtn}
              onClick={handleGenerateDoll}
              disabled={isLoading}
            >
              {isLoading ? '🎨 AI CREATING...' : '✨ GENERATE AI DOLL'}
            </button>
            {message && (
              <div className={`${styles.message} ${styles[messageKind]}`}>
                {message}
              </div>
            )}
            <p className={styles.hint}>
              💡 Tip: The more creative and positive your idea, the more rewards you get!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

PrivacyRoom.propTypes = {
  gestureRef: PropTypes.shape({
    current: PropTypes.any
  })
};

export default PrivacyRoom;
