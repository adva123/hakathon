/* eslint-disable react/no-unknown-property */
import { useLayoutEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

function prand(n) {
  const x = Math.sin(n * 913.17 + n * n * 0.137) * 43758.5453123;
  return x - Math.floor(x);
}

function makeSunsetSkyTexture({ width = 768, height = 768 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#203a7a');
  g.addColorStop(0.35, '#5a4aa8');
  g.addColorStop(0.68, '#ff9f6b');
  g.addColorStop(1, '#ffd7b1');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Sun disk + warm glow
  const sunX = width * 0.72;
  const sunY = height * 0.68;
  const sunR = width * 0.08;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 4.2);
  glow.addColorStop(0, 'rgba(255,240,220,0.95)');
  glow.addColorStop(0.25, 'rgba(255,184,120,0.35)');
  glow.addColorStop(0.6, 'rgba(255,140,90,0.18)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 4.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,248,236,0.85)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Soft clouds
  for (let i = 0; i < 16; i += 1) {
    const x = prand(i + 2) * width;
    const y = prand(i + 25) * height * 0.55;
    const r = 48 + prand(i + 71) * 130;
    ctx.globalAlpha = 0.07 + prand(i + 90) * 0.09;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,225,200,0.9)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeAsphaltTexture({ size = 768 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0b0f18';
  ctx.fillRect(0, 0, size, size);

  // Asphalt speckle
  for (let i = 0; i < 14000; i += 1) {
    const x = (i * 73) % size;
    const y = (i * 149) % size;
    const t = prand(i + 3);
    const c = t < 0.45 ? 'rgba(255,255,255,0.025)' : t < 0.9 ? 'rgba(0,242,255,0.015)' : 'rgba(112,0,255,0.018)';
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  }

  // Lane stripe pattern across V (repeat in v)
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  for (let y = 0; y < size; y += 90) {
    ctx.fillRect(size * 0.48, y + 18, size * 0.04, 42);
  }

  // Neon edge hint
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = 'rgba(0,242,255,0.95)';
  ctx.fillRect(0, 0, 10, size);
  ctx.fillRect(size - 10, 0, 10, size);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 8);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildRibbonGeometry(points, { width = 2.8, y = 0 } = {}) {
  const half = width / 2;
  const positions = [];
  const uvs = [];
  const indices = [];

  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const left = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < points.length; i += 1) {
    p0.copy(points[i]);
    if (i < points.length - 1) p1.copy(points[i + 1]);
    else p1.copy(points[i]);

    dir.subVectors(p1, p0);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();

    left.crossVectors(up, dir).normalize();

    const lx = p0.x + left.x * half;
    const lz = p0.z + left.z * half;
    const rx = p0.x - left.x * half;
    const rz = p0.z - left.z * half;

    positions.push(lx, y, lz, rx, y, rz);

    const v = i / Math.max(1, points.length - 1);
    uvs.push(0, v, 1, v);

    if (i < points.length - 1) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = i * 2 + 2;
      const d = i * 2 + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildOffsetRibbonGeometry(points, { width = 2.6, y = 0, offset = 0 } = {}) {
  // offset: shifts the ribbon centerline left/right relative to the curve direction.
  const half = width / 2;
  const positions = [];
  const uvs = [];
  const indices = [];

  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const left = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const center = new THREE.Vector3();

  for (let i = 0; i < points.length; i += 1) {
    p0.copy(points[i]);
    if (i < points.length - 1) p1.copy(points[i + 1]);
    else p1.copy(points[i]);

    dir.subVectors(p1, p0);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();

    left.crossVectors(up, dir).normalize();
    center.copy(p0).addScaledVector(left, offset);

    const lx = center.x + left.x * half;
    const lz = center.z + left.z * half;
    const rx = center.x - left.x * half;
    const rz = center.z - left.z * half;

    positions.push(lx, y, lz, rx, y, rz);

    const v = i / Math.max(1, points.length - 1);
    uvs.push(0, v, 1, v);

    if (i < points.length - 1) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = i * 2 + 2;
      const d = i * 2 + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function ManhattanSky() {
  const tex = useMemo(() => (typeof document === 'undefined' ? null : makeSunsetSkyTexture()), []);
  if (!tex) return null;
  return (
    <mesh>
      <sphereGeometry args={[260, 48, 32]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

function CityGround({ y }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y - 0.04, 0]} receiveShadow>
      <planeGeometry args={[160, 160, 1, 1]} />
      <meshStandardMaterial color={'#050810'} roughness={0.96} metalness={0.05} />
    </mesh>
  );
}

CityGround.propTypes = {
  y: PropTypes.number.isRequired,
};

function CityRoad({ floorY, curveData }) {
  const tex = useMemo(() => (typeof document === 'undefined' ? null : makeAsphaltTexture()), []);

  const pathPoints = useMemo(() => {
    if (!curveData?.curve) return [];
    const pts = curveData.curve.getPoints(260);
    for (const p of pts) p.y = floorY + 0.02;
    return pts;
  }, [curveData, floorY]);

  const geo = useMemo(() => {
    if (!pathPoints.length) return null;
    return buildRibbonGeometry(pathPoints, { width: 3.2, y: floorY + 0.03 });
  }, [pathPoints, floorY]);

  if (!geo) return null;

  return (
    <mesh geometry={geo} receiveShadow>
      <meshPhysicalMaterial
        color={'#1a1f2c'}
        roughness={0.55}
        metalness={0.25}
        clearcoat={0.35}
        clearcoatRoughness={0.22}
        map={tex || undefined}
        emissive={'#2a1a14'}
        emissiveIntensity={0.10}
      />
    </mesh>
  );
}

CityRoad.propTypes = {
  floorY: PropTypes.number.isRequired,
  curveData: PropTypes.shape({ curve: PropTypes.any }).isRequired,
};

function CitySidewalks({ floorY, curveData }) {
  const pathPoints = useMemo(() => {
    if (!curveData?.curve) return [];
    const pts = curveData.curve.getPoints(260);
    for (const p of pts) p.y = floorY + 0.02;
    return pts;
  }, [curveData, floorY]);

  const leftGeo = useMemo(() => {
    if (!pathPoints.length) return null;
    return buildOffsetRibbonGeometry(pathPoints, { width: 2.2, y: floorY + 0.035, offset: 3.1 });
  }, [pathPoints, floorY]);

  const rightGeo = useMemo(() => {
    if (!pathPoints.length) return null;
    return buildOffsetRibbonGeometry(pathPoints, { width: 2.2, y: floorY + 0.035, offset: -3.1 });
  }, [pathPoints, floorY]);

  const leftGlowMatRef = useRef(null);
  const rightGlowMatRef = useRef(null);

  useFrame(({ clock }) => {
    const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 1.6);
    if (leftGlowMatRef.current) leftGlowMatRef.current.opacity = 0.08 + 0.05 * pulse;
    if (rightGlowMatRef.current) rightGlowMatRef.current.opacity = 0.08 + 0.05 * pulse;
  });

  if (!leftGeo || !rightGeo) return null;

  return (
    <group>
      <mesh geometry={leftGeo} receiveShadow>
        <meshStandardMaterial color={'#2a2f3a'} roughness={0.88} metalness={0.12} emissive={'#ffb36a'} emissiveIntensity={0.06} />
      </mesh>
      <mesh geometry={rightGeo} receiveShadow>
        <meshStandardMaterial color={'#2a2f3a'} roughness={0.88} metalness={0.12} emissive={'#ff7aa5'} emissiveIntensity={0.05} />
      </mesh>

      {/* Soft neon curb glow */}
      <mesh geometry={leftGeo}>
        <meshBasicMaterial ref={leftGlowMatRef} transparent opacity={0.08} color={'#ffb36a'} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh geometry={rightGeo}>
        <meshBasicMaterial ref={rightGlowMatRef} transparent opacity={0.08} color={'#ff6aa2'} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

CitySidewalks.propTypes = {
  floorY: PropTypes.number.isRequired,
  curveData: PropTypes.shape({ curve: PropTypes.any }).isRequired,
};

function CityBuildings({ floorY, curveData }) {
  const instRef = useRef(null);
  const instGlowRef = useRef(null);

  const glowMatRef = useRef(null);

  const buildingData = useMemo(() => {
    if (!curveData?.curve) return [];

    const pts = curveData.curve.getPoints(260);
    const up = new THREE.Vector3(0, 1, 0);
    const tan = new THREE.Vector3();
    const left = new THREE.Vector3();

    const buildings = [];
    const count = 340;
    for (let i = 0; i < count; i += 1) {
      const idx = (i * 7) % pts.length;
      const p = pts[idx];
      tan.copy(curveData.curve.getTangentAt(idx / (pts.length - 1)));
      tan.y = 0;
      if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
      tan.normalize();
      left.crossVectors(up, tan).normalize();

      const side = prand(i + 10) > 0.5 ? 1 : -1;
      const dist = 8 + prand(i + 33) * 18;
      const along = (prand(i + 90) - 0.5) * 6;

      const x0 = p.x + left.x * dist * side + tan.x * along;
      const z0 = p.z + left.z * dist * side + tan.z * along;

      const h = 6 + prand(i + 55) * 26;
      const w = 2.2 + prand(i + 75) * 4.2;
      const d = 2.0 + prand(i + 95) * 4.0;
      const rot = (Math.atan2(tan.x, tan.z) + Math.PI / 2) + (prand(i + 120) - 0.5) * 0.18;

      // Manhattan-ish snapping
      const snap = 1.6;
      const x = Math.round(x0 / snap) * snap;
      const z = Math.round(z0 / snap) * snap;

      buildings.push({ x, z, h, w, d, rot, seed: i });
    }

    return buildings;
  }, [curveData]);

  useLayoutEffect(() => {
    // Initialize instance transforms once.
    const inst = instRef.current;
    const instGlow = instGlowRef.current;
    if (!inst || !instGlow) return;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < buildingData.length; i += 1) {
      const b = buildingData[i];
      dummy.position.set(b.x, floorY + b.h * 0.5, b.z);
      dummy.rotation.set(0, b.rot, 0);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);

      // Vibrant facade color (sunset-friendly)
      const hue = 0.04 + prand(b.seed + 9) * 0.14; // warm/orange -> magenta-ish
      const sat = 0.20 + prand(b.seed + 19) * 0.25;
      const lit = 0.18 + prand(b.seed + 29) * 0.18;
      inst.setColorAt(i, new THREE.Color().setHSL(hue, sat, lit));

      dummy.scale.set(b.w * 1.02, b.h * 1.01, b.d * 1.02);
      dummy.updateMatrix();
      instGlow.setMatrixAt(i, dummy.matrix);
      instGlow.setColorAt(i, new THREE.Color().setHSL(0.52 + (b.seed % 9) * 0.02, 1, 0.58));
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.instanceColor.needsUpdate = true;
    instGlow.instanceMatrix.needsUpdate = true;
    instGlow.instanceColor.needsUpdate = true;
  }, [buildingData, floorY]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const m = glowMatRef.current;
    if (!m) return;
    m.opacity = 0.16 + 0.08 * (0.5 + 0.5 * Math.sin(t * 1.4));
  });

  return (
    <group>
      <instancedMesh ref={instRef} args={[null, null, buildingData.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial vertexColors roughness={0.58} metalness={0.52} />
      </instancedMesh>
      <instancedMesh ref={instGlowRef} args={[null, null, buildingData.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial ref={glowMatRef} transparent opacity={0.20} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function makeAdTexture({ label = 'NYC', width = 512, height = 256, seed = 1 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  const h0 = 0.04 + prand(seed + 2) * 0.12;
  const h1 = 0.52 + prand(seed + 8) * 0.12;
  bg.addColorStop(0, new THREE.Color().setHSL(h0, 0.85, 0.55).getStyle());
  bg.addColorStop(1, new THREE.Color().setHSL(h1, 0.85, 0.52).getStyle());
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Diagonal stripes
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let x = -height; x < width + height; x += 36) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.rotate(-Math.PI / 6);
    ctx.fillRect(0, 0, 18, height * 2);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Big label
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = 'bold 120px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, width / 2, height / 2);

  // Footer line
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = 'rgba(20,20,30,0.65)';
  ctx.fillRect(0, height - 28, width, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('MANHATTAN • SUNSET • LIVE', width / 2, height - 14);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function CityBillboards({ floorY, curveData }) {
  const matsRef = useRef([]);
  const textures = useMemo(() => {
    if (typeof document === 'undefined') return [];
    return [
      makeAdTexture({ label: 'NYC', seed: 3 }),
      makeAdTexture({ label: 'SHOP', seed: 11 }),
      makeAdTexture({ label: 'HACK', seed: 23 }),
      makeAdTexture({ label: 'LIVE', seed: 31 }),
    ].filter(Boolean);
  }, []);

  const boards = useMemo(() => {
    if (!curveData?.curve) return [];
    const pts = curveData.curve.getPoints(140);
    const up = new THREE.Vector3(0, 1, 0);
    const tan = new THREE.Vector3();
    const left = new THREE.Vector3();

    const out = [];
    for (let i = 0; i < 14; i += 1) {
      const idx = (i * 11) % pts.length;
      const t = idx / Math.max(1, pts.length - 1);
      const p = pts[idx];
      tan.copy(curveData.curve.getTangentAt(t));
      tan.y = 0;
      if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
      tan.normalize();
      left.crossVectors(up, tan).normalize();

      const side = prand(i + 70) > 0.5 ? 1 : -1;
      const dist = 9.5 + prand(i + 80) * 10;
      const x = p.x + left.x * dist * side;
      const z = p.z + left.z * dist * side;
      const y = floorY + 5.5 + prand(i + 91) * 10;
      const w = 7.5 + prand(i + 101) * 5;
      const h = 3.2 + prand(i + 111) * 2.4;
      const rot = Math.atan2(tan.x, tan.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      out.push({ x, y, z, w, h, rot, tex: i % Math.max(1, textures.length) });
    }
    return out;
  }, [curveData, floorY, textures.length]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (let i = 0; i < matsRef.current.length; i += 1) {
      const m = matsRef.current[i];
      if (!m) continue;
      m.emissiveIntensity = 0.85 + 0.35 * (0.5 + 0.5 * Math.sin(t * (1.3 + i * 0.07) + i));
      m.opacity = 0.92 + 0.06 * (0.5 + 0.5 * Math.sin(t * (0.9 + i * 0.05) + i * 2));
    }
  });

  if (!textures.length || !boards.length) return null;

  return (
    <group>
      {boards.map((b, i) => (
        <group key={`bb-${i}`} position={[b.x, b.y, b.z]} rotation={[0, b.rot, 0]}>
          <mesh>
            <planeGeometry args={[b.w, b.h]} />
            <meshStandardMaterial
              ref={(el) => {
                matsRef.current[i] = el;
              }}
              map={textures[b.tex] || undefined}
              emissive={'#ffffff'}
              emissiveMap={textures[b.tex] || undefined}
              toneMapped={false}
              transparent
              opacity={0.96}
              roughness={0.35}
              metalness={0.05}
            />
          </mesh>
          <pointLight position={[0, 0, 0.6]} intensity={0.35} color={'#ff9a6a'} distance={12} />
        </group>
      ))}
    </group>
  );
}

CityBillboards.propTypes = {
  floorY: PropTypes.number.isRequired,
  curveData: PropTypes.shape({ curve: PropTypes.any }).isRequired,
};

function CityTraffic({ floorY, curveData }) {
  const instRef = useRef(null);
  const dummyRef = useRef(new THREE.Object3D());
  const upRef = useRef(new THREE.Vector3(0, 1, 0));
  const tanRef = useRef(new THREE.Vector3());
  const leftRef = useRef(new THREE.Vector3());

  const carData = useMemo(() => {
    if (!curveData?.curve) return [];
    const cars = [];
    const count = 34;
    for (let i = 0; i < count; i += 1) {
      const dir = prand(i + 10) > 0.5 ? 1 : -1;
      const lane = dir > 0 ? 0.55 : -0.55;
      const speed = (0.018 + prand(i + 41) * 0.022) * dir;
      const t0 = prand(i + 73);
      const hue = 0.02 + prand(i + 91) * 0.18;
      cars.push({ t0, lane, speed, hue });
    }
    return cars;
  }, [curveData]);

  const updateCars = (time) => {
    const inst = instRef.current;
    if (!inst || !curveData?.curve || !carData.length) return;
    const curve = curveData.curve;
    const up = upRef.current;
    const tan = tanRef.current;
    const left = leftRef.current;
    const dummy = dummyRef.current;

    for (let i = 0; i < carData.length; i += 1) {
      const c = carData[i];
      let t = c.t0 + time * c.speed;
      t = ((t % 1) + 1) % 1;
      const p = curve.getPointAt(t);
      tan.copy(curve.getTangentAt(t));
      tan.y = 0;
      if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
      tan.normalize();
      left.crossVectors(up, tan).normalize();

      const laneOffset = 0.95;
      const x = p.x + left.x * (c.lane * laneOffset);
      const z = p.z + left.z * (c.lane * laneOffset);
      dummy.position.set(x, floorY + 0.22, z);
      const heading = Math.atan2(tan.x, tan.z) + (c.speed < 0 ? Math.PI : 0);
      dummy.rotation.set(0, heading, 0);
      dummy.scale.set(0.78, 0.34, 1.3);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      inst.setColorAt(i, new THREE.Color().setHSL(c.hue, 0.65, 0.55));
    }

    inst.instanceMatrix.needsUpdate = true;
    inst.instanceColor.needsUpdate = true;
  };

  useLayoutEffect(() => {
    // First frame must already be "busy": initialize cars before paint.
    updateCars(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carData, curveData, floorY]);

  useFrame(({ clock }) => {
    updateCars(clock.getElapsedTime());
  });

  if (!carData.length) return null;

  return (
    <instancedMesh ref={instRef} args={[null, null, carData.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial vertexColors roughness={0.35} metalness={0.25} />
    </instancedMesh>
  );
}

CityTraffic.propTypes = {
  floorY: PropTypes.number.isRequired,
  curveData: PropTypes.shape({ curve: PropTypes.any }).isRequired,
};

function CityTrafficLights({ floorY, curveData }) {
  const lightMatsRef = useRef([]);
  const poles = useMemo(() => {
    if (!curveData?.curve) return [];
    const out = [];
    const ts = [0.03, 0.11, 0.19, 0.28, 0.37, 0.46, 0.56, 0.66, 0.77, 0.88];
    const up = new THREE.Vector3(0, 1, 0);
    const tan = new THREE.Vector3();
    const left = new THREE.Vector3();

    for (let i = 0; i < ts.length; i += 1) {
      const t = ts[i];
      const p = curveData.curve.getPointAt(t);
      tan.copy(curveData.curve.getTangentAt(t));
      tan.y = 0;
      if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
      tan.normalize();
      left.crossVectors(up, tan).normalize();
      const side = i % 2 === 0 ? 1 : -1;
      const x = p.x + left.x * (4.8 * side);
      const z = p.z + left.z * (4.8 * side);
      const rot = Math.atan2(tan.x, tan.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      out.push({ x, z, rot, phase: i * 0.7 });
    }
    return out;
  }, [curveData]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const cycle = 6.0;

    for (let i = 0; i < poles.length; i += 1) {
      const base = i * 3;
      const red = lightMatsRef.current[base + 0];
      const yellow = lightMatsRef.current[base + 1];
      const green = lightMatsRef.current[base + 2];
      if (!red || !yellow || !green) continue;

      const local = ((t + poles[i].phase) % cycle + cycle) % cycle;
      const isGreen = local < 3.0;
      const isYellow = local >= 3.0 && local < 3.7;
      const isRed = local >= 3.7;

      red.emissiveIntensity = isRed ? 2.2 : 0.15;
      yellow.emissiveIntensity = isYellow ? 2.0 : 0.12;
      green.emissiveIntensity = isGreen ? 2.0 : 0.12;
    }
  });

  if (!poles.length) return null;

  return (
    <group>
      {poles.map((p, i) => (
        <group key={`tl-${i}`} position={[p.x, floorY, p.z]} rotation={[0, p.rot, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.06, 4.4, 10]} />
            <meshStandardMaterial color={'#2b2f38'} roughness={0.6} metalness={0.45} />
          </mesh>
          <mesh position={[0.9, 3.8, 0]} castShadow>
            <boxGeometry args={[1.8, 0.12, 0.12]} />
            <meshStandardMaterial color={'#2b2f38'} roughness={0.6} metalness={0.45} />
          </mesh>
          <mesh position={[1.55, 3.35, 0]} castShadow>
            <boxGeometry args={[0.35, 0.95, 0.35]} />
            <meshStandardMaterial color={'#10131a'} roughness={0.75} metalness={0.35} />
          </mesh>

          {/* Red / Yellow / Green */}
          <mesh position={[1.55, 3.55, 0.19]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial
              ref={(el) => {
                lightMatsRef.current[i * 3 + 0] = el;
              }}
              color={'#2b0c0c'}
              emissive={'#ff2a2a'}
              emissiveIntensity={0.15}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[1.55, 3.35, 0.19]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial
              ref={(el) => {
                lightMatsRef.current[i * 3 + 1] = el;
              }}
              color={'#2b220c'}
              emissive={'#ffd03a'}
              emissiveIntensity={0.12}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[1.55, 3.15, 0.19]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial
              ref={(el) => {
                lightMatsRef.current[i * 3 + 2] = el;
              }}
              color={'#0c2b14'}
              emissive={'#2dff7a'}
              emissiveIntensity={0.12}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

CityTrafficLights.propTypes = {
  floorY: PropTypes.number.isRequired,
  curveData: PropTypes.shape({ curve: PropTypes.any }).isRequired,
};

CityBuildings.propTypes = {
  floorY: PropTypes.number.isRequired,
  curveData: PropTypes.shape({ curve: PropTypes.any }).isRequired,
};

function MallComplex({ floorY }) {
  // A big "shopping mall" landmark close to the route.
  const baseY = floorY;
  return (
    <group position={[3.2, baseY, -6.0]} rotation={[0, 0.25, 0]}>
      <mesh position={[0, 3.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[18, 7.5, 10]} />
        <meshStandardMaterial color={'#0b1226'} roughness={0.7} metalness={0.35} emissive={'#061022'} emissiveIntensity={0.12} />
      </mesh>

      {/* Glassy front */}
      <mesh position={[0, 3.6, 5.05]} castShadow>
        <boxGeometry args={[16.8, 6.6, 0.22]} />
        <meshPhysicalMaterial color={'#0a1022'} roughness={0.08} metalness={0.08} transmission={0.6} thickness={0.6} ior={1.3} emissive={'#00f2ff'} emissiveIntensity={0.06} />
      </mesh>

      {/* Neon sign */}
      <mesh position={[0, 6.8, 5.2]}>
        <boxGeometry args={[10.5, 0.75, 0.25]} />
        <meshBasicMaterial color={'#00f2ff'} toneMapped={false} />
      </mesh>
      <mesh position={[0, 6.0, 5.2]}>
        <boxGeometry args={[7.5, 0.45, 0.25]} />
        <meshBasicMaterial color={'#ff2a6d'} toneMapped={false} />
      </mesh>
    </group>
  );
}

MallComplex.propTypes = {
  floorY: PropTypes.number.isRequired,
};

export function ManhattanWorld({ floorY, curveData }) {
  return (
    <group>
      <CityGround y={floorY} />
      <CityRoad floorY={floorY} curveData={curveData} />
      <CitySidewalks floorY={floorY} curveData={curveData} />
      <CityBuildings floorY={floorY} curveData={curveData} />
      <CityBillboards floorY={floorY} curveData={curveData} />
      <CityTrafficLights floorY={floorY} curveData={curveData} />
      <CityTraffic floorY={floorY} curveData={curveData} />
      <MallComplex floorY={floorY} />
    </group>
  );
}

ManhattanWorld.propTypes = {
  floorY: PropTypes.number.isRequired,
  curveData: PropTypes.shape({ curve: PropTypes.any }).isRequired,
};
