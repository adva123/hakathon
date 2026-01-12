import React, { useContext, useEffect, useState } from 'react';
import GameShell from './game/GameShell.jsx';
import { GameContext } from './context/GameContext';
import Login from './pages/Login.jsx';
import styles from '../src/styles/modules/App.module.css';

function App() {
  const { handleLogin, userId, score, coins, energy, playerName } = useContext(GameContext);
  const [showLogin, setShowLogin] = useState(false);
  const [userPicture, setUserPicture] = useState('');

  // ✅ בדוק אם יש משתמש מחובר בעת הטעינה
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
            
            // שמור תמונה אם יש
            const storedPicture = localStorage.getItem('userPicture');
            if (storedPicture) {
              setUserPicture(storedPicture);
            }
          } else {
            // אם המשתמש לא נמצא, הצג התחברות
            setShowLogin(true);
            localStorage.removeItem('userId');
          }
        } catch (error) {
          console.error('❌ Failed to restore user:', error);
          setShowLogin(true);
          localStorage.removeItem('userId');
        }
      } else {
        // אין משתמש שמור - הצג התחברות
        setShowLogin(true);
      }
    };
    
    checkLoggedInUser();
  }, [handleLogin]);

  // ✅ שמור userId כשהוא משתנה
  useEffect(() => {
    if (userId) {
      localStorage.setItem('userId', userId);
      console.log('💾 User ID saved to localStorage:', userId);
    }
  }, [userId]);

  // ✅ פונקציה שמטפלת בהתחברות מוצלחת
  const handleLoginSuccess = (userData, googlePicture = '') => {
    console.log('🎉 Login successful in App:', userData);
    
    // שמור את התמונה מגוגל
    if (googlePicture) {
      setUserPicture(googlePicture);
      localStorage.setItem('userPicture', googlePicture);
    }
    
    // עדכן את ה-Context
    handleLogin(userData);
    
    // סגור את מסך ההתחברות
    setShowLogin(false);
  };

  // ✅ פונקציית התנתקות
  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userPicture');
    setUserPicture('');
    setShowLogin(true);
    window.location.reload(); // רענן את הדף
  };

  return (
    <>
      {/* User profile top right */}
      {userId && !showLogin && (
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

      {/* הצג התחברות או משחק */}
      {showLogin || !userId ? (
        <Login 
          onClose={() => setShowLogin(false)} 
          onLoginSuccess={handleLoginSuccess} 
        />
      ) : (
        <GameShell userId={userId} />
      )}
    </>
  );
}

export default App;