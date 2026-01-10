/* eslint-disable react/no-unknown-property */
import { useMemo } from "react";
import * as THREE from "three";
import MiniPasswordRoom from "./MiniPasswordRoom";

export default function MiniPassword3D({ robotRef, visible = false, position = [0, 0, 0] }) {
  const floorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1a1f2a",
        roughness: 0.85,
        metalness: 0.1,
      }),
    []
  );

  if (!visible) return null;

  return (
    <group position={position}>
      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <primitive object={floorMat} attach="material" />
      </mesh>

      {/* Walls */}
      <mesh position={[0, 2, -8]}>
        <boxGeometry args={[18, 4, 0.4]} />
        <meshStandardMaterial color="#111827" />
      </mesh>

      <mesh position={[0, 2, 8]}>
        <boxGeometry args={[18, 4, 0.4]} />
        <meshStandardMaterial color="#111827" />
      </mesh>

      <mesh position={[-9, 2, 0]}>
        <boxGeometry args={[0.4, 4, 18]} />
        <meshStandardMaterial color="#111827" />
      </mesh>

      <mesh position={[9, 2, 0]}>
        <boxGeometry args={[0.4, 4, 18]} />
        <meshStandardMaterial color="#111827" />
      </mesh>

      {/* ✅ Your mini game */}
      <MiniPasswordRoom robotRef={robotRef} />
    </group>
  );
}
