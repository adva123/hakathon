import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/global.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GameProvider } from './context/GameContext';
import { ThemeProvider } from './context/ThemeContext';
import HomePage from './pages/HomePage';
import App from './App';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const root = ReactDOM.createRoot(document.getElementById('root'));

const AppRouter = () => (
  <BrowserRouter>
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/game"
          element={
            GOOGLE_CLIENT_ID ? (
              <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <GameProvider>
                  <App />
                </GameProvider>
              </GoogleOAuthProvider>
            ) : (
              <GameProvider>
                <App />
              </GameProvider>
            )
          }
        />
      </Routes>
    </ThemeProvider>
  </BrowserRouter>
);

root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);