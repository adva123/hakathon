

import React, { useState, useContext, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { GameContext } from '../../context/gameState.js';
import api from '../../services/api';
import styles from './PrivacyRoom.module.css';

function PrivacyRoom({ gestureRef }) {
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
  // Fullscreen image modal state
  const [showFullImage, setShowFullImage] = useState(false);
  const [useDALLE, setUseDALLE] = useState(false); // אופציה ל-DALL-E
  const { score, coins, energy, addDollToInventory, setCoins, addScore, registerMistake, shopState, setMovementLocked, handleBack } = useContext(GameContext);
  // Gesture-based navigation: listen for "iloveyou" gesture to go back
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
  // Track number of consecutive bad images
  const badImageCountRef = useRef(0);

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
        const doll = response.data.doll;
        const isUnsafe = response.data.isUnsafe;

        if (!isUnsafe) {
          // ✅ Good image: rewards
          setMessageKind('ok');
          setMessage('🌟 Creative! +10 points, +5 coins!');
          if (addScore) addScore(10);
          if (setCoins) setCoins(prev => prev + 5);
          setGeneratedDoll(doll);
          setSelectedDoll(doll);
          badImageCountRef.current = 0;
          if (addDollToInventory) addDollToInventory(doll);
        } else {
          // ❌ Unsafe image: penalty
          setMessageKind('error');
          setMessage('⚠️ Inappropriate or unsafe content detected! Energy decreased.');
          const redXDoll = {
            ...doll,
            imageUrl: 'https://img.icons8.com/emoji/256/cross-mark.png',
            name: 'Blocked Content',
            description: 'This image was blocked for safety reasons.',
            isGood: false
          };
          setGeneratedDoll(redXDoll);
          setSelectedDoll(redXDoll);
          if (registerMistake) registerMistake();
          if (addScore) addScore(-10);
        }
      } else {
        setMessageKind('warn');
        setMessage(response.data.message);
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

  // Download doll image
  const downloadDoll = async (url, name) => {
    console.log('📥 Downloading:', url);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
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
      alert('Download failed. The image might still be generating. Try again in a few seconds.');
    }
  };

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

  // ✅ Image loading handler
  const [imageLoadStates, setImageLoadStates] = useState({});

  const handleImageLoad = (dollId) => {
    console.log('✅ Image loaded:', dollId);
    setImageLoadStates(prev => ({ ...prev, [dollId]: 'loaded' }));
  };

  const handleImageError = (e, dollId, dollName) => {
    console.error('❌ Image failed:', dollId);
    setImageLoadStates(prev => ({ ...prev, [dollId]: 'error' }));

    // Fallback placeholder
    e.target.src = `https://via.placeholder.com/500/cccccc/666666?text=${encodeURIComponent(dollName)}`;
  };

  const currentRisk = calculateRisk();

  return (
    <div className={styles.privacyRoom} onClick={e => e.stopPropagation()}>
      <h2 className={styles.neonTitle}>🎨 AI Doll Factory & Museum</h2>

      {/* Enhanced Status bar with score, coins, energy */}
      <div className={styles.statusBar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <span>🎭 Collection: {shopState?.generatedDolls?.length || 0} dolls</span>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', fontSize: '1.1rem' }}>
          <span title="Score" style={{ color: '#00f2ff', fontWeight: 600 }}>⭐ {score}</span>
          <span title="Coins" style={{ color: '#ffd700', fontWeight: 600 }}>🪙 {coins}</span>
          <span title="Energy" style={{ color: '#ff0055', fontWeight: 600 }}>⚡ {energy}</span>
        </div>
      </div>

      <div className={styles.mainLayout}>
        {/* Back button for returning to forest/lobby */}
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
                      // ✅ אם אין תמונה, הצג הודעה
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

                {/* Fullscreen modal for image */}

                {showFullImage && (
                  <div className={styles.fullImageOverlay} onClick={() => setShowFullImage(false)}>
                    <div className={styles.fullImageContainer} onClick={e => e.stopPropagation()}>
                      <img
                        src={selectedDoll.imageUrl}
                        alt={selectedDoll.name}
                        className={styles.fullImage}
                      />
                      <button className={styles.closeFullImage} onClick={e => { e.stopPropagation(); setShowFullImage(false); }}>✖</button>
                    </div>
                  </div>
                )}

                <h3>{selectedDoll.name}</h3>
                <p className={styles.dollDescription}>{selectedDoll.description}</p>

                {selectedDoll.generationMethod && (
                  <p className={styles.generationInfo}>
                    Created with: {selectedDoll.generationMethod}
                  </p>
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
                <p className={styles.emptyAlbum}>
                  No dolls yet. Create your first AI doll!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Control side - Futuristic motivational panel */}
        <div className={styles.controlSide}>
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
              <span role="img" aria-label="gift">🎁</span> Earn rewards for every creative doll you make!
            </div>
            <div style={{ fontSize: '1.2rem', margin: '10px 0' }}>
              <span role="img" aria-label="star">✨</span> The more original and positive your world, the more coins you get!
            </div>
            <div style={{ fontSize: '1.2rem', margin: '10px 0' }}>
              <span role="img" aria-label="robot">🤖</span> Robots love imagination!
            </div>
            <div style={{ fontSize: '1.1rem', margin: '18px 0 0 0', color: '#ff0055', fontWeight: 'bold' }}>
              <span role="img" aria-label="warning">⚠️</span> Inappropriate or unsafe creations lose points and may be removed.
            </div>
          </div>
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


export default PrivacyRoom;
