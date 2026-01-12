/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import Robot from "../features/robot/Robot.jsx";
import { useKeyboard } from "../hooks/useKeyboard.js";
import PropTypes from "prop-types";
import Mission1Room from "../mission/mission1.jsx";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function MissionIcon({ position, tint = "#28f0e6" }) {
  const groupRef = useRef();
  const linesRef = useRef();
  const glowRef = useRef();
  const auraRef = useRef();
  const tRef = useRef(Math.random() * 10);

  const auraTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");

    const g = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
    g.addColorStop(0.0, "rgba(255,255,255,0.0)");
    g.addColorStop(0.25, "rgba(255,255,255,0.22)");
    g.addColorStop(0.55, "rgba(255,255,255,0.10)");
    g.addColorStop(1.0, "rgba(255,255,255,0.0)");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame((_, delta) => {
    tRef.current += delta;
    if (!groupRef.current) return;

    const baseHover = 3;
    const floatAmp = 0.18;
    const floatSpeed = 1.0;
    const floatY = Math.sin(tRef.current * floatSpeed) * floatAmp;
    groupRef.current.position.y = position[1] + baseHover + floatY;

    groupRef.current.rotation.y += delta * 0.6;
    groupRef.current.rotation.x = Math.sin(tRef.current * 0.6) * 0.06;
    groupRef.current.rotation.z = Math.cos(tRef.current * 0.6) * 0.04;

    const pulse = 0.5 + 0.5 * Math.sin(tRef.current * 2.2);

    if (linesRef.current?.material) {
      linesRef.current.material.opacity = 0.55 + pulse * 0.25;
    }

    if (glowRef.current?.material) {
      glowRef.current.material.opacity = 0.10 + pulse * 0.10;
      const s = 1.02 + pulse * 0.03;
      glowRef.current.scale.set(s, s, s);
    }

    if (auraRef.current?.material) {
      auraRef.current.material.opacity = 0.16 + pulse * 0.10;
      auraRef.current.rotation.z += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      <pointLight position={[0, 0.3, 0]} intensity={1.15} color={tint} distance={10} />

      <lineSegments ref={linesRef}>
        <edgesGeometry args={[new THREE.BoxGeometry(1.25, 1.25, 1.25)]} />
        <lineBasicMaterial
          color={tint}
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      <mesh ref={glowRef}>
        <boxGeometry args={[1.32, 1.32, 1.32]} />
        <meshBasicMaterial
          color={tint}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh ref={auraRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.05, 0]}>
        <planeGeometry args={[4.2, 4.2]} />
        <meshBasicMaterial
          map={auraTex}
          color={tint}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
MissionIcon.propTypes = {
  position: PropTypes.arrayOf(PropTypes.number).isRequired,
  tint: PropTypes.string,
};

import React, { useState } from "react";
import { ForestWorld } from "../features/world/ForestWorld.jsx";

export default function Scene({
  gestureRef,
  spawnKey,
  spawn,
  inputEnabled = true,
  onPose,
  onIconsForMap,
  onNearLabel,
  onMissionTrigger,
  onExit,
}) {
  // gestureRef is now required for gesture-based movement
  const [roomId, setRoomId] = useState("task1");
  const keys = useKeyboard();

  const ROOM_W = 70;
  const ROOM_D = 70;
  const WALL_PADDING = 2.5;

  const minX = -ROOM_W / 2 + WALL_PADDING;
  const maxX = ROOM_W / 2 - WALL_PADDING;
  const minZ = -ROOM_D / 2 + WALL_PADDING;
  const maxZ = ROOM_D / 2 - WALL_PADDING;

  const robotRef = useRef();
  const controlsRef = useRef();

  const pos = useRef(new THREE.Vector3(0, -1.15, 0));
  const yaw = useRef(0);

  const velocityY = useRef(0);
  const isGrounded = useRef(true);
  const jumpLock = useRef(false);

  const SPEED = 10;
  const JUMP_FORCE = 9.5;
  const GRAVITY = 25;
  const GROUND_Y = -1.15;

  const CAM_HEIGHT = 4.1;
  const CAM_DISTANCE = 12.0;
  const CAM_SIDE = 10.2;
  const CAM_LERP = 0.07;

  const camTargetPos = useRef(new THREE.Vector3());
  const camLookAt = useRef(new THREE.Vector3());

  const ALL_ICONS = useMemo(
    () => [
      { id: "task1", label: "Mission 1", pos: new THREE.Vector3(16.5, -1.15, 14.0) },
      { id: "task2", label: "Mission 2", pos: new THREE.Vector3(-20.0, -1.15, 10.5) },
      { id: "task3", label: "Mission 3", pos: new THREE.Vector3(-14.5, -1.15, -21.0) },
      { id: "task4", label: "Mission 4", pos: new THREE.Vector3(22.0, -1.15, -10.0) },
    ],
    []
  );

  const iconsToShow = useMemo(() => {
    if (roomId === "forestworld") return ALL_ICONS;
    const found = ALL_ICONS.find((x) => x.id === roomId);
    return found ? [found] : [];
  }, [roomId, ALL_ICONS]);

  useEffect(() => {
    onIconsForMap?.(
      iconsToShow.map((ic) => ({
        id: ic.id,
        label: ic.label,
        x: ic.pos.x,
        z: ic.pos.z,
      }))
    );
  }, [iconsToShow, onIconsForMap]);

  const triggerCooldown = useRef(0);
  const poseTick = useRef(0);
  const lastNear = useRef("None");

  useEffect(() => {
    pos.current.set(spawn?.x ?? 0, spawn?.y ?? -1.15, spawn?.z ?? 0);
    yaw.current = spawn?.yaw ?? 0;

    velocityY.current = 0;
    isGrounded.current = true;
    jumpLock.current = false;

    triggerCooldown.current = 1.6;
    lastNear.current = "None";
    onNearLabel?.("None");
  }, [spawnKey, spawn, onNearLabel]);

  const wallMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame(({ camera }, delta) => {
    const k = keys.current;

    if (triggerCooldown.current > 0) triggerCooldown.current -= delta;

    // Jump trigger on Space press (with lock so holding Space doesn't re-trigger)
    if (k.Space) {
      if (!jumpLock.current && isGrounded.current && inputEnabled) {
        jumpLock.current = true;
        isGrounded.current = false;
        velocityY.current = JUMP_FORCE;

        if (robotRef.current?.userData?.setAction) {
          robotRef.current.userData.setAction("Jump");
        }
      }
    } else {
      jumpLock.current = false;
    }

    // Gravity
    velocityY.current -= GRAVITY * delta;
    pos.current.y += velocityY.current * delta;

    // Ground collision
    if (pos.current.y <= GROUND_Y) {
      pos.current.y = GROUND_Y;
      velocityY.current = 0;
      isGrounded.current = true;
    }

    // Movement + animation
    if (!inputEnabled) {
      if (robotRef.current?.userData?.setAction) robotRef.current.userData.setAction("Idle");
    } else {
      let turn = 0;
      if (k.ArrowLeft || k.KeyA) turn += 1;
      if (k.ArrowRight || k.KeyD) turn -= 1;
      yaw.current += turn * 2.2 * delta;

      let forward = 0;
      if (k.ArrowUp || k.KeyW) forward = 1;
      if (k.ArrowDown || k.KeyS) forward = -1;

      const moving = forward !== 0;

      if (moving) {
        const vx = Math.sin(yaw.current) * forward;
        const vz = Math.cos(yaw.current) * forward;

        const nextX = pos.current.x + vx * SPEED * delta;
        const nextZ = pos.current.z + vz * SPEED * delta;

        pos.current.x = clamp(nextX, minX, maxX);
        pos.current.z = clamp(nextZ, minZ, maxZ);

        // Run instead of Walk
        if (robotRef.current?.userData?.setAction) robotRef.current.userData.setAction("Walk");
      } else {
        // If in air, keep Jump (do not force Idle)
        if (isGrounded.current) {
          if (robotRef.current?.userData?.setAction) robotRef.current.userData.setAction("Idle");
        }
      }
    }

    if (robotRef.current) {
      robotRef.current.position.set(pos.current.x, pos.current.y, pos.current.z);
      robotRef.current.rotation.y = yaw.current;
    }

    // Mission triggers
    if (inputEnabled) {
      let nearestDist = Infinity;
      let nearestLabel = "None";
      const triggerDist = 4.6;

      for (const ic of iconsToShow) {
        const d = pos.current.distanceTo(ic.pos);
        if (d < nearestDist) {
          nearestDist = d;
          nearestLabel = ic.label;
        }
        if (d < triggerDist && triggerCooldown.current <= 0) {
          triggerCooldown.current = 1.4;
          onMissionTrigger?.(ic.id);
        }
      }

      const nearLabel = nearestDist < 11 ? nearestLabel : "None";
      if (nearLabel !== lastNear.current) {
        lastNear.current = nearLabel;
        onNearLabel?.(nearLabel);
      }
    }

    poseTick.current += delta;
    if (poseTick.current > 0.06) {
      poseTick.current = 0;
      onPose?.({
        x: pos.current.x,
        z: pos.current.z,
        yaw: yaw.current,
        roomW: ROOM_W,
        roomD: ROOM_D,
        roomId,
      });
    }

    camLookAt.current.set(pos.current.x, 1.6, pos.current.z);

    const backX = Math.sin(yaw.current) * CAM_DISTANCE;
    const backZ = Math.cos(yaw.current) * CAM_DISTANCE;
    const rightX = Math.sin(yaw.current + Math.PI / 2) * CAM_SIDE;
    const rightZ = Math.cos(yaw.current + Math.PI / 2) * CAM_SIDE;

    camTargetPos.current.set(pos.current.x - backX + rightX, CAM_HEIGHT, pos.current.z - backZ + rightZ);

    const CAM_PADDING = 2.5;
    camTargetPos.current.x = clamp(camTargetPos.current.x, -ROOM_W / 2 + CAM_PADDING, ROOM_W / 2 - CAM_PADDING);
    camTargetPos.current.z = clamp(camTargetPos.current.z, -ROOM_D / 2 + CAM_PADDING, ROOM_D / 2 - CAM_PADDING);


    camera.position.lerp(camTargetPos.current, CAM_LERP);
    camera.lookAt(camLookAt.current);

    // ✅ Gesture handling at the end
    if (gestureRef?.current?.gesture && inputEnabled) {
      const gesture = gestureRef.current.gesture.toLowerCase();
      // דוגמה: תנועה קדימה/אחורה/ימינה/שמאלה
      if (gesture === 'forward') {
        // תנועה קדימה
        const vx = Math.sin(yaw.current) * SPEED * delta;
        const vz = Math.cos(yaw.current) * SPEED * delta;
        pos.current.x = clamp(pos.current.x + vx, minX, maxX);
        pos.current.z = clamp(pos.current.z + vz, minZ, maxZ);
      } else if (gesture === 'back') {
        const vx = Math.sin(yaw.current) * -SPEED * delta;
        const vz = Math.cos(yaw.current) * -SPEED * delta;
        pos.current.x = clamp(pos.current.x + vx, minX, maxX);
        pos.current.z = clamp(pos.current.z + vz, minZ, maxZ);
      } else if (gesture === 'left') {
        yaw.current += 2.2 * delta;
      } else if (gesture === 'right') {
        yaw.current -= 2.2 * delta;
      } else if (gesture === 'iloveyou') {
        if (onExit) onExit();
      }
      // ניקוי
      gestureRef.current.gesture = null;
    }
  });

  return (
    <>
      <hemisphereLight intensity={1.2} skyColor="#ffffff" groundColor="#e1e6f0" />
      <directionalLight position={[6, 10, 8]} intensity={0.5} color="#f0f4ff" castShadow />
      <directionalLight position={[-8, 6, -6]} intensity={0.35} color="#dde7ff" />

      {roomId === "task1" ? (
        <>
          <Mission1Room />
          <Html zIndexRange={[10, 0]} style={{pointerEvents:'auto'}} position={[0, 10, 0]}>
            <button
              style={{padding:'12px 24px',fontSize:18,borderRadius:8,background:'#222',color:'#fff',border:'2px solid #28f0e6',cursor:'pointer'}}
              onClick={() => {
                if (onExit) onExit();
                else setRoomId("forestworld");
              }}
            >
              יציאה מהמשימה
            </button>
          </Html>
        </>
      ) : roomId === "task2" ? (
        <Mission2Room />
      ) : roomId === "task3" ? (
        <Mission3Room />
      ) : roomId === "task4" ? (
        <Mission4Room />
      ) : roomId === "forestworld" ? (
        <ForestWorld floorY={-1.12} curveData={{}} />
      ) : (
        (() => {
          const WALL_VIS_H = 220;
          const yCenter = -1.15 + WALL_VIS_H / 2;
          const W = ROOM_W;
          const D = ROOM_D;
          return (
            <>
              <mesh position={[-W / 2, yCenter, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[D, WALL_VIS_H]} />
                <primitive object={wallMat} attach="material" />
              </mesh>
              <mesh position={[W / 2, yCenter, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[D, WALL_VIS_H]} />
                <primitive object={wallMat} attach="material" />
              </mesh>
              <mesh position={[0, yCenter, -D / 2]}>
                <planeGeometry args={[W, WALL_VIS_H]} />
                <primitive object={wallMat} attach="material" />
              </mesh>
              <mesh position={[0, yCenter, D / 2]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[W, WALL_VIS_H]} />
                <primitive object={wallMat} attach="material" />
              </mesh>
            </>
          );
        })()
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W * 3, ROOM_D * 3]} />
        <meshStandardMaterial roughness={0.9} metalness={0} color="#c5d0e8" />
      </mesh>

      {iconsToShow.map((ic) => (
        <MissionIcon key={ic.id} position={[ic.pos.x, ic.pos.y, ic.pos.z]} />
      ))}

      <Robot ref={robotRef} scale={1.25} position={[0, -1.15, 0]} />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={false}
        enableRotate={false}
        enableKeys={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
      />
    </>
  );
}

Scene.propTypes = {
  spawnKey: PropTypes.any,
  spawn: PropTypes.object,
  inputEnabled: PropTypes.bool,
  onPose: PropTypes.func,
  onIconsForMap: PropTypes.func,
  onNearLabel: PropTypes.func,
  onMissionTrigger: PropTypes.func,
  onExit: PropTypes.func,
};
