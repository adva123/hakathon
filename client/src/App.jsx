import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameShell from './game/GameShell.jsx';
import { GameContext } from './context/GameContext';
import Navbar from './components/layout/Navbar.jsx';
import styles from '../src/styles/modules/App.module.css';
import { useSound } from './hooks/useSound.js';

function App() {
  const { handleLogin, userId, score, coins, energy, playerName } = useContext(GameContext);
  const [userPicture, setUserPicture] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { playCoins } = useSound();
  const navigate = useNavigate();

  useEffect(() => {
    const checkLoggedInUser = async () => {
      const storedUserId = localStorage.getItem('userId');

      if (storedUserId) {
        try {
          const response = await fetch(`http://localhost:5000/api/users/${storedUserId}`);
          const data = await response.json();

          if (data.success) {
            console.log('✅ User restored from storage:', data.user);
            handleLogin(data.user);

            const storedPicture = localStorage.getItem('userPicture');
            if (storedPicture) {
              setUserPicture(storedPicture);
            }
            setIsLoading(false);
          } else {
            localStorage.removeItem('userId');
            setIsLoading(false);
            navigate('/login');
          }
        } catch (error) {
          console.error('❌ Failed to restore user:', error);
          localStorage.removeItem('userId');
          setIsLoading(false);
          navigate('/login');
        }
      } else {
        setIsLoading(false);
        navigate('/login');
      }
    };

    checkLoggedInUser();
  }, [handleLogin, navigate]);

  useEffect(() => {
    if (userId) {
      localStorage.setItem('userId', userId);
      console.log('💾 User ID saved to localStorage:', userId);
    }
  }, [userId]);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userPicture');
    setUserPicture('');
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.appWrap}>
      <Navbar />

      {userId && (
        <div className={styles.userProfile}>
          <span className={styles.greeting}>Hi, {playerName || 'Player'}!</span>
          {userPicture && (
            <img src={userPicture} alt={playerName} className={styles.userAvatar} />
          )}
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>
      )}

      {userId && <GameShell userId={userId} />}
    </div>
  );
}

export default App;