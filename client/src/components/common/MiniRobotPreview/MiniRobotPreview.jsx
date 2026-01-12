
import React, { useMemo } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';


export default function MiniRobotPreview({ color, type }) {
  const { nodes, materials, scene } = useGLTF('/models/RobotExpressive.glb');

  // Animate rotation
  useFrame((state) => {
    scene.rotation.y = state.clock.getElapsedTime() * 0.5;
  });

  // Memoize mesh list for performance
  const meshes = useMemo(() => {
    const found = [];
    scene.traverse((child) => {
      if (child.isMesh) {
        found.push(child);
      }
    });
    return found;
  }, [scene]);

  // Selective coloring logic
  const getMaterialProps = (mesh) => {
    // If mesh name includes 'body', apply user color, else use dark color for outlines/details
    const isBody = mesh.name && mesh.name.toLowerCase().includes('body');
    const baseProps = type === 'luxury'
      ? { metalness: 1.0, roughness: 0.1 }
      : { metalness: 0.2, roughness: 0.7 };
    return {
      color: isBody ? color : '#222',
      ...baseProps,
    };
  };

  return (
    <Center>
      <group scale={1.2} rotation={[0, Math.PI / 8, 0]}>
        {meshes.map((mesh) => (
          <mesh
            key={mesh.uuid}
            geometry={mesh.geometry}
            position={mesh.position}
            rotation={mesh.rotation}
            scale={mesh.scale}
            castShadow={mesh.castShadow}
            receiveShadow={mesh.receiveShadow}
          >
            <meshStandardMaterial attach="material" {...getMaterialProps(mesh)} />
          </mesh>
        ))}
      </group>
    </Center>
  );
}

// export default MiniRobotPreview;