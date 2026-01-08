
import React, { useState, useContext, useEffect } from 'react';
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
  const { addDollToInventory, setCoins, shopState, setMovementLocked } = useContext(GameContext);

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
      setMessage('Please enter a description for your doll!');
      return;
    }
    setIsLoading(true);
    setMessage('');
    setGeneratedDoll(null);
    try {
      const response = await api.post('/dolls/generate', {
        dollDescription,
        privacySettings
      });
      if (response.data.success) {
        setMessageKind('ok');
        setMessage(response.data.message);
        setGeneratedDoll(response.data.doll);
        setSelectedDoll(response.data.doll);
        addDollToInventory && addDollToInventory(response.data.doll);
        setCoins && setCoins(prevCoins => prevCoins + 10);
      } else {
        setMessageKind('warn');
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessageKind('error');
      setMessage(error.response?.data?.message || 'Server error. Could not create doll.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFromAlbum = (doll) => {
    setSelectedDoll(doll);
    setGeneratedDoll(doll);
  };

  // Download button logic
  const downloadDoll = async (url, name) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${name}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('Download failed.');
    }
  };

  // Load dolls from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('saved_dolls');
    if (saved && shopState && shopState.generatedDolls.length === 0) {
      try {
        const dolls = JSON.parse(saved);
        if (Array.isArray(dolls) && dolls.length > 0) {
          setSelectedDoll(dolls[dolls.length - 1]);
          // Optionally update shopState here if needed
        }
      } catch {}
    }
  }, []);

  const currentRisk = calculateRisk();

    return (
      <div className={styles.privacyRoom} onClick={e => e.stopPropagation()}>
        <h2 className={styles.neonTitle}>Doll Factory & Museum</h2>
        <div className={styles.mainLayout}>
          {/* Display side: preview and album */}
          <div className={styles.displaySide}>
            <div className={styles.previewZone}>
              {selectedDoll ? (
                <div className={styles.bigFocus}>
                  <div className={styles.imageContainer}>
                    <img src={selectedDoll.imageUrl} className={selectedDoll.blur ? styles.blurred : ''} alt={selectedDoll.name} />
                    {!selectedDoll.blur && (
                      <button className={styles.downloadIcon} onClick={() => downloadDoll(selectedDoll.imageUrl, selectedDoll.name)}>
                        📥 Download
                      </button>
                    )}
                  </div>
                  <h3>{selectedDoll.name}</h3>
                </div>
              ) : (
                <p>Select a doll from the album or create a new one</p>
              )}
            </div>
            <div className={styles.albumContainer}>
              <h4>My Collection</h4>
              <div className={styles.dollGrid}>
                {shopState.generatedDolls.map((doll) => (
                  <div
                    key={doll.id}
                    className={styles.dollCard}
                    onClick={() => setSelectedDoll(doll)}
                  >
                    <img src={doll.imageUrl} alt={doll.name} />
                    <span>{doll.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Control side: privacy toggles and input */}
          <div className={styles.controlSide}>
            <div className={styles.privacyGrid}>
              <PrivacyItem label="Full Name" value="[Your Name]" isPrivate={!privacySettings.isNamePublic} onToggle={() => handleToggle('isNamePublic')} />
              <PrivacyItem label="Age" value="[Your Age]" isPrivate={!privacySettings.isAgePublic} onToggle={() => handleToggle('isAgePublic')} />
              <PrivacyItem label="School" value="[Your School]" isPrivate={!privacySettings.isSchoolPublic} onToggle={() => handleToggle('isSchoolPublic')} />
              <PrivacyItem label="Phone Number" value="[Hidden]" isPrivate={!privacySettings.isPhonePublic} onToggle={() => handleToggle('isPhonePublic')} />
              <PrivacyItem label="Home Address" value="[Hidden]" isPrivate={!privacySettings.isAddressPublic} onToggle={() => handleToggle('isAddressPublic')} />
              <PrivacyItem label="Profile Photo" value="[Image]" isPrivate={!privacySettings.isPhotoPublic} onToggle={() => handleToggle('isPhotoPublic')} />
              <PrivacyItem label="Location (GPS)" value="[Hidden]" isPrivate={!privacySettings.isLocationPublic} onToggle={() => handleToggle('isLocationPublic')} />
            </div>
            <div className={styles.inputArea}>
              <textarea
                className={styles.dollInput}
                value={dollDescription}
                onChange={e => setDollDescription(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
                placeholder="Describe your dream doll..."
                rows="3"
              />
              <button
                className={styles.generateBtn}
                onClick={handleGenerateDoll}
                disabled={isLoading}
              >
                {isLoading ? 'MANUFACTURING...' : 'GENERATE NEW ENTITY'}
              </button>
              {message && <div className={`${styles.message} ${styles[messageKind]}`}>{message}</div>}
            </div>
          </div>
        </div>
      </div>
    );
};

const PrivacyItem = ({ label, value, isPrivate, onToggle }) => (
  <div className={`${styles.privacyItem} ${isPrivate ? styles.private : styles.public}`}>
    <span>{label}: <strong>{value}</strong></span>
    <button onClick={onToggle}>
      {isPrivate ? '🔒 Private' : '🌍 Public'}
    </button>
  </div>
);

export default PrivacyRoom;
