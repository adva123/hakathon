import React, { useEffect } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export default function MiniRobotPreview({ color, type }) {
  const { scene } = useGLTF('/models/RobotExpressive.glb');

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material.color.set(color);
        if (type === 'luxury') {
          child.material.metalness = 1.0;
          child.material.roughness = 0.1;
        } else {
          child.material.metalness = 0.2;
          child.material.roughness = 0.7;
        }
      }
    });
  }, [scene, color, type]);

  useFrame((state) => {
    scene.rotation.y = state.clock.getElapsedTime() * 0.5;
  });

  return (
    <Center>
      <primitive 
        object={scene} 
        scale={1.2} 
        rotation={[0, Math.PI / 8, 0]} 
      />
    </Center>
  );
}

// export default MiniRobotPreview;