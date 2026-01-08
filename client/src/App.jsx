
import React, { useState } from 'react';
import GameShell from './game/GameShell.jsx';
import Login from './Login.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowLogin(false);
  };

  return (
    <>
      {showLogin || !user ? (
        <Login onClose={() => {}} onLoginSuccess={handleLoginSuccess} />
      ) : (
        <GameShell user={user} />
      )}
    </>
  );
}

export default App;


