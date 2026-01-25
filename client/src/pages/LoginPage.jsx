import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../context/GameContext';
import Login from './Login';
import Navbar from '../components/layout/Navbar';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { userId } = useContext(GameContext);
  const navigate = useNavigate();

  // If user is already logged in, redirect to game
  useEffect(() => {
    if (userId) {
      navigate('/game');
    }
  }, [userId, navigate]);

  return (
    <div className={styles.loginPage}>
      <Navbar />
      <div className={styles.loginContent}>
        <Login />
      </div>
    </div>
  );
}
