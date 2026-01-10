/* eslint-disable react/no-unknown-property */
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useKeyboard } from "../../useKeyboard";
import { Text } from "@react-three/drei";

/**
 * A "part" the robot can pick up.
 * kind: "weak" | "medium" | "strong"
 */
function PasswordPart({ part }) {
  // Visual language by kind
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.1,
    });
    if (part.kind === "weak") m.emissive = new THREE.Color("#ff4d4d");
    if (part.kind === "medium") m.emissive = new THREE.Color("#ffd24d");
    if (part.kind === "strong") m.emissive = new THREE.Color("#4dff88");
    m.emissiveIntensity = 0.35;
    return m;
  }, [part.kind]);

  const thickness = 0.05; // tile thickness
  const textGap = 0.01; // space above tile
  const fontSize = 0.14;

  // Place tile on the floor (use x,z from part.position)
  const groupPos = [part.position[0], thickness / 2, part.position[2]];

  return (
    <group position={groupPos}>
      {/* auto-pick is handled in PasswordLevel; no click needed */}
      <mesh material={material}>
        <boxGeometry args={[0.9, thickness, 0.5]} />
      </mesh>

      <Text
        position={[0, thickness / 2 + textGap, 0]}
        fontSize={fontSize}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
      >
        {part.text}
      </Text>
    </group>
  );
}

/**
 * The core: shows selected parts and allows removing
 * - Press E near the core => removes the LAST picked part
 * - Click on a tile in the core => removes that specific tile
 */
function PasswordCore({
  position = [0, 0, 0],
  selected,
  onRemoveNearest,
  onRemoveInstance,
  robotRef,
}) {
  const coreRef = useRef();
  const keys = useKeyboard();

  useFrame(() => {
    if (!robotRef.current || !coreRef.current) return;

    const dist = robotRef.current.position.distanceTo(coreRef.current.position);
    if (dist < 2.2 && keys.current.KeyE) {
      onRemoveNearest();
      keys.current.KeyE = false; // prevent repeat spam
    }
  });

  return (
    <group ref={coreRef} position={position}>
      {/* Selected parts shown as small tiles */}
      <group position={[0, 1.0, 0]}>
        {selected.map((p, i) => (
          <mesh
            key={p.instanceId}
            position={[i * 0.35 - (selected.length - 1) * 0.175, 0, 0]}
            onClick={() => onRemoveInstance && onRemoveInstance(p.instanceId)}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "")}
          >
            <boxGeometry args={[0.3, 0.12, 0.2]} />
            <meshStandardMaterial />
          </mesh>
        ))}
      </group>

      {/* Show assembled password */}
      <Text
        position={[0, 1.45, 0]}
        fontSize={0.18}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
      >
        {selected.map((p) => p.text).join("") || "Pick parts to build a password"}
      </Text>
    </group>
  );
}

/**
 * Utility: simple strength scoring placeholder.
 * We'll upgrade later to real rules (length, categories, dictionary words).
 */
function computeStrength(selected) {
  let score = 0;
  for (const p of selected) {
    if (p.kind === "weak") score -= 25;
    if (p.kind === "medium") score += 10;
    if (p.kind === "strong") score += 20;
  }
  return Math.max(0, Math.min(100, score));
}

/**
 * Main Level: spawns parts and handles pickup/remove.
 */
export default function PasswordLevel({ robotRef }) {
  // Define pickup parts in the room (you can randomize later)
  const parts = useMemo(
    () => [
      { id: "p1", text: "123456", kind: "weak", position: [-3, 0, -2], seed: 1 },
      { id: "p2", text: "password", kind: "weak", position: [3, 0, -1], seed: 2 },
      { id: "p3", text: "2024", kind: "medium", position: [-2, 0, 3], seed: 3 },
      { id: "p4", text: "John", kind: "medium", position: [2.5, 0, 2.2], seed: 4 },
      { id: "p5", text: "!K7", kind: "strong", position: [-4, 0, 1], seed: 5 },
      { id: "p6", text: "Zq9@", kind: "strong", position: [4, 0, 1.5], seed: 6 },
    ],
    []
  );

  const [availableIds, setAvailableIds] = useState(
    () => new Set(parts.map((p) => p.id))
  );
  const [selected, setSelected] = useState([]); // { instanceId, ...part }
  const [strength, setStrength] = useState(0);

  // pick up a part
  const onPick = useCallback(
    (id) => {
      if (!availableIds.has(id)) return;
      const part = parts.find((p) => p.id === id);
      if (!part) return;

      setAvailableIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      const instanceId = `${part.id}-${crypto?.randomUUID?.() ?? Date.now()}-${Math.random()}`;

      setSelected((prev) => [...prev, { ...part, instanceId }]);
    },
    [availableIds, parts]
  );

  // remove last selected part (E near core)
  const onRemoveNearest = useCallback(() => {
    setSelected((prev) => {
      if (prev.length === 0) return prev;
      const removed = prev[prev.length - 1];

      setAvailableIds((idsPrev) => {
        const next = new Set(idsPrev);
        next.add(removed.id);
        return next;
      });

      return prev.slice(0, -1);
    });
  }, []);

  // remove a specific selected instance (click in the core)
  const onRemoveInstance = useCallback((instanceId) => {
    setSelected((prev) => {
      const idx = prev.findIndex((s) => s.instanceId === instanceId);
      if (idx === -1) return prev;

      const removed = prev[idx];

      setAvailableIds((idsPrev) => {
        const next = new Set(idsPrev);
        next.add(removed.id);
        return next;
      });

      return prev.filter((s) => s.instanceId !== instanceId);
    });
  }, []);

  // recompute strength immediately whenever selected changes
  useEffect(() => {
    setStrength(computeStrength(selected));
  }, [selected]);

  const isStrong = strength >= 60;

  // --- Auto-pickup: pick the closest available tile within radius, with cooldown ---
  const pickupRadius = 0.9; // tune if needed
  const pickCooldown = 0.12; // seconds
  const lastPickAt = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    if (!robotRef.current) return;

    const now = clock.getElapsedTime();
    if (now - lastPickAt.current < pickCooldown) return;

    const robotPos = robotRef.current.position;

    let closestId = null;
    let closestDist = Infinity;

    for (const p of parts) {
      if (!availableIds.has(p.id)) continue;

      // Use XZ-plane distance (ignore Y)
      tmp.set(p.position[0], 0, p.position[2]);
      const dx = robotPos.x - tmp.x;
      const dz = robotPos.z - tmp.z;
      const d = Math.hypot(dx, dz);

      if (d < pickupRadius && d < closestDist) {
        closestDist = d;
        closestId = p.id;
      }
    }

    if (closestId) {
      onPick(closestId);
      lastPickAt.current = now;
    }
  });

  return (
    <group>
      {/* Parts */}
      {parts.map((p) =>
        availableIds.has(p.id) ? <PasswordPart key={p.id} part={p} /> : null
      )}

      {/* Core */}
      <PasswordCore
        position={[0, 0.2, 0]}
        selected={selected}
        onRemoveNearest={onRemoveNearest}
        onRemoveInstance={onRemoveInstance}
        robotRef={robotRef}
      />

      {/* Strength indicator (simple bar) */}
      <group position={[0, 2.0, 0]}>
        <mesh>
          <boxGeometry args={[2.2, 0.15, 0.15]} />
          <meshStandardMaterial transparent opacity={0.25} />
        </mesh>

        <mesh position={[(-2.2 + (2.2 * strength) / 100) / 2, 0, 0.08]}>
          <boxGeometry args={[(2.2 * strength) / 100, 0.12, 0.08]} />
          <meshStandardMaterial />
        </mesh>
      </group>

      {/* Tiny debug indicator */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[isStrong ? 0.15 : 0.08, 16, 16]} />
        <meshStandardMaterial />
      </mesh>
    </group>
  );
}