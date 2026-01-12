import React, { useRef, useEffect } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

const MiniRobotPreview = ({ color = "#ffffff", type = "basic" }) => {
  const groupRef = useRef();
  
  const { scene } = useGLTF('/models/RobotExpressive.glb');

  // ✅ עדכון צבעים כל פעם שה-color או type משתנים
  useEffect(() => {
    if (!scene) return;

    const isLuxury = type === 'luxury' || type === 'SPECIAL' || type === 'LUXURY';

    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        const isBody = child.name && child.name.toLowerCase().includes('body');
        
        // עדכון צבע
        child.material.color.set(isBody ? color : '#222222');
        
        // עדכון תכונות מטריאל
        const fullSolidTypes = ['neon red', 'lime strike', 'night black'];
        const isFullSolid = fullSolidTypes.includes(type?.toLowerCase());
        if (isBody && isFullSolid) {
          child.material.emissive = child.material.color;
          child.material.emissiveIntensity = 1;
          child.material.metalness = 0;
          child.material.roughness = 0;
        } else {
          child.material.metalness = isLuxury ? 0.9 : 0.2;
          child.material.roughness = isLuxury ? 0.1 : 0.7;
        }
        
        // ✅ חשוב! אמור ל-Three.js לעדכן את המטריאל
        child.material.needsUpdate = true;
      }
    });
  }, [scene, color, type]);

  // אנימציה
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.5;
    }
  });

  if (!scene) return null;

  return (
    <Center>
      <group ref={groupRef} scale={1.2}>
        <primitive object={scene} />
      </group>
    </Center>
  );
};

useGLTF.preload('/models/RobotExpressive.glb');

export default MiniRobotPreview;