
import React, { useState } from 'react';
import GameShell from './game/GameShell.jsx';
import Login from './pages/Login.jsx';
import styles from '../src/styles/modules/App.module.css';

function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowLogin(false);
  };

  return (
    <>
      {/* User profile top right */}
      {user && (
        <div className={styles.userProfile}>
          <span className={styles.greeting}>Hi, {user.name}!</span>
          <img src={user.picture} alt={user.name} className={styles.userAvatar} />
        </div>
      )}
      {showLogin || !user ? (
        <Login onClose={() => {}} onLoginSuccess={handleLoginSuccess} />
      ) : (
        <GameShell user={user} />
      )}
    </>
  );
}

export default App;


