import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css'; 
import App from './App.jsx';
import { DuckProvider } from './context/DuckContext';
import { GameProvider } from './context/GameContext.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DuckProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </DuckProvider>
  </React.StrictMode>
);