import { useState, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";

// --- רכיב אריח (Tile) ---
function PasswordTile({ id, text, position, type, isCollected }) {
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current || isCollected || !position) return;
    
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = position[1] + Math.sin(t * 2 + position[0]) * 0.2;
    groupRef.current.rotation.y += 0.01;
  });

  const color = type === "bad" ? "#ff4d4d" : "#4dff88";

  return (
    <group ref={groupRef} position={position} visible={!isCollected}>
      <Text
        fontSize={0.8}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {text}
      </Text>
      <mesh>
        <planeGeometry args={[2.2, 1.2]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// --- המשימה הראשית ---
export default function Mission1({ robotRef, onExit }) {
  const [tiles, setTiles] = useState([
    { id: 1, text: "1234", type: "bad", score: -25, pos: [-6, 1, 6], collected: false },
    { id: 2, text: "admin", type: "bad", score: -20, pos: [6, 1, -6], collected: false },
    { id: 3, text: "cool", type: "bad", score: -10, pos: [0, 1, 10], collected: false },
    
    { id: 4, text: "Tr", type: "good", score: 20, pos: [-8, 1, -8], collected: false },
    { id: 5, text: "7!", type: "good", score: 25, pos: [8, 1, 8], collected: false },
    { id: 6, text: "X#", type: "good", score: 25, pos: [-10, 1, 0], collected: false },
    { id: 7, text: "m9", type: "good", score: 20, pos: [10, 1, 0], collected: false },
    { id: 8, text: "B$", type: "good", score: 20, pos: [0, 1, -10], collected: false },
    { id: 9, text: "La", type: "good", score: 15, pos: [4, 1, 4], collected: false },
  ]);

  const [collectedItems, setCollectedItems] = useState([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const strength = useMemo(() => {
    let score = 0;
    collectedItems.forEach(item => score += item.score);
    return Math.max(0, Math.min(100, score));
  }, [collectedItems]);

  // שיפור ביצועים: בודק רק אריחים קרובים (radius 8)
  useFrame(() => {
    if (!robotRef?.current || isSuccess) return;
    const robotPos = robotRef.current.position;
    const threshold = 2.5;
    // בחר רק אריחים קרובים לבדיקה
    const closeTiles = tiles.filter(tile => !tile.collected &&
      Math.abs(tile.pos[0] - robotPos.x) < 8 && Math.abs(tile.pos[2] - robotPos.z) < 8);
    for (let tile of closeTiles) {
      const tilePos = new THREE.Vector3(tile.pos[0], tile.pos[1], tile.pos[2]);
      if (robotPos.distanceTo(tilePos) < threshold) {
        collectTile(tile);
        break; // רק אחד לפריים
      }
    }
  });

  const collectTile = (tile) => {
    setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, collected: true } : t));
    setCollectedItems(prev => [...prev, tile]);
    
    if (strength + tile.score >= 100) {
      setTimeout(() => setIsSuccess(true), 500);
    }
  };

  const removeTile = (tileId) => {
    if (isSuccess) return;
    const itemToRemove = collectedItems.find(i => i.id === tileId);
    if (!itemToRemove) return;

    setCollectedItems(prev => prev.filter(i => i.id !== tileId));
    setTiles(prev => prev.map(t => t.id === tileId ? { ...t, collected: false } : t));
  };

  
  // המלצה: להוסיף dpr={1} ל-<Canvas /> בקומפוננטת האב להפחתת עומס גרפי
  // <Canvas dpr={1} ...>
  return (
    <group>
      
      
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -1.14, 0]}>
         <planeGeometry args={[40, 40]} />
         <meshBasicMaterial color="#1a2d2eff" transparent opacity={0.5} />
      </mesh>

      {tiles.map((tile) => (
        <PasswordTile
          key={tile.id}
          {...tile}
          position={tile.pos}
          isCollected={tile.collected}
        />
      ))}

      {/* --- ממשק משתמש (HUD) מעודכן --- */}
      <Html fullscreen style={{ pointerEvents: 'none' }}> 
        <div style={{
          position: 'absolute',
          top: '10px',           
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',       
          maxWidth: '90%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none'
        }}>
          
          <div style={{
            background: "rgba(0, 10, 20, 0.95)",
            padding: "15px",    
            borderRadius: "12px",
            border: `2px solid ${isSuccess ? "#4dff88" : "#28f0e6ff"}`,
            color: "white",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "8px",         
            boxShadow: "0 5px 20px rgba(0,0,0,0.5)",
            pointerEvents: "auto"
          }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#28f0e6", fontSize: "13px", textTransform: "uppercase" }}>Password Strength</h3>
              <span style={{ fontWeight: "bold", fontSize: "14px", color: strength < 50 ? "#ff4d4d" : strength < 100 ? "#ffcc00" : "#4dff88" }}>
                {strength}%
              </span>
            </div>

            <div style={{ width: "100%", height: "8px", background: "#333", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{
                width: `${strength}%`,
                height: "100%",
                background: strength < 40 ? "#ff4d4d" : strength < 80 ? "#ffcc00" : "#4dff88",
                transition: "width 0.5s ease, background 0.5s ease"
              }} />
            </div>

            <div style={{ 
              background: "rgba(255,255,255,0.05)",
              padding: "8px",
              borderRadius: "6px",
              minHeight: "40px", 
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              justifyContent: "center",
              alignItems: "center"
            }}>
              {collectedItems.length === 0 && <span style={{color: "#666", fontSize: "11px"}}>Collect tiles...</span>}
              
              {collectedItems.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => removeTile(item.id)}
                  style={{
                    background: item.type === "bad" ? "#ff4d4d33" : "#4dff8833",
                    border: `1px solid ${item.type === "bad" ? "#ff4d4d" : "#4dff88"}`,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "12px", 
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    userSelect: "none"
                  }}
                  title="Click to remove"
                >
                  {item.text}
                  <span style={{ fontSize: "9px", opacity: 0.7 }}>✕</span>
                </div>
              ))}
            </div>
            
            <div style={{ fontSize: "11px", color: "#aaa" }}>
              {isSuccess ? "Secured!" : "Avoid bad words. Click to remove."}
            </div>
            
            {isSuccess && (
              <button 
                style={{
                  marginTop: "4px",
                  padding: "8px",
                  background: "#4dff88",
                  color: "#000",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  fontSize: "12px",
                  cursor: "pointer",
                  animation: "pulse 1.5s infinite"
                }}
                onClick={onExit}
              >
                COMPLETE
              </button>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}