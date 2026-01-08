/* eslint-disable react/no-unknown-property */
import { useMemo } from "react";
import * as THREE from "three";

export default function Mission1Room() {
  const ROOM_W = 70;
  const ROOM_D = 70;
  const WALL_VIS_H = 220;
  const yCenter = -1.15 + WALL_VIS_H / 2;

  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2173bc",
        transparent: true,
        opacity: 0.28,
        roughness: 0.85,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),
    []
  );

  return (
    
    <group>
      <mesh position={[-ROOM_W / 2, yCenter, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, WALL_VIS_H]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh position={[ROOM_W / 2, yCenter, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, WALL_VIS_H]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh position={[0, yCenter, -ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, WALL_VIS_H]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh position={[0, yCenter, ROOM_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, WALL_VIS_H]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
    </group>
  );
}
