/* eslint-disable react/no-unknown-property */
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Robot from "./Robot";
import { useKeyboard } from "./useKeyboard";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}


function Scene() {
  const keys = useKeyboard();

  // --------- ROOM SIZE (תואם למה שכבר היה לך) ----------
  const ROOM_W = 50;
  const ROOM_D = 50;
  const WALL_PADDING = 2.5;


  const minX = -ROOM_W / 2 + WALL_PADDING;
  const maxX = ROOM_W / 2 - WALL_PADDING;
  const minZ = -ROOM_D / 2 + WALL_PADDING;
  const maxZ = ROOM_D / 2 - WALL_PADDING;

  // ====== VISUAL BOUNDARIES (קירות שקופים) ======
  const WALL_VIS_H = 200; // ממש גבוה כדי שלא תראי את הקצה
  const wallMat = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.18,        // כמה שקוף (תשחקי 0.1–0.3)
    depthWrite: false,    // שלא “יחנוק” דברים מאחור
  });


  // --------- refs ----------
  const robotRef = useRef();
  const controlsRef = useRef();

  // מיקום הרובוט נשמר ברפרנס (יותר חלק ל-60fps)
  const pos = useRef(new THREE.Vector3(0, -1.15, 0));

  // כיוון שהרובוט מסתכל אליו (סיבוב Y)
  const yaw = useRef(0);

  // הגדרות תנועה
  const SPEED = 7; // מהירות הליכה
  const ROTATE_SMOOTH = 0.18; // ריכוך לסיבוב
  const MOVE_SMOOTH = 1.0; // תנועה עצמה כבר חלקה כי זה useFrame

  // הגדרות מצלמה עוקבת
  const CAM_HEIGHT = 3.1;     // קצת יותר גבוה
  const CAM_DISTANCE = 14.0;  // יותר רחוק = יותר זום אאוט
  const CAM_SIDE = 3.2;       // זה נותן את ה"זווית" מהצד (over-shoulder)
  const CAM_LERP = 0.07;      // מעקב חלק יותר (לא "נדבק")


  // offset מאחורי הרובוט (יחושב לפי yaw)
  const camTargetPos = useRef(new THREE.Vector3());
  const camLookAt = useRef(new THREE.Vector3());

  useFrame(({ camera }, delta) => {
    // ------------- INPUT -------------
    const k = keys.current;
    // 1) סיבוב במקום
    let turn = 0;
    if (k.ArrowLeft || k.KeyA) turn += 1;
    if (k.ArrowRight || k.KeyD) turn -= 1;

    // 2) תנועה קדימה ואחורה     
    let forward = 0;
    if (k.ArrowUp || k.KeyW) forward = 1;
    if (k.ArrowDown || k.KeyS) forward = -1;

    // 3) עדכון yaw (סיבוב) — מהירות סיבוב
    const TURN_SPEED = 2.2; // רדיאנים לשנייה (אפשר לשחק)
    yaw.current += turn * TURN_SPEED * delta;

    // 4) תנועה קדימה לפי yaw
    const moving = forward !== 0;
    if (moving) {
      const vx = Math.sin(yaw.current) * forward;
      const vz = Math.cos(yaw.current) * forward;

      const nextX = pos.current.x + vx * SPEED * delta;
      const nextZ = pos.current.z + vz * SPEED * delta;

      pos.current.x = clamp(nextX, minX, maxX);
      pos.current.z = clamp(nextZ, minZ, maxZ);

      if (robotRef.current?.userData?.setAction) {
        robotRef.current.userData.setAction("Walk");
      }
    } else {
      if (robotRef.current?.userData?.setAction) {
        robotRef.current.userData.setAction("Idle");
      }
    }

    // ------------- APPLY TO ROBOT -------------
    if (robotRef.current) {
      robotRef.current.position.set(pos.current.x, pos.current.y, pos.current.z);
      robotRef.current.rotation.y = yaw.current;
    }

    // ------------- FOLLOW CAMERA (כמו בסרטון) -------------
    // נקודת הסתכלות: קצת מעל מרכז הרובוט
    camLookAt.current.set(pos.current.x, 1.6, pos.current.z);

    // וקטור "מאחורי" הרובוט
    const backX = Math.sin(yaw.current) * CAM_DISTANCE;
    const backZ = Math.cos(yaw.current) * CAM_DISTANCE;

    // וקטור "ימינה" מהרובוט (לזווית צד)
    const rightX = Math.sin(yaw.current + Math.PI / 2) * CAM_SIDE;
    const rightZ = Math.cos(yaw.current + Math.PI / 2) * CAM_SIDE;

    // מצלמה: מאחורה + קצת לצד (over-shoulder)
    camTargetPos.current.set(
      pos.current.x - backX + rightX,
      CAM_HEIGHT,
      pos.current.z - backZ + rightZ
    );


    // smooth camera move
    // --- clamp camera so it never goes outside the room ---
    const CAM_PADDING = 2.5;  
    camTargetPos.current.x = clamp(camTargetPos.current.x, -ROOM_W / 2 + CAM_PADDING, ROOM_W / 2 - CAM_PADDING);
    camTargetPos.current.z = clamp(camTargetPos.current.z, -ROOM_D / 2 + CAM_PADDING, ROOM_D / 2 - CAM_PADDING);

    camera.position.lerp(camTargetPos.current, CAM_LERP);
    camera.lookAt(camLookAt.current);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(camLookAt.current, 0.2);
      controlsRef.current.update();
    }
  });

  return (
    <>
      

      {/* תאורה  */}
      <hemisphereLight intensity={1.2} skyColor="#ffffff" groundColor="#e1e6f0" />
      <directionalLight position={[6, 10, 8]} intensity={0.5} color="#f0f4ff" cast/>
      <directionalLight position={[-8, 6, -6]} intensity={0.35} color="#dde7ff" />
      
      {/* ====== VISUAL BOUNDARIES (4 קירות שקופים) ====== */}
      {(() => {
        const WALL_VIS_H = 200;         // גובה
        const yCenter = -1.15 + WALL_VIS_H / 2;
        const W = ROOM_W;
        const D = ROOM_D;

        const wallMat = new THREE.MeshBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
          side: THREE.DoubleSide,
        });

        // גבול החדר עצמו (לא גבול התנועה)
        const leftX = -W / 2;
        const rightX = W / 2;
        const backZ = -D / 2;
        const frontZ = D / 2;

        return (
          <>
            {/* שמאל */}
            <mesh position={[leftX, yCenter, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[D, WALL_VIS_H]} />
              <primitive object={wallMat} attach="material" />
            </mesh>

            {/* ימין */}
            <mesh position={[rightX, yCenter, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[D, WALL_VIS_H]} />
              <primitive object={wallMat} attach="material" />
            </mesh>

            {/* אחורה */}
            <mesh position={[0, yCenter, backZ]} rotation={[0, 0, 0]}>
              <planeGeometry args={[W, WALL_VIS_H]} />
              <primitive object={wallMat} attach="material" />
            </mesh>

            {/* קדימה */}
            <mesh position={[0, yCenter, frontZ]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[W, WALL_VIS_H]} />
              <primitive object={wallMat} attach="material" />
            </mesh>
          </>
        );
      })()}



      {/* עיצוב רצפה*/}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial 
          roughness={0.9} 
          metalness={0}
        >
          <primitive 
            attach="map" 
            object={(() => {
              const canvas = document.createElement('canvas');
              canvas.width = 512;
              canvas.height = 512;
              const ctx = canvas.getContext('2d');
              
              // רקע כחול בהיר
              ctx.fillStyle = '#c5d0e8';
              ctx.fillRect(0, 0, 512, 512);
              
              // ריבועים
              const tileSize = 256;
              for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 8; y++) {
                  // ריבוע עם גבול
                  ctx.fillStyle = '#939eb4';
                  ctx.fillRect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, tileSize - 2);
                  
                  // צל קל בפינה התחתונה
                  const gradient = ctx.createLinearGradient(
                    x * tileSize, y * tileSize,
                    (x + 1) * tileSize, (y + 1) * tileSize
                  );
                  gradient.addColorStop(0, 'rgba(0,0,0,0)');
                  gradient.addColorStop(1, 'rgba(0,0,0,0.08)');
                  ctx.fillStyle = gradient;
                  ctx.fillRect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, tileSize - 2);
                }
              }
              
              // קווי הפרדה
              ctx.strokeStyle = '#a0b0c8';
              ctx.lineWidth = 2;
              for (let i = 0; i <= 8; i++) {
                ctx.beginPath();
                ctx.moveTo(i * tileSize, 0);
                ctx.lineTo(i * tileSize, 512);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(0, i * tileSize);
                ctx.lineTo(512, i * tileSize);
                ctx.stroke();
              }
              
              const texture = new THREE.CanvasTexture(canvas);
              texture.wrapS = THREE.RepeatWrapping;
              texture.wrapT = THREE.RepeatWrapping;
              texture.repeat.set(20, 20);
              return texture;
            })()}
          />
        </meshStandardMaterial>
      </mesh>

      {/* רובוט - עם ref כדי שנוכל להזיז אותו */}
      <Robot ref={robotRef} scale={1.25} position={[0, -1.15, 0]} />

      {/* OrbitControls רק כדי לנעול את הזווית/לא לצאת מהרצפה.
          חשוב: לבטל enableKeys כדי שהחצים לא ישלטו במצלמה! */}
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={false}
        enableRotate={false}   // <<< כי אנחנו שולטים במצלמה לבד
        enableKeys={false}     // <<< קריטי! החצים לא יזיזו מצלמה
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
      />
    </>
  );
}

export default function ThreeDemo() {
  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Canvas
        camera={{ position: [0, 2.6, 14], fov: 60, near: 0.1, far: 500 }}
        shadows
        gl={{ antialias: true }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color("#ffffff");
          scene.fog = new THREE.Fog("#e3e4f2", 25, 80);

        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
