/* eslint-disable react/no-unknown-property */
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import PropTypes from 'prop-types';

// Underground bunker-style Password Room with industrial tech aesthetic
export function PasswordRoom3D({ position = [0, 0, 0], visible = false, gestureRef }) {
  const groupRef = useRef();
  const neonLightsRef = useRef([]);
  const lastGesture = useRef('none');

  useFrame(({ clock }) => {
    if (!visible || !groupRef.current) return;

    const time = clock.getElapsedTime();

    // Pulse neon lights
    neonLightsRef.current.forEach((light, i) => {
      if (light) {
        light.intensity = 1.2 + Math.sin(time * 2 + i * 0.5) * 0.3;
      }
    });

    // Handle gestures
    const gesture = gestureRef?.current?.gesture || 'none';
    if (gesture !== lastGesture.current) {
      // TODO: Implement actual gesture actions here
      // For now, just log the gesture change
      // You can replace this with actual movement/interaction logic
      // Example: if (gesture === 'moveForward') { ... }
      // eslint-disable-next-line no-console
      console.log('[PasswordRoom3D] Gesture changed:', gesture);
      lastGesture.current = gesture;
    }
  });

  const wallMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2a2a2a',
    metalness: 0.8,
    roughness: 0.3,
  }), []);

  const floorMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a1a',
    metalness: 0.9,
    roughness: 0.2,
  }), []);

  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#00d4ff',
    metalness: 0.1,
    roughness: 0.1,
    transparent: true,
    opacity: 0.3,
    transmission: 0.9,
  }), []);

  const panelMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0a0a0a',
    metalness: 0.5,
    roughness: 0.5,
    emissive: '#00f2ff',
    emissiveIntensity: 0.2,
  }), []);

  if (!visible) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Floor - industrial metal */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <primitive object={floorMaterial} />
      </mesh>

      {/* Back Wall - metal with panels */}
      <mesh position={[0, 2, -4]} receiveShadow>
        <boxGeometry args={[8, 4, 0.3]} />
        <primitive object={wallMaterial} />
      </mesh>

      {/* Left Wall - partially glass */}
      <group position={[-4, 2, 0]}>
        <mesh position={[0, 0, 1]} receiveShadow>
          <boxGeometry args={[0.3, 4, 4]} />
          <primitive object={wallMaterial} />
        </mesh>
        <mesh position={[0, 0, -1]} receiveShadow>
          <boxGeometry args={[0.3, 4, 4]} />
          <primitive object={glassMaterial} />
        </mesh>
      </group>

      {/* Right Wall - partially glass */}
      <group position={[4, 2, 0]}>
        <mesh position={[0, 0, 1]} receiveShadow>
          <boxGeometry args={[0.3, 4, 4]} />
          <primitive object={wallMaterial} />
        </mesh>
        <mesh position={[0, 0, -1]} receiveShadow>
          <boxGeometry args={[0.3, 4, 4]} />
          <primitive object={glassMaterial} />
        </mesh>
      </group>

      {/* Ceiling - tech panels */}
      <mesh position={[0, 4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <primitive object={wallMaterial} />
      </mesh>

      {/* Central Digital Panel - where password displays */}
      <mesh position={[0, 2.2, -3.8]} castShadow>
        <boxGeometry args={[4, 2.5, 0.15]} />
        <primitive object={panelMaterial} />
      </mesh>

      {/* Panel frame - glowing edges */}
      <mesh position={[0, 2.2, -3.7]}>
        <boxGeometry args={[4.2, 2.7, 0.05]} />
        <meshBasicMaterial color="#00f2ff" transparent opacity={0.6} />
      </mesh>

      {/* Neon strip lights - cyan */}
      <group>
        <mesh position={[-3.5, 3.8, 0]}>
          <boxGeometry args={[0.1, 0.1, 7]} />
          <meshBasicMaterial color="#00f2ff" />
        </mesh>
        <pointLight
          ref={(el) => { neonLightsRef.current[0] = el; }}
          position={[-3.5, 3.8, 0]}
          color="#00f2ff"
          intensity={1.2}
          distance={6}
        />

        <mesh position={[3.5, 3.8, 0]}>
          <boxGeometry args={[0.1, 0.1, 7]} />
          <meshBasicMaterial color="#7000ff" />
        </mesh>
        <pointLight
          ref={(el) => { neonLightsRef.current[1] = el; }}
          position={[3.5, 3.8, 0]}
          color="#7000ff"
          intensity={1.2}
          distance={6}
        />
      </group>

      {/* Floor strip lights - purple */}
      <group>
        <mesh position={[-3.5, 0.05, 0]}>
          <boxGeometry args={[0.15, 0.05, 7]} />
          <meshBasicMaterial color="#a000ff" />
        </mesh>
        <pointLight
          ref={(el) => { neonLightsRef.current[2] = el; }}
          position={[-3.5, 0.2, 0]}
          color="#a000ff"
          intensity={0.8}
          distance={4}
        />

        <mesh position={[3.5, 0.05, 0]}>
          <boxGeometry args={[0.15, 0.05, 7]} />
          <meshBasicMaterial color="#a000ff" />
        </mesh>
        <pointLight
          ref={(el) => { neonLightsRef.current[3] = el; }}
          position={[3.5, 0.2, 0]}
          color="#a000ff"
          intensity={0.8}
          distance={4}
        />
      </group>

      {/* Control consoles on sides */}
      <group position={[-3, 0.8, -2]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 1.2, 0.8]} />
          <primitive object={panelMaterial} />
        </mesh>
        <pointLight position={[0, 0.7, 0.5]} color="#00ff88" intensity={0.5} distance={2} />
      </group>

      <group position={[3, 0.8, -2]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 1.2, 0.8]} />
          <primitive object={panelMaterial} />
        </mesh>
        <pointLight position={[0, 0.7, 0.5]} color="#00ff88" intensity={0.5} distance={2} />
      </group>

      {/* Ambient room lighting - cold blue */}
      <ambientLight intensity={0.3} color="#a0c4ff" />
      <pointLight position={[0, 3.5, 0]} color="#ffffff" intensity={0.8} distance={10} castShadow />
    </group>
  );
}

PasswordRoom3D.propTypes = {
  position: PropTypes.arrayOf(PropTypes.number),
  visible: PropTypes.bool,
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
};
