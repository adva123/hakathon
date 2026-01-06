/* eslint-disable react/no-unknown-property */

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Forest-travel character: cute little hiker girl (toy-like proportions)
const DollBot = forwardRef((props, ref) => {
  const { ...rest } = props;

  const groupRef = useRef(null);
  const rigRef = useRef(null);
  const headRef = useRef(null);
  const leftBrowRef = useRef(null);
  const rightBrowRef = useRef(null);
  const leftArmRef = useRef(null);
  const rightArmRef = useRef(null);
  const leftLegRef = useRef(null);
  const rightLegRef = useRef(null);

  const hairSphereInstRef = useRef(null);
  const hairTorusInstRef = useRef(null);

  const prevWorldPosRef = useRef(new THREE.Vector3());
  const worldPosRef = useRef(new THREE.Vector3());
  const gaitPhaseRef = useRef(0);
  const gaitAmountRef = useRef(0);

  const tmpM4 = useRef(new THREE.Matrix4());
  const tmpQ = useRef(new THREE.Quaternion());
  const tmpV3 = useRef(new THREE.Vector3());
  const tmpE = useRef(new THREE.Euler());

  useImperativeHandle(ref, () => groupRef.current);

  const materials = useMemo(() => {
    // Skin: warm toy-plastic.
    const skin = new THREE.MeshPhysicalMaterial({
      color: '#f6dccf',
      roughness: 0.62,
      metalness: 0,
      clearcoat: 0.24,
      clearcoatRoughness: 0.42,
      specularIntensity: 0.35,
      specularColor: new THREE.Color('#ffffff'),
      sheen: 0.14,
      sheenRoughness: 0.92,
      sheenColor: new THREE.Color('#ffd9cc'),
    });

    // Curly hair: chestnut.
    const hair = new THREE.MeshPhysicalMaterial({
      color: '#7a3b1b',
      roughness: 0.92,
      metalness: 0,
      clearcoat: 0.06,
      clearcoatRoughness: 0.75,
      sheen: 0.10,
      sheenRoughness: 0.95,
      sheenColor: new THREE.Color('#b86b42'),
    });

    // Outfit: hoodie + shorts.
    const hoodie = new THREE.MeshPhysicalMaterial({
      color: '#6fbf7a',
      roughness: 0.92,
      metalness: 0,
      clearcoat: 0.05,
      clearcoatRoughness: 0.85,
    });

    const shorts = new THREE.MeshPhysicalMaterial({
      color: '#3b6aa3',
      roughness: 0.9,
      metalness: 0,
      clearcoat: 0.04,
      clearcoatRoughness: 0.9,
    });

    const hat = new THREE.MeshPhysicalMaterial({
      color: '#d4b36a',
      roughness: 0.85,
      metalness: 0,
      clearcoat: 0.10,
      clearcoatRoughness: 0.55,
    });

    const hatBand = new THREE.MeshPhysicalMaterial({
      color: '#2f4b3a',
      roughness: 0.7,
      metalness: 0,
      clearcoat: 0.05,
      clearcoatRoughness: 0.8,
    });

    const backpack = new THREE.MeshPhysicalMaterial({
      color: '#ff7a8a',
      roughness: 0.86,
      metalness: 0,
      clearcoat: 0.12,
      clearcoatRoughness: 0.45,
    });

    const strap = new THREE.MeshPhysicalMaterial({
      color: '#38424e',
      roughness: 0.9,
      metalness: 0,
      clearcoat: 0.06,
      clearcoatRoughness: 0.8,
    });

    const boots = new THREE.MeshPhysicalMaterial({
      color: '#6b4b2a',
      roughness: 0.82,
      metalness: 0,
      clearcoat: 0.14,
      clearcoatRoughness: 0.55,
      specularIntensity: 0.25,
    });

    return { skin, hair, hoodie, shorts, hat, hatBand, backpack, strap, boots };
  }, []);

  const hairInstances = useMemo(() => {
    // Deterministic pseudo-random for consistent curls placement.
    const rand01 = (seed) => {
      const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return s - Math.floor(s);
    };

    const sphereCount = 68; // 50-100 curls total (mix of spheres + torus "donuts")
    const torusCount = 22;

    const sphere = [];
    const torus = [];

    // Head local-space placement (head sphere radius ~0.34). Keep curls mostly under the hat.
    const baseR = 0.30;
    const centerY = 0.18;

    for (let i = 0; i < sphereCount; i += 1) {
      const u = rand01(i * 17.1 + 3.2);
      const v = rand01(i * 29.7 + 9.1);
      const theta = u * Math.PI * 2;
      // Bias towards the top hemisphere so hair sits on the crown.
      const phi = (0.35 + 0.55 * v) * (Math.PI / 2);
      const rr = baseR * (0.92 + 0.18 * rand01(i * 11.7 + 2.9));

      const x = Math.cos(theta) * Math.sin(phi) * rr;
      const y = centerY + Math.cos(phi) * rr * 0.85;
      const z = Math.sin(theta) * Math.sin(phi) * rr * 0.85;

      // Slight forward bias so curls frame the face.
      const z2 = z + (0.06 + 0.03 * rand01(i * 8.2)) * (rand01(i * 3.3) > 0.55 ? 1 : -1);

      sphere.push({
        x,
        y: Math.min(0.50, y),
        z: THREE.MathUtils.clamp(z2, -0.26, 0.24),
        s: 0.045 + 0.030 * rand01(i * 41.7 + 1.7),
        ry: (rand01(i * 5.7 + 8.8) - 0.5) * 0.9,
      });
    }

    for (let i = 0; i < torusCount; i += 1) {
      const u = rand01(i * 19.9 + 6.1);
      const v = rand01(i * 31.3 + 2.7);
      const theta = u * Math.PI * 2;
      const ringR = baseR * (0.85 + 0.20 * rand01(i * 10.1));
      const x = Math.cos(theta) * ringR;
      const z = Math.sin(theta) * ringR * 0.86;
      const y = 0.30 + 0.14 * v;
      torus.push({
        x,
        y: Math.min(0.52, y),
        z: THREE.MathUtils.clamp(z, -0.24, 0.22),
        s: 0.55 + 0.55 * rand01(i * 7.7 + 1.2),
        rx: (rand01(i * 13.3 + 0.8) - 0.5) * 1.1,
        rz: (rand01(i * 9.1 + 4.4) - 0.5) * 1.1,
      });
    }

    return { sphere, torus };
  }, []);

  useEffect(() => {
    const sphereInst = hairSphereInstRef.current;
    const torusInst = hairTorusInstRef.current;
    if (sphereInst) {
      for (let i = 0; i < hairInstances.sphere.length; i += 1) {
        const h = hairInstances.sphere[i];
        tmpE.current.set(0, h.ry || 0, 0);
        tmpQ.current.setFromEuler(tmpE.current);
        tmpV3.current.set(h.x, h.y, h.z);
        tmpM4.current.compose(tmpV3.current, tmpQ.current, new THREE.Vector3(h.s, h.s, h.s));
        sphereInst.setMatrixAt(i, tmpM4.current);
      }
      sphereInst.instanceMatrix.needsUpdate = true;
    }
    if (torusInst) {
      for (let i = 0; i < hairInstances.torus.length; i += 1) {
        const h = hairInstances.torus[i];
        tmpE.current.set(h.rx || 0, 0, h.rz || 0);
        tmpQ.current.setFromEuler(tmpE.current);
        tmpV3.current.set(h.x, h.y, h.z);
        const sc = new THREE.Vector3(h.s, h.s, h.s);
        tmpM4.current.compose(tmpV3.current, tmpQ.current, sc);
        torusInst.setMatrixAt(i, tmpM4.current);
      }
      torusInst.instanceMatrix.needsUpdate = true;
    }
  }, [hairInstances]);

  useFrame(({ clock }, delta) => {
    const root = groupRef.current;
    const rig = rigRef.current;
    if (!root || !rig) return;

    // Compute world-space speed (RobotController owns root.position/rotation).
    root.getWorldPosition(worldPosRef.current);
    const d = worldPosRef.current.distanceTo(prevWorldPosRef.current);
    prevWorldPosRef.current.copy(worldPosRef.current);
    const speed = delta > 0 ? d / delta : 0; // units/sec

    // Blend between idle and walk based on speed.
    const targetGait = THREE.MathUtils.clamp((speed - 0.12) / 0.85, 0, 1);
    gaitAmountRef.current = THREE.MathUtils.damp(gaitAmountRef.current, targetGait, 9, delta);
    const gait = gaitAmountRef.current;

    const t = clock.getElapsedTime();
    const stepRate = THREE.MathUtils.lerp(1.6, 4.4, gait);
    gaitPhaseRef.current += delta * (stepRate * (0.6 + 1.2 * gait));
    const phase = gaitPhaseRef.current;
    const s = Math.sin(phase * Math.PI * 2);
    const c = Math.cos(phase * Math.PI * 2);

    // Cinematic body motion (kept internal so controller stays stable).
    const idleBob = Math.sin(t * 1.6) * 0.015;
    const walkBob = Math.abs(s) * 0.04;
    rig.position.y = idleBob + walkBob * gait;
    rig.rotation.z = Math.sin(t * 0.9) * 0.02 * (1 - 0.6 * gait);

    // Legs: opposite swing + slight knee/foot lift illusion.
    if (leftLegRef.current && rightLegRef.current) {
      const swing = 0.78 * gait;
      leftLegRef.current.rotation.x = s * swing;
      rightLegRef.current.rotation.x = -s * swing;
      leftLegRef.current.position.y = Math.max(0, -s) * 0.05 * gait;
      rightLegRef.current.position.y = Math.max(0, s) * 0.05 * gait;
    }

    // Arms: swing opposite legs with softer amplitude.
    if (leftArmRef.current && rightArmRef.current) {
      const armSwing = 0.55 * gait;
      leftArmRef.current.rotation.x = -s * armSwing;
      rightArmRef.current.rotation.x = s * armSwing;
      leftArmRef.current.rotation.z = 0.05 * gait + c * 0.06 * gait;
      rightArmRef.current.rotation.z = -0.05 * gait - c * 0.06 * gait;
    }

    // Head: slight tilt + secondary motion (looking around).
    if (headRef.current) {
      const look = Math.sin(t * 0.6) * 0.18;
      const nod = Math.sin(t * 1.2 + 0.6) * 0.05;
      const follow = -s * 0.08 * gait;
      headRef.current.rotation.y = look * (1 - 0.35 * gait);
      headRef.current.rotation.x = nod * (1 - 0.45 * gait) + follow;
      headRef.current.rotation.z = Math.sin(t * 1.05) * 0.03 * (1 - 0.25 * gait);

      // Brows: tiny dynamic expression makes the face feel alive.
      const curious = (1 - gait) * (0.10 + 0.08 * Math.sin(t * 0.9 + 0.2));
      const smiley = gait * (0.06 + 0.05 * Math.sin(t * 1.6));
      const browTilt = curious - smiley;
      const browLift = 0.015 * curious;

      if (leftBrowRef.current) {
        leftBrowRef.current.rotation.z = 0.14 + browTilt;
        leftBrowRef.current.position.y = 0.14 + browLift;
      }
      if (rightBrowRef.current) {
        rightBrowRef.current.rotation.z = -0.14 - browTilt;
        rightBrowRef.current.position.y = 0.14 + browLift;
      }
    }
  });

  return (
    <group ref={groupRef} {...rest}>
      <group ref={rigRef}>
      {/* Head */}
      <group ref={headRef} position={[0, 2.08, 0]}>
        {/* Face */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.34, 32, 24]} />
          <primitive object={materials.skin} attach="material" />
        </mesh>

        {/* Tiny nose */}
        <mesh position={[0, -0.03, 0.315]} castShadow>
          <sphereGeometry args={[0.032, 14, 12]} />
          <primitive object={materials.skin} attach="material" />
        </mesh>

        {/* Rosy cheeks */}
        <mesh position={[-0.16, -0.07, 0.28]}>
          <sphereGeometry args={[0.055, 14, 12]} />
          <meshStandardMaterial color={'#ffb3b8'} transparent opacity={0.30} roughness={0.9} />
        </mesh>
        <mesh position={[0.16, -0.07, 0.28]}>
          <sphereGeometry args={[0.055, 14, 12]} />
          <meshStandardMaterial color={'#ffb3b8'} transparent opacity={0.30} roughness={0.9} />
        </mesh>

        {/* Curly, volumetric hair (50-100 curls) */}
        <group>
          <instancedMesh ref={hairSphereInstRef} args={[null, null, hairInstances.sphere.length]} castShadow>
            <sphereGeometry args={[1, 12, 10]} />
            <primitive object={materials.hair} attach="material" />
          </instancedMesh>
          <instancedMesh ref={hairTorusInstRef} args={[null, null, hairInstances.torus.length]} castShadow>
            <torusGeometry args={[0.055, 0.020, 8, 18]} />
            <primitive object={materials.hair} attach="material" />
          </instancedMesh>
        </group>

        {/* Silly hiking hat */}
        <group position={[0, 0.52, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.20, 0.24, 0.22, 24]} />
            <primitive object={materials.hat} attach="material" />
          </mesh>
          <mesh position={[0, -0.02, 0]} castShadow>
            <cylinderGeometry args={[0.245, 0.245, 0.05, 24]} />
            <primitive object={materials.hatBand} attach="material" />
          </mesh>
          <mesh position={[0, -0.14, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.03, 30]} />
            <primitive object={materials.hat} attach="material" />
          </mesh>
          {/* tiny leaf pin */}
          <mesh position={[0.16, 0.02, 0.23]} rotation={[0.15, 0.2, 0.1]} castShadow>
            <sphereGeometry args={[0.035, 12, 10]} />
            <meshStandardMaterial color={'#66bb6a'} roughness={0.85} />
          </mesh>
        </group>

        {/* Eyes: layered (sclera + iris + pupil + catch-light) */}
        <group>
          {/* Left eye */}
          <group position={[-0.125, 0.06, 0.285]}>
            {/* Sclera */}
            <mesh>
              <sphereGeometry args={[0.075, 18, 14]} />
              <meshStandardMaterial color="#ffffff" roughness={0.22} metalness={0} />
            </mesh>
            {/* Iris (flat layer) */}
            <mesh position={[0.002, -0.010, 0.072]} rotation={[0, 0, 0]} renderOrder={5}>
              <circleGeometry args={[0.034, 22]} />
              <meshStandardMaterial color={'#2b5ea8'} roughness={0.38} metalness={0.02} />
            </mesh>
            {/* Pupil (flat layer) */}
            <mesh position={[0.002, -0.010, 0.074]} renderOrder={6}>
              <circleGeometry args={[0.016, 18]} />
              <meshStandardMaterial color="#111827" roughness={0.35} metalness={0.05} />
            </mesh>
            {/* Catch-light */}
            <mesh position={[-0.014, 0.016, 0.078]} renderOrder={7}>
              <sphereGeometry args={[0.010, 10, 8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0} />
            </mesh>
          </group>

          {/* Right eye */}
          <group position={[0.125, 0.06, 0.285]}>
            <mesh>
              <sphereGeometry args={[0.075, 18, 14]} />
              <meshStandardMaterial color="#ffffff" roughness={0.22} metalness={0} />
            </mesh>
            <mesh position={[-0.002, -0.010, 0.072]} renderOrder={5}>
              <circleGeometry args={[0.034, 22]} />
              <meshStandardMaterial color={'#2b5ea8'} roughness={0.38} metalness={0.02} />
            </mesh>
            <mesh position={[-0.002, -0.010, 0.074]} renderOrder={6}>
              <circleGeometry args={[0.016, 18]} />
              <meshStandardMaterial color="#111827" roughness={0.35} metalness={0.05} />
            </mesh>
            <mesh position={[0.014, 0.016, 0.078]} renderOrder={7}>
              <sphereGeometry args={[0.010, 10, 8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0} />
            </mesh>
          </group>
        </group>

        {/* Brows */}
        <mesh ref={leftBrowRef} position={[-0.12, 0.14, 0.23]} rotation={[0, 0, 0.18]}>
          <torusGeometry args={[0.06, 0.008, 8, 16, Math.PI]} />
          <primitive object={materials.hair} attach="material" />
        </mesh>
        <mesh ref={rightBrowRef} position={[0.12, 0.14, 0.23]} rotation={[0, 0, -0.18]}>
          <torusGeometry args={[0.06, 0.008, 8, 16, Math.PI]} />
          <primitive object={materials.hair} attach="material" />
        </mesh>

        {/* Smile */}
        <mesh position={[0, -0.14, 0.29]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.095, 0.013, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#111827" roughness={0.5} metalness={0} />
        </mesh>
      </group>

      {/* Neck */}
      <group position={[0, 1.80, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.075, 0.085, 0.12, 16]} />
          <primitive object={materials.skin} attach="material" />
        </mesh>
      </group>

      {/* Torso: hoodie */}
      <group position={[0, 1.28, 0]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.22, 0.56, 10, 18]} />
          <primitive object={materials.hoodie} attach="material" />
        </mesh>

        {/* Hoodie pocket */}
        <mesh position={[0, -0.08, 0.22]} castShadow receiveShadow>
          <boxGeometry args={[0.28, 0.14, 0.08]} />
          <meshStandardMaterial color={'#5aa96a'} roughness={0.95} />
        </mesh>

        {/* Backpack */}
        <group position={[0, 0.02, -0.26]}>
          <mesh castShadow receiveShadow>
            <capsuleGeometry args={[0.18, 0.32, 8, 14]} />
            <primitive object={materials.backpack} attach="material" />
          </mesh>
          <mesh position={[0, 0.06, -0.12]} castShadow>
            <boxGeometry args={[0.22, 0.12, 0.08]} />
            <meshStandardMaterial color={'#ff9aa6'} roughness={0.85} />
          </mesh>
        </group>

        {/* Backpack straps */}
        <mesh position={[-0.17, 0.12, 0.08]} rotation={[0.2, 0.0, 0.35]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.48, 10]} />
          <primitive object={materials.strap} attach="material" />
        </mesh>
        <mesh position={[0.17, 0.12, 0.08]} rotation={[0.2, 0.0, -0.35]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.48, 10]} />
          <primitive object={materials.strap} attach="material" />
        </mesh>
      </group>

      {/* Left Arm */}
      <group ref={leftArmRef} position={[-0.32, 1.75, 0]}>
        {/* Sleeve */}
        <mesh position={[0, -0.30, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.055, 0.06, 0.52, 12]} />
          <primitive object={materials.hoodie} attach="material" />
        </mesh>

        {/* Forearm */}
        <mesh position={[0, -0.80, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.055, 0.46, 12]} />
          <primitive object={materials.skin} attach="material" />
        </mesh>

        {/* Hand */}
        <mesh position={[0, -1.06, 0.01]} castShadow>
          <sphereGeometry args={[0.06, 14, 12]} />
          <primitive object={materials.skin} attach="material" />
        </mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArmRef} position={[0.32, 1.75, 0]}>
        <mesh position={[0, -0.30, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.055, 0.06, 0.52, 12]} />
          <primitive object={materials.hoodie} attach="material" />
        </mesh>

        <mesh position={[0, -0.80, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.055, 0.46, 12]} />
          <primitive object={materials.skin} attach="material" />
        </mesh>

        <mesh position={[0, -1.06, 0.01]} castShadow>
          <sphereGeometry args={[0.06, 14, 12]} />
          <primitive object={materials.skin} attach="material" />
        </mesh>
      </group>

      {/* Shorts */}
      <group position={[0, 0.95, 0]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.18, 0.16, 8, 16]} />
          <primitive object={materials.shorts} attach="material" />
        </mesh>
      </group>

      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.12, 0.68, 0]}>
        {/* Upper leg */}
        <mesh position={[0, -0.28, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.54, 14]} />
          <primitive object={materials.skin} attach="material" />
        </mesh>

        {/* Lower leg */}
        <mesh position={[0, -0.82, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.50, 14]} />
          <primitive object={materials.skin} attach="material" />
        </mesh>

        {/* Foot */}
        <mesh position={[0, -1.12, 0.10]} castShadow receiveShadow>
          <boxGeometry args={[0.14, 0.09, 0.26]} />
          <primitive object={materials.boots} attach="material" />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.12, 0.68, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.54, 14]} />
          <primitive object={materials.skin} attach="material" />
        </mesh>

        <mesh position={[0, -0.82, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.50, 14]} />
          <primitive object={materials.skin} attach="material" />
        </mesh>

        <mesh position={[0, -1.12, 0.10]} castShadow receiveShadow>
          <boxGeometry args={[0.14, 0.09, 0.26]} />
          <primitive object={materials.boots} attach="material" />
        </mesh>
      </group>
    </group>
    </group>
  );
});

DollBot.displayName = 'DollBot';
DollBot.propTypes = {};

export default DollBot;
