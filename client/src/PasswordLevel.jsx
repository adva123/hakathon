/* eslint-disable react/no-unknown-property */
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useKeyboard } from "./useKeyboard";
import { Text } from "@react-three/drei";


/**
 * A "part" the robot can pick up.
 * kind: "weak" | "medium" | "strong"
 */
function PasswordPart({ part, onPick }) {
  // floor tiles are static — no idle spin/bob needed

  // Visual language by kind (simple, no custom colors required if you prefer defaults)
  // But for clarity, we’ll do subtle emissive tinting:
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 });
    if (part.kind === "weak") m.emissive = new THREE.Color("#ff4d4d");
    if (part.kind === "medium") m.emissive = new THREE.Color("#ffd24d");
    if (part.kind === "strong") m.emissive = new THREE.Color("#4dff88");
    m.emissiveIntensity = 0.35;
    return m;
  }, [part.kind]);

  // We'll render the text on top of a floor tile. Compute thickness/gap so
  // the text sits cleanly above the tile and doesn't intersect.
  const thickness = 0.05; // tile thickness
  const textGap = 0.01; // space between tile top and text bottom
  const fontSize = 0.14;
  const groupPos = [part.position[0], thickness / 2, part.position[2]];

  return (
    <group position={groupPos}>
      <mesh material={material} onClick={() => onPick(part.id)}>
        {/* flat floor tile: width, height(thickness), depth */}
        <boxGeometry args={[0.9, thickness, 0.5]} />
      </mesh>
      {/* label sits just above the tile; use bottom anchoring so it doesn't overlap */}
      <Text position={[0, thickness / 2 + textGap, 0]} fontSize={fontSize} anchorX="center" anchorY="bottom" outlineWidth={0.02}>
        {part.text}
      </Text>
    </group>
  );
}




/**
 * The core in the middle: shows selected parts and allows removing
 * when robot is close and presses E.
 */
function PasswordCore({ position = [0, 0, 0], selected, onRemoveNearest, onRemoveInstance, robotRef }) {
  const coreRef = useRef();
  const keys = useKeyboard();

  useFrame(() => {
    if (!robotRef.current || !coreRef.current) return;

    // If robot is close enough and presses E -> remove the "last" part (simple)
    const dist = robotRef.current.position.distanceTo(coreRef.current.position);
    if (dist < 2.2 && keys.current.KeyE) {
      onRemoveNearest();
      // prevent repeat spam: clear the key immediately
      keys.current.KeyE = false;
    }
  });

  // Visual: floating "selected parts"
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
 * We'll upgrade this later to real rules (length, categories, dictionary words).
 */
function computeStrength(selected) {
  // immediate penalty/boost per part
  let score = 0;
  for (const p of selected) {
    if (p.kind === "weak") score -= 25;
    if (p.kind === "medium") score += 10;
    if (p.kind === "strong") score += 20;
  }
  // clamp 0..100
  score = Math.max(0, Math.min(100, score));
  return score;
}

/**
 * Main Level: spawns parts and handles pickup/remove.
 */
export default function PasswordLevel({ robotRef }) {
  // Define pickup parts in the room (you can randomize later)
  const parts = useMemo(
    () => [
      { id: "p1", text: "123456", kind: "weak", position: [-3, -2, -2], seed: 1 },
      { id: "p2", text: "password", kind: "weak", position: [3, -10, -1], seed: 2 },
      { id: "p3", text: "2024", kind: "medium", position: [-2, 0.0, 3], seed: 3 },
      { id: "p4", text: "John", kind: "medium", position: [2.5, 0.0, 2.2], seed: 4 },
      { id: "p5", text: "!K7", kind: "strong", position: [-4, 0.0, 1], seed: 5 },
      { id: "p6", text: "Zq9@", kind: "strong", position: [4, 0.0, 1.5], seed: 6 },
    ],
    []
  );

  const [availableIds, setAvailableIds] = useState(() => new Set(parts.map((p) => p.id)));
  const [selected, setSelected] = useState([]); // array of {instanceId, ...part}
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

      setSelected((prev) => [
        ...prev,
        { ...part, instanceId: `${part.id}-${crypto.randomUUID?.() ?? Math.random()}` },
      ]);
    },
    [availableIds, parts]
  );

  // remove last selected part (simple). Later we can remove “nearest” or “highlighted”.
  const onRemoveNearest = useCallback(() => {
    setSelected((prev) => {
      if (prev.length === 0) return prev;
      const removed = prev[prev.length - 1];

      // return it to world
      setAvailableIds((idsPrev) => {
        const next = new Set(idsPrev);
        next.add(removed.id);
        return next;
      });

      return prev.slice(0, -1);
    });
  }, []);

  // remove a specific selected instance (clicked in the core)
  const onRemoveInstance = useCallback((instanceId) => {
    setSelected((prev) => {
      const idx = prev.findIndex((s) => s.instanceId === instanceId);
      if (idx === -1) return prev;
      const removed = prev[idx];

      // return it to world
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

  // Optional: auto-win threshold for now (we’ll wire door/key later)
  const isStrong = strength >= 60;

  // Pickup detection via collision (robot proximity):
  // We’ll do the simplest version: if robot is near a part, auto-pick it.
  useFrame(() => {
    if (!robotRef.current) return;

    const robotPos = robotRef.current.position;
    for (const p of parts) {
      if (!availableIds.has(p.id)) continue;

      const partPos = new THREE.Vector3(p.position[0], p.position[1], p.position[2]);
      const d = robotPos.distanceTo(partPos);
      if (d < 1.1) {
        onPick(p.id);
        break;
      }
    }
  });

  return (
    <group>
      {/* Parts */}
      {parts.map((p) =>
        availableIds.has(p.id) ? <PasswordPart key={p.id} part={p} onPick={onPick} /> : null
      )}

      {/* Core */}
      <PasswordCore
        position={[0, 0.2, 0]}
        selected={selected}
        onRemoveNearest={onRemoveNearest}
        onRemoveInstance={onRemoveInstance}
        robotRef={robotRef}
      />

      {/* Strength indicator (super simple 3D bar) */}
      <group position={[0, 2.0, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.2, 0.15, 0.15]} />
          <meshStandardMaterial transparent opacity={0.25} />
        </mesh>
        <mesh position={[(-2.2 + (2.2 * strength) / 100) / 2, 0, 0.08]}>
          <boxGeometry args={[(2.2 * strength) / 100, 0.12, 0.08]} />
          <meshStandardMaterial />
        </mesh>
      </group>

      {/* Debug text placeholder (we’ll replace with nicer UI later) */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[isStrong ? 0.15 : 0.08, 16, 16]} />
        <meshStandardMaterial />
      </mesh>
    </group>
  );
}
