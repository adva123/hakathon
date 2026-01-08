

import React, { useState, useContext, useEffect, useRef } from 'react';
import { GameContext } from '../../context/gameState.js';
import api from '../../services/api';
import styles from './PrivacyRoom.module.css';

const PrivacyRoom = () => {
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
  const [useDALLE, setUseDALLE] = useState(false); // אופציה ל-DALL-E
  const { addDollToInventory, setCoins, addScore, registerMistake, shopState, setMovementLocked } = useContext(GameContext);
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
        useDALLE // שולח true אם רוצים DALL-E (בתשלום)
      });

      console.log('📦 Server response:', response.data);

      if (response.data.success) {
        setMessageKind('ok');
        setMessage(response.data.message);

        const doll = response.data.doll;
        console.log('✅ Doll created:', doll);

        setGeneratedDoll(doll);
        setSelectedDoll(doll);

        // Add to inventory
        if (addDollToInventory) {
          addDollToInventory(doll);
        }

        // --- Reward/Penalty Logic ---
        // Assume server returns a field: doll.isGood (true/false) or doll.quality ('good'|'bad')
        const isGood = doll.isGood !== undefined ? doll.isGood : (doll.quality === 'good');
        if (isGood) {
          if (addScore) addScore(30);
          if (setCoins) setCoins(prev => prev + 10);
          badImageCountRef.current = 0;
          setMessageKind('ok');
          setMessage('🌟 Creative! +30 points, +10 coins!');
        } else {
          if (addScore) addScore(-10);
          badImageCountRef.current += 1;
          setMessageKind('warn');
          setMessage('⚠️ Inappropriate or unsafe creation. -10 points.');
          if (badImageCountRef.current >= 3) {
            if (registerMistake) registerMistake();
            setMessageKind('warn');
            setMessage('⚠️ 3 unsafe creations! Energy -10.');
            badImageCountRef.current = 0;
          }
        }

        // Save in localStorage
        const savedDolls = JSON.parse(localStorage.getItem('saved_dolls') || '[]');
        savedDolls.push(doll);
        localStorage.setItem('saved_dolls', JSON.stringify(savedDolls));

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
      
      {/* Status bar */}
      <div className={styles.statusBar}>
        <span>🎭 Collection: {shopState?.generatedDolls?.length || 0} dolls</span>
        <span>🎨 AI: {useDALLE ? 'DALL-E 3' : 'Pollinations (Free)'}</span>
      </div>

      <div className={styles.mainLayout}>
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
                  
                  <img 
                    src={selectedDoll.imageUrl} 
                    className={selectedDoll.blur ? styles.blurred : ''} 
                    alt={selectedDoll.name}
                    onLoad={() => handleImageLoad(selectedDoll.id)}
                    onError={(e) => handleImageError(e, selectedDoll.id, selectedDoll.name)}
                    style={{
                      display: imageLoadStates[selectedDoll.id] === 'loading' ? 'none' : 'block'
                    }}
                  />
                  
                  {!selectedDoll.blur && imageLoadStates[selectedDoll.id] === 'loaded' && (
                    <button 
                      className={styles.downloadIcon} 
                      onClick={() => downloadDoll(selectedDoll.imageUrl, selectedDoll.name)}
                    >
                      📥 Download
                    </button>
                  )}
                </div>
                
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
            <div style={{fontSize: '2.2rem', marginBottom: 10}}>
              🌌 <span style={{color:'#00f2ff'}}>Create Your Own World!</span>
            </div>
            <div style={{fontSize: '1.5rem', margin: '10px 0'}}>
              <span role="img" aria-label="gift">🎁</span> Earn rewards for every creative doll you make!
            </div>
            <div style={{fontSize: '1.2rem', margin: '10px 0'}}>
              <span role="img" aria-label="star">✨</span> The more original and positive your world, the more coins you get!
            </div>
            <div style={{fontSize: '1.2rem', margin: '10px 0'}}>
              <span role="img" aria-label="robot">🤖</span> Robots love imagination!
            </div>
            <div style={{fontSize: '1.1rem', margin: '18px 0 0 0', color:'#ff0055', fontWeight:'bold'}}>
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
