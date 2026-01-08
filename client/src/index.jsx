import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css'; 
import { GoogleOAuthProvider } from '@react-oauth/google';
import {GameProvider} from '../src/context/GameContext';
import App from './App';

// הכניסי את המפתח שלך בקובץ .env בתיקיית client כך:
// VITE_GOOGLE_CLIENT_ID=YOUR_NEW_CLIENT_ID_HERE.apps.googleusercontent.com

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GameProvider>
        <App />
      </GameProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);