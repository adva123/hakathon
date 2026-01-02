/* eslint-disable react/no-unknown-property */
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Robot from "./Robot";
import * as THREE from "three";
import { useRef, useEffect } from "react";
import { useKeyboard } from "./useKeyboard";
import PasswordLevel from "./PasswordLevel";


// תנועת הרובוט
function MovingRobot({ robotRef }) {
  const keys = useKeyboard();
  const velocity = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!robotRef.current) return;

    const moveSpeed = 3.5;
    const direction = new THREE.Vector3();

    if (keys.current.KeyW || keys.current.ArrowUp) direction.z -= 1;
    if (keys.current.KeyS || keys.current.ArrowDown) direction.z += 1;
    if (keys.current.KeyA || keys.current.ArrowLeft) direction.x -= 1;
    if (keys.current.KeyD || keys.current.ArrowRight) direction.x += 1;

    direction.normalize();

    if (direction.length() > 0) {
      if (robotRef.current.userData.setAction) {
        robotRef.current.userData.setAction("Walking");
      }

      velocity.current.copy(direction).multiplyScalar(moveSpeed * delta);
      robotRef.current.position.add(velocity.current);

      const angle = Math.atan2(direction.x, direction.z);
      robotRef.current.rotation.y = angle;
    } else {
      if (robotRef.current.userData.setAction) {
        robotRef.current.userData.setAction("Idle");
      }
    }
  });

  return <Robot ref={robotRef} scale={1} position={[0, -1.15, 0]} />;
}

// מצלמה שעוקבת אחרי הרובוט
function FollowCamera({ targetRef }) {
  useFrame(({ camera }) => {
    if (!targetRef.current) return;

    const targetPos = targetRef.current.position;

    // מיקום יחסי של המצלמה מאחורי הרובוט
    const offset = new THREE.Vector3(0, 3, 8);
    const desiredPos = targetPos.clone().add(offset);

    // תנועה רכה למיקום הרצוי
    camera.position.lerp(desiredPos, 0.05);
    camera.lookAt(targetPos.x, targetPos.y + 1.5, targetPos.z);
  });

  return null;
}

export default function ThreeDemo() {
  const robotRef = useRef();

  // ביטול גלילת חיצים
  useEffect(() => {
    const preventArrowScroll = (e) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", preventArrowScroll);
    return () => window.removeEventListener("keydown", preventArrowScroll);
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Canvas
        camera={{ position: [0, 2.6, 14], fov: 60, near: 0.1, far: 400 }}
        shadows
        gl={{ antialias: true }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color("#ffffff");
          scene.fog = new THREE.Fog("#e0eefe", 10, 90);
        }}
      >
        {/* קירות */}
        <mesh position={[0, 5, 0]}>
          <boxGeometry args={[100, 40, 100]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.95}
            metalness={0}
            side={THREE.BackSide}
          />
        </mesh>

        {/* תאורה */}
        <hemisphereLight
          intensity={1.1}
          skyColor="#ffffff"
          groundColor="#E4EBF7"
        />
        <directionalLight
          position={[6, 10, 8]}
          intensity={0.55}
          color="#ffffff"
          castShadow
        />
        <directionalLight
          position={[-8, 6, -6]}
          intensity={0.35}
          color="#ffffff"
        />

        {/* רצפה */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1.15, 0]}
          receiveShadow
        >
          <planeGeometry args={[150, 150]} />
          <meshStandardMaterial
            color="#9db5e3"
            roughness={0.9}
            metalness={0}
          />
        </mesh>

        {/* הרובוט + מצלמה עוקבת */}
        <MovingRobot robotRef={robotRef} />
        <PasswordLevel robotRef={robotRef} />
        <FollowCamera targetRef={robotRef} />


        {/* ביטול שליטה עם העכבר */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}  // ❌ זה העיקרי: מבטל סיבוב עם העכבר
          enableKeys={false}
        />
      </Canvas>
    </div>
  );
}
