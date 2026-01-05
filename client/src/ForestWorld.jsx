/* eslint-disable react/no-unknown-property */
import { useFrame, useThree } from '@react-three/fiber';
import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

// Bump this to force tree re-generation under React Fast Refresh.
const TREE_COLOR_REV = 2;

function prand(n) {
  // Deterministic pseudo-random in [0,1).
  const x = Math.sin(n * 973.231 + n * n * 0.131) * 43758.5453123;
  return x - Math.floor(x);
}

function makeForestSkyTexture({ width = 768, height = 768 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Sky gradient: deep blue -> pale horizon -> warm glow.
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#2b5ea8');
  g.addColorStop(0.55, '#9fd3ff');
  g.addColorStop(0.8, '#dff2ff');
  g.addColorStop(1, '#fff3d9');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Soft cloud puffs.
  for (let i = 0; i < 18; i += 1) {
    const x = prand(i + 10) * width;
    const y = prand(i + 40) * height * 0.55;
    const r = 55 + prand(i + 70) * 140;
    ctx.globalAlpha = 0.08 + prand(i + 90) * 0.1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle sun glow.
  const sx = width * 0.72;
  const sy = height * 0.24;
  const sr = width * 0.28;
  const sun = ctx.createRadialGradient(sx, sy, sr * 0.05, sx, sy, sr);
  sun.addColorStop(0, 'rgba(255,245,210,0.50)');
  sun.addColorStop(0.35, 'rgba(255,235,190,0.24)');
  sun.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGrassTexture({ size = 512 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base.
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(0, 0, size, size);

  // Noise + blades.
  for (let i = 0; i < 5000; i += 1) {
    const x = (i * 73) % size;
    const y = (i * 149) % size;
    const t = prand(i + 3);
    const c = t < 0.33 ? 'rgba(18,94,41,0.22)' : t < 0.66 ? 'rgba(62,155,77,0.18)' : 'rgba(145,214,120,0.12)';
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  }

  // Light “blade streaks”.
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 420; i += 1) {
    const x = prand(i + 20) * size;
    const y = prand(i + 60) * size;
    const len = 6 + prand(i + 90) * 18;
    const w = 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((prand(i + 120) - 0.5) * 0.7);
    ctx.fillStyle = i % 3 === 0 ? '#a8e28c' : '#7fd26c';
    ctx.fillRect(-w / 2, -len / 2, w, len);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildRibbonGeometry(points, { width = 2.6, y = 0 } = {}) {
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

    // left = up x dir
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

function makePoiIconTexture({ emoji, size = 256 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);

  // Soft badge background.
  const r = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r * 1.2);
  glow.addColorStop(0, 'rgba(255,255,255,0.92)');
  glow.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  glow.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(17,24,39,0.16)';
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Emoji.
  ctx.font = `bold ${Math.floor(size * 0.52)}px ${'Segoe UI Emoji'}, ${'Apple Color Emoji'}, ${'Noto Color Emoji'}, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#111827';
  ctx.fillText(String(emoji || '📍'), cx, cy + size * 0.02);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLakeGlintTexture({ size = 256 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.48;
  const g = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // A faint streak to feel like a sun reflection.
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - size * 0.02, cy - size * 0.28, size * 0.04, size * 0.56);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRainbowStripTexture({ width = 512, height = 64 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);

  const g = ctx.createLinearGradient(0, 0, width, 0);
  g.addColorStop(0.00, 'rgba(255,60,60,1)');
  g.addColorStop(0.16, 'rgba(255,160,60,1)');
  g.addColorStop(0.33, 'rgba(255,240,90,1)');
  g.addColorStop(0.50, 'rgba(80,255,140,1)');
  g.addColorStop(0.66, 'rgba(60,220,255,1)');
  g.addColorStop(0.82, 'rgba(80,120,255,1)');
  g.addColorStop(1.00, 'rgba(190,90,255,1)');

  // Soft vertical fade (thin rainbow arc look).
  const v = ctx.createLinearGradient(0, 0, 0, height);
  v.addColorStop(0.0, 'rgba(255,255,255,0)');
  v.addColorStop(0.35, 'rgba(255,255,255,1)');
  v.addColorStop(0.65, 'rgba(255,255,255,1)');
  v.addColorStop(1.0, 'rgba(255,255,255,0)');

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function ForestSky() {
  const tex = useMemo(() => makeForestSkyTexture(), []);
  if (!tex) return null;

  return (
    <mesh scale={1}>
      <sphereGeometry args={[240, 48, 32]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

export function ForestWorld({ floorY, curveData }) {
  const grassTex = useMemo(() => makeGrassTexture(), []);
  const lakeGlintTex = useMemo(() => makeLakeGlintTexture(), []);
  const rainbowTex = useMemo(() => makeRainbowStripTexture(), []);

  const pathPoints = useMemo(() => {
    if (!curveData?.curve) return [];
    const pts = curveData.curve.getPoints(260);
    for (const p of pts) p.y = floorY + 0.02;
    return pts;
  }, [curveData, floorY]);

  const pathGeo = useMemo(() => {
    if (!pathPoints.length) return null;
    return buildRibbonGeometry(pathPoints, { width: 2.9, y: floorY + 0.03 });
  }, [pathPoints, floorY]);

  const treeData = useMemo(() => {
    const curvePts = pathPoints.length ? pathPoints : [];
    const curvePts2 = curvePts.map((p) => new THREE.Vector3(p.x, 0, p.z));

    const minDist2ToCurve = (x, z) => {
      let best = Infinity;
      for (let i = 0; i < curvePts2.length; i += 1) {
        const p = curvePts2[i];
        const dx = p.x - x;
        const dz = p.z - z;
        const d2 = dx * dx + dz * dz;
        if (d2 < best) best = d2;
      }
      return best;
    };

    const pines = [];
    const rounds = [];
    const birches = [];
    const palms = [];
    const palmFronds = [];
    const bushes = [];
    const flowers = [];
    const mushrooms = [];
    const grassClumps = [];
    const rocks = [];
    const sunflowers = [];
    const roseBlooms = [];
    const roseLeaves = [];
    const cyclamenStems = [];
    const cyclamenPetals = [];
    const gypsophila = [];
    const ducks = [];

    const bounds = 58;
    const clearance = 4.2; // keep path clear
    const clearance2 = clearance * clearance;

    // Trees (multiple types).
    let attempts = 0;
    while (pines.length + rounds.length + birches.length < 320 && attempts < 2600) {
      attempts += 1;
      const i = attempts;
      const x = (prand(i + 100) - 0.5) * bounds * 2;
      const z = (prand(i + 200) - 0.5) * bounds * 2;
      const d2 = curvePts2.length ? minDist2ToCurve(x, z) : 999;
      if (d2 < clearance2) continue;
      if (x * x + z * z < 18) continue; // keep center a bit open

      const typeRoll = prand(i + 777);
      const s = 0.72 + prand(i + 300) * 0.9;

      // Strongly mixed per-tree palette choice (no distance/spatial pattern):
      // 0 = bright green, 1 = khaki green, 2 = dark green.
      const sx = Math.floor((x + bounds) * 17);
      const sz = Math.floor((z + bounds) * 17);
      const spatialSeed = (sx * 73856093) ^ (sz * 19349663);
      const mixSeed = (spatialSeed ^ (i * 83492791)) | 0;
      const variant = Math.floor(prand(mixSeed + 9001) * 3);
      const jitterH = (prand(mixSeed + 9011) - 0.5) * 0.05;
      const jitterS = (prand(mixSeed + 9021) - 0.5) * 0.10;
      const jitterL = (prand(mixSeed + 9031) - 0.5) * 0.10;

      const palette = (() => {
        // HSL: hue in [0..1], saturation/lightness in [0..1]
        if (variant === 0) return { h: 0.30, s: 0.92, l: 0.58 }; // bright green
        if (variant === 1) return { h: 0.22, s: 0.55, l: 0.44 }; // khaki/olive green
        return { h: 0.31, s: 0.80, l: 0.26 }; // dark green
      })();

      const leafH = (palette.h + jitterH + 1) % 1;
      const leafS = Math.max(0.35, Math.min(1, palette.s + jitterS));
      const leafL = Math.max(0.18, Math.min(0.72, palette.l + jitterL));

      // Trunk tint: not all the same dark brown.
      const trunkVariant = prand(spatialSeed + 4120);
      const trunkHue = 0.07 + prand(spatialSeed + 4150) * 0.04; // brown/orange range
      const trunkSat = 0.52 + prand(spatialSeed + 4160) * 0.18;
      const trunkLight = trunkVariant < 0.55 ? 0.16 + prand(spatialSeed + 4130) * 0.10 : 0.26 + prand(spatialSeed + 4140) * 0.12;
      const trunkCol = new THREE.Color().setHSL(trunkHue, Math.min(0.78, trunkSat), Math.min(0.44, trunkLight));

      if (typeRoll < 0.48) {
        const leafCol = new THREE.Color().setHSL(leafH, leafS, leafL);
        pines.push({ x, z, s, leafCol, trunkCol });
      } else if (typeRoll < 0.82) {
        const leafCol = new THREE.Color().setHSL(leafH, leafS, leafL);
        rounds.push({ x, z, s, leafCol, trunkCol });
      } else {
        const leafCol = new THREE.Color().setHSL(leafH, leafS, leafL);
        // Birches use a lighter, slightly desaturated trunk range.
        const birchTrunkLight = 0.74 + prand(spatialSeed + 4180) * 0.16;
        const birchTrunkSat = 0.06 + prand(spatialSeed + 4190) * 0.08;
        const birchTrunkCol = new THREE.Color().setHSL(0.10, birchTrunkSat, Math.min(0.92, birchTrunkLight));
        birches.push({ x, z, s, leafCol, trunkCol: birchTrunkCol });
      }
    }

    // Palm trees (bright, lighter green). Keep them a bit further out for variety.
    attempts = 0;
    while (palms.length < 90 && attempts < 1800) {
      attempts += 1;
      const i = attempts;
      const x = (prand(i + 2100) - 0.5) * bounds * 2;
      const z = (prand(i + 2200) - 0.5) * bounds * 2;
      const d2 = curvePts2.length ? minDist2ToCurve(x, z) : 999;
      if (d2 < (clearance + 1.6) * (clearance + 1.6)) continue;
      if (x * x + z * z < 22) continue;

      // Prefer outskirts (gives skyline variety).
      const r = Math.hypot(x, z);
      if (r < 34 && prand(i + 2300) < 0.75) continue;

      const s = 0.85 + prand(i + 2400) * 1.05;
      const trunkH = 3.1 + prand(i + 2500) * 2.2;
      const yaw = prand(i + 2600) * Math.PI * 2;

      // Bright palm leaf tint.
      const hue = 0.29 + prand(i + 2700) * 0.06;
      const col = new THREE.Color().setHSL(hue, 0.72, 0.56);

      palms.push({ x, z, s, trunkH, yaw, col });

      const frondsPer = 6;
      for (let k = 0; k < frondsPer; k += 1) {
        const fyaw = yaw + (k / frondsPer) * Math.PI * 2 + (prand(i * 10 + k + 2800) - 0.5) * 0.25;
        const pitch = 0.9 + prand(i * 10 + k + 2900) * 0.6;
        palmFronds.push({ x, z, s, trunkH, yaw: fyaw, pitch, col });
      }
    }

    // Bushes + small plants near path edges.
    for (let i = 0; i < 140; i += 1) {
      const t = i / 139;
      if (!curveData?.curve) break;
      const p = curveData.curve.getPointAt(t);
      const tan = curveData.curve.getTangentAt(t);
      tan.y = 0;
      tan.normalize();
      const left = new THREE.Vector3(0, 1, 0).cross(tan).normalize();

      const side = i % 2 === 0 ? 1 : -1;
      const off = 2.4 + prand(i + 900) * 2.2;
      const x = p.x + left.x * off * side;
      const z = p.z + left.z * off * side;
      const s = 0.45 + prand(i + 920) * 0.6;
      bushes.push({ x, z, s });

      // Flowers a bit further from the path.
      if (i % 2 === 0) {
        const off2 = off + 1.4 + prand(i + 940) * 1.8;
        const fx = p.x + left.x * off2 * side;
        const fz = p.z + left.z * off2 * side;
        const fs = 0.22 + prand(i + 960) * 0.22;
        const hue = 0.92 + prand(i + 980) * 0.12; // pink/purple
        const col = new THREE.Color().setHSL(hue % 1, 0.75, 0.68);
        flowers.push({ x: fx, z: fz, s: fs, col });
      }

      // Sunflowers (pretty, more noticeable).
      if (i % 7 === 0) {
        const offS = off + 2.2 + prand(i + 1210) * 2.4;
        const sx = p.x + left.x * offS * side;
        const sz = p.z + left.z * offS * side;
        const ss = 0.45 + prand(i + 1220) * 0.55;
        const yaw = prand(i + 1230) * Math.PI * 2;
        const petalCol = new THREE.Color().setHSL(0.13 + prand(i + 1240) * 0.04, 0.92, 0.60);
        sunflowers.push({ x: sx, z: sz, s: ss, yaw, petalCol });
      }

      // Tall pink cyclamen (rakafet) near the path.
      if (i % 6 === 1) {
        const offC = off + 1.2 + prand(i + 1510) * 2.2;
        const cx = p.x + left.x * offC * side + (prand(i + 1520) - 0.5) * 0.9;
        const cz = p.z + left.z * offC * side + (prand(i + 1530) - 0.5) * 0.9;
        const cs = 0.55 + prand(i + 1540) * 0.75;
        const yaw = prand(i + 1550) * Math.PI * 2;
        // Pink range.
        const hue = 0.92 + prand(i + 1560) * 0.08;
        const petalCol = new THREE.Color().setHSL(hue % 1, 0.78, 0.68);
        cyclamenStems.push({ x: cx, z: cz, s: cs, yaw });
        // Add 1-2 blooms per stem for richness.
        const blooms = prand(i + 1570) > 0.6 ? 2 : 1;
        for (let b = 0; b < blooms; b += 1) {
          const ox = (prand(i * 10 + b + 1580) - 0.5) * 0.22;
          const oz = (prand(i * 10 + b + 1590) - 0.5) * 0.22;
          const bs = cs * (0.85 + prand(i * 10 + b + 1600) * 0.25);
          const byaw = yaw + (prand(i * 10 + b + 1610) - 0.5) * 0.8;
          cyclamenPetals.push({ x: cx + ox, z: cz + oz, s: bs, yaw: byaw, petalCol });
        }
      }

      // Colorful gypsophila bouquets (small colorful clusters).
      if (i % 9 === 0) {
        const offG = off + 2.6 + prand(i + 1710) * 3.2;
        const gx = p.x + left.x * offG * side + (prand(i + 1720) - 0.5) * 1.1;
        const gz = p.z + left.z * offG * side + (prand(i + 1730) - 0.5) * 1.1;
        const baseS = 0.20 + prand(i + 1740) * 0.22;
        const count = 10 + Math.floor(prand(i + 1750) * 14);
        for (let k = 0; k < count; k += 1) {
          const ox = (prand(i * 50 + k + 1760) - 0.5) * 0.85;
          const oz = (prand(i * 50 + k + 1770) - 0.5) * 0.85;
          const s = baseS * (0.55 + prand(i * 50 + k + 1780) * 0.8);
          const hue = prand(i * 50 + k + 1790);
          // Pastel-ish palette.
          const col = new THREE.Color().setHSL(hue, 0.65, 0.76);
          gypsophila.push({ x: gx + ox, z: gz + oz, s, col });
        }
      }

      // Roses (red/pink clusters).
      if (prand(i + 1310) > 0.25) {
        const offR = off + 1.0 + prand(i + 1320) * 1.6;
        const rx = p.x + left.x * offR * side + (prand(i + 1330) - 0.5) * 0.8;
        const rz = p.z + left.z * offR * side + (prand(i + 1340) - 0.5) * 0.8;
        const baseS = 0.30 + prand(i + 1350) * 0.38;
        const bloomCount = 5 + Math.floor(prand(i + 1355) * 6);
        for (let b = 0; b < bloomCount; b += 1) {
          const ox = (prand(i * 100 + b + 1360) - 0.5) * 0.55;
          const oz = (prand(i * 100 + b + 1370) - 0.5) * 0.55;
          const rs = baseS * (0.55 + prand(i * 100 + b + 1380) * 0.55);
          const hue = prand(i * 100 + b + 1390) > 0.55 ? 0.98 : 0.01; // pinkish or red
          const sat = 0.78 + prand(i * 100 + b + 1400) * 0.18;
          const light = 0.42 + prand(i * 100 + b + 1410) * 0.20;
          const col = new THREE.Color().setHSL(hue % 1, Math.min(1, sat), Math.min(0.68, light));
          roseBlooms.push({ x: rx + ox, z: rz + oz, s: rs, col });
        }

        const leafCount = 3 + Math.floor(prand(i + 1420) * 4);
        for (let l = 0; l < leafCount; l += 1) {
          const ox = (prand(i * 50 + l + 1430) - 0.5) * 0.85;
          const oz = (prand(i * 50 + l + 1440) - 0.5) * 0.85;
          const ls = baseS * (0.55 + prand(i * 50 + l + 1450) * 0.55);
          const hue = 0.28 + prand(i * 50 + l + 1460) * 0.08;
          const col = new THREE.Color().setHSL(hue, 0.70, 0.34 + prand(i * 50 + l + 1470) * 0.12);
          roseLeaves.push({ x: rx + ox, z: rz + oz, s: ls, col });
        }
      }

      // Mushrooms near bushes (sporadic).
      if (prand(i + 1004) > 0.72) {
        const mx = x + (prand(i + 1010) - 0.5) * 1.2;
        const mz = z + (prand(i + 1015) - 0.5) * 1.2;
        const ms = 0.16 + prand(i + 1020) * 0.18;
        mushrooms.push({ x: mx, z: mz, s: ms });
      }

      // Tufts of taller grass (lots of small variety close to the path).
      if (prand(i + 1111) > 0.22) {
        const gx = x + (prand(i + 1120) - 0.5) * 1.6;
        const gz = z + (prand(i + 1130) - 0.5) * 1.6;
        const gs = 0.22 + prand(i + 1140) * 0.38;
        const hue = 0.27 + prand(i + 1150) * 0.10;
        const col = new THREE.Color().setHSL(hue, 0.65, 0.46 + prand(i + 1160) * 0.14);
        grassClumps.push({ x: gx, z: gz, s: gs, col });
      }
    }

    // Rocks scattered around (low profile, helps break repetition).
    for (let i = 0; i < 120; i += 1) {
      const x = (prand(i + 5000) - 0.5) * bounds * 2;
      const z = (prand(i + 5100) - 0.5) * bounds * 2;
      const d2 = curvePts2.length ? minDist2ToCurve(x, z) : 999;
      if (d2 < (clearance + 0.8) * (clearance + 0.8)) continue;
      if (x * x + z * z < 16) continue;
      const s = 0.22 + prand(i + 5200) * 0.55;
      rocks.push({ x, z, s });
    }

    // Single lake in the middle.
    const lake = {
      x: 0,
      z: 0,
      rx: 6.2,
      rz: 4.8,
      yaw: 0,
    };

    // Extra rose patches for a richer look.
    for (let i = 0; i < 120; i += 1) {
      if (!curveData?.curve) break;
      const t = prand(i + 9000);
      const p = curveData.curve.getPointAt(t);
      const tan = curveData.curve.getTangentAt(t);
      tan.y = 0;
      tan.normalize();
      const left = new THREE.Vector3(0, 1, 0).cross(tan).normalize();
      const side = prand(i + 9050) > 0.5 ? 1 : -1;
      const off = 3.8 + prand(i + 9100) * 3.2;
      const rx = p.x + left.x * off * side + (prand(i + 9200) - 0.5) * 1.2;
      const rz = p.z + left.z * off * side + (prand(i + 9300) - 0.5) * 1.2;
      const baseS = 0.30 + prand(i + 9400) * 0.42;
      const bloomCount = 6 + Math.floor(prand(i + 9500) * 8);
      for (let b = 0; b < bloomCount; b += 1) {
        const ox = (prand(i * 100 + b + 9600) - 0.5) * 0.7;
        const oz = (prand(i * 100 + b + 9700) - 0.5) * 0.7;
        const rs = baseS * (0.55 + prand(i * 100 + b + 9800) * 0.55);
        const hue = prand(i * 100 + b + 9900) > 0.55 ? 0.98 : 0.01;
        const sat = 0.80 + prand(i * 100 + b + 9950) * 0.18;
        const light = 0.40 + prand(i * 100 + b + 9960) * 0.20;
        const col = new THREE.Color().setHSL(hue % 1, Math.min(1, sat), Math.min(0.66, light));
        roseBlooms.push({ x: rx + ox, z: rz + oz, s: rs, col });
      }
      const leafCount = 4 + Math.floor(prand(i + 9970) * 4);
      for (let l = 0; l < leafCount; l += 1) {
        const ox = (prand(i * 50 + l + 9980) - 0.5) * 1.05;
        const oz = (prand(i * 50 + l + 9990) - 0.5) * 1.05;
        const ls = baseS * (0.55 + prand(i * 50 + l + 10010) * 0.55);
        const hue = 0.28 + prand(i * 50 + l + 10020) * 0.08;
        const col = new THREE.Color().setHSL(hue, 0.72, 0.34 + prand(i * 50 + l + 10030) * 0.12);
        roseLeaves.push({ x: rx + ox, z: rz + oz, s: ls, col });
      }
    }

    // 5 ducks on the lake.
    for (let k = 0; k < 5; k += 1) {
      const a = (k / 5) * Math.PI * 2 + 0.35;
      const r = 0.38 + prand(k + 20000) * 0.10;
      const x = lake.x + Math.cos(a) * lake.rx * r;
      const z = lake.z + Math.sin(a) * lake.rz * r;
      const yaw = -a + Math.PI / 2;
      const s = 0.7 + prand(k + 20010) * 0.25;
      ducks.push({ x, z, yaw, s });
    }

    return {
      pines,
      rounds,
      birches,
      palms,
      palmFronds,
      bushes,
      flowers,
      mushrooms,
      grassClumps,
      rocks,
      sunflowers,
      roseBlooms,
      roseLeaves,
      cyclamenStems,
      cyclamenPetals,
      gypsophila,
      lake,
      ducks,
    };
  }, [curveData, pathPoints, TREE_COLOR_REV]);

  const trunkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        vertexColors: true,
        roughness: 0.95,
        metalness: 0,
      }),
    []
  );

  const birchMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        vertexColors: true,
        roughness: 0.95,
        metalness: 0,
      }),
    []
  );

  const leafMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        vertexColors: true,
        emissive: new THREE.Color('#1fff63'),
        emissiveIntensity: 0.10,
        roughness: 0.85,
        metalness: 0,
      }),
    []
  );

  const roundLeafMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        vertexColors: true,
        emissive: new THREE.Color('#1fff63'),
        emissiveIntensity: 0.10,
        roughness: 0.86,
        metalness: 0,
      }),
    []
  );

  const bushMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2e8a3e',
        roughness: 0.9,
        metalness: 0,
      }),
    []
  );

  const flowerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ff7eb6',
        vertexColors: true,
        roughness: 0.7,
        metalness: 0,
      }),
    []
  );

  const mushroomCapMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d14b4b',
        roughness: 0.85,
        metalness: 0,
      }),
    []
  );

  const mushroomStemMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f1eadf',
        roughness: 0.9,
        metalness: 0,
      }),
    []
  );

  const palmTrunkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8a5a33',
        roughness: 0.96,
        metalness: 0,
      }),
    []
  );

  const palmLeafMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#7df2a0',
        vertexColors: true,
        roughness: 0.82,
        metalness: 0,
      }),
    []
  );

  const grassClumpMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5fda77',
        vertexColors: true,
        roughness: 0.9,
        metalness: 0,
      }),
    []
  );

  const rockMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#6a6d70',
        roughness: 0.95,
        metalness: 0,
      }),
    []
  );

  const sunflowerStemMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2f8a3b',
        roughness: 0.92,
        metalness: 0,
      }),
    []
  );

  const sunflowerPetalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffd84d',
        vertexColors: true,
        roughness: 0.65,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    []
  );

  const sunflowerCenterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5a3a1a',
        roughness: 0.85,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    []
  );

  const roseMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ff2d55',
        vertexColors: true,
        roughness: 0.72,
        metalness: 0,
      }),
    []
  );

  const roseLeafMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2f8a3b',
        vertexColors: true,
        roughness: 0.88,
        metalness: 0,
      }),
    []
  );

  const cyclamenStemMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2f8a3b',
        roughness: 0.92,
        metalness: 0,
      }),
    []
  );

  const cyclamenPetalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ff7ac8',
        vertexColors: true,
        roughness: 0.62,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    []
  );

  const gypsophilaMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        vertexColors: true,
        roughness: 0.7,
        metalness: 0,
      }),
    []
  );

  const waterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#67d5ff',
        transparent: true,
        opacity: 0.72,
        roughness: 0.06,
        metalness: 0.12,
      }),
    []
  );

  const duckBodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffd54a',
        roughness: 0.7,
        metalness: 0,
      }),
    []
  );

  const duckBeakMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ff8a2a',
        roughness: 0.75,
        metalness: 0,
      }),
    []
  );

  const duckEyeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#111827',
        roughness: 0.85,
        metalness: 0,
      }),
    []
  );

  const pineTrunkRef = useRef(null);
  const pineCanopyRef = useRef(null);
  const roundTrunkRef = useRef(null);
  const roundCanopyRef = useRef(null);
  const birchTrunkRef = useRef(null);
  const birchCanopyRef = useRef(null);
  const palmTrunkRef = useRef(null);
  const palmFrondRef = useRef(null);
  const bushRef = useRef(null);
  const flowerRef = useRef(null);
  const mushroomCapRef = useRef(null);
  const mushroomStemRef = useRef(null);
  const grassClumpRef = useRef(null);
  const rockRef = useRef(null);
  const sunflowerStemRef = useRef(null);
  const sunflowerPetalRef = useRef(null);
  const sunflowerCenterRef = useRef(null);
  const roseBloomRef = useRef(null);
  const roseLeafRef = useRef(null);
  const cyclamenStemRef = useRef(null);
  const cyclamenPetalRef = useRef(null);
  const gypsophilaRef = useRef(null);

  useEffect(() => {
    const pineTrunks = pineTrunkRef.current;
    const pineCanopies = pineCanopyRef.current;
    const roundTrunks = roundTrunkRef.current;
    const roundCanopies = roundCanopyRef.current;
    const birchTrunks = birchTrunkRef.current;
    const birchCanopies = birchCanopyRef.current;
    const palmTrunks = palmTrunkRef.current;
    const palmFrondsInst = palmFrondRef.current;
    const bushes = bushRef.current;
    const flowersInst = flowerRef.current;
    const mushCaps = mushroomCapRef.current;
    const mushStems = mushroomStemRef.current;
    const grassInst = grassClumpRef.current;
    const rocksInst = rockRef.current;
    const sunflowerStems = sunflowerStemRef.current;
    const sunflowerPetals = sunflowerPetalRef.current;
    const sunflowerCenters = sunflowerCenterRef.current;
    const roseBloomsInst = roseBloomRef.current;
    const roseLeavesInst = roseLeafRef.current;
    const cyclamenStemsInst = cyclamenStemRef.current;
    const cyclamenPetalsInst = cyclamenPetalRef.current;
    const gypsophilaInst = gypsophilaRef.current;

    if (!pineTrunks || !pineCanopies || !roundTrunks || !roundCanopies || !birchTrunks || !birchCanopies) return;

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    treeData.pines.forEach((t, idx) => {
      pos.set(t.x, floorY + 0.8 * t.s, t.z);
      quat.setFromEuler(new THREE.Euler(0, prand(idx + 600) * Math.PI * 2, 0));
      scale.set(1 * t.s, 1.25 * t.s, 1 * t.s);
      m.compose(pos, quat, scale);
      pineTrunks.setMatrixAt(idx, m);
      if (t.trunkCol) pineTrunks.setColorAt(idx, t.trunkCol);

      pos.set(t.x, floorY + (1.95 + prand(idx + 800) * 0.25) * t.s, t.z);
      scale.set(1.0 * t.s, 1.45 * t.s, 1.0 * t.s);
      m.compose(pos, quat, scale);
      pineCanopies.setMatrixAt(idx, m);
      pineCanopies.setColorAt(idx, t.leafCol);
    });

    treeData.rounds.forEach((t, idx) => {
      pos.set(t.x, floorY + 0.65 * t.s, t.z);
      quat.setFromEuler(new THREE.Euler(0, prand(idx + 1600) * Math.PI * 2, 0));
      scale.set(0.9 * t.s, 1.05 * t.s, 0.9 * t.s);
      m.compose(pos, quat, scale);
      roundTrunks.setMatrixAt(idx, m);
      if (t.trunkCol) roundTrunks.setColorAt(idx, t.trunkCol);

      pos.set(t.x, floorY + (1.55 + prand(idx + 1800) * 0.35) * t.s, t.z);
      scale.set(1.25 * t.s, 1.15 * t.s, 1.25 * t.s);
      m.compose(pos, quat, scale);
      roundCanopies.setMatrixAt(idx, m);
      roundCanopies.setColorAt(idx, t.leafCol);
    });

    treeData.birches.forEach((t, idx) => {
      pos.set(t.x, floorY + 0.9 * t.s, t.z);
      quat.setFromEuler(new THREE.Euler(0, prand(idx + 2600) * Math.PI * 2, 0));
      scale.set(0.55 * t.s, 1.6 * t.s, 0.55 * t.s);
      m.compose(pos, quat, scale);
      birchTrunks.setMatrixAt(idx, m);
      if (t.trunkCol) birchTrunks.setColorAt(idx, t.trunkCol);

      pos.set(t.x, floorY + (2.05 + prand(idx + 2800) * 0.35) * t.s, t.z);
      scale.set(0.95 * t.s, 0.85 * t.s, 0.95 * t.s);
      m.compose(pos, quat, scale);
      birchCanopies.setMatrixAt(idx, m);
      birchCanopies.setColorAt(idx, t.leafCol);
    });

    pineTrunks.instanceMatrix.needsUpdate = true;
    pineCanopies.instanceMatrix.needsUpdate = true;
    roundTrunks.instanceMatrix.needsUpdate = true;
    roundCanopies.instanceMatrix.needsUpdate = true;
    birchTrunks.instanceMatrix.needsUpdate = true;
    birchCanopies.instanceMatrix.needsUpdate = true;

    if (pineTrunks.instanceColor) pineTrunks.instanceColor.needsUpdate = true;
    if (pineCanopies.instanceColor) pineCanopies.instanceColor.needsUpdate = true;
    if (roundTrunks.instanceColor) roundTrunks.instanceColor.needsUpdate = true;
    if (roundCanopies.instanceColor) roundCanopies.instanceColor.needsUpdate = true;
    if (birchTrunks.instanceColor) birchTrunks.instanceColor.needsUpdate = true;
    if (birchCanopies.instanceColor) birchCanopies.instanceColor.needsUpdate = true;

    if (bushes) {
      treeData.bushes.forEach((b, idx) => {
        pos.set(b.x, floorY + 0.22 * b.s, b.z);
        quat.setFromEuler(new THREE.Euler(0, prand(idx + 1100) * Math.PI * 2, 0));
        scale.set(1.1 * b.s, 0.6 * b.s, 1.1 * b.s);
        m.compose(pos, quat, scale);
        bushes.setMatrixAt(idx, m);
      });
      bushes.instanceMatrix.needsUpdate = true;
    }

    if (palmTrunks) {
      treeData.palms.forEach((p, idx) => {
        pos.set(p.x, floorY + (p.trunkH * p.s) * 0.5, p.z);
        // Keep trunks perfectly upright.
        quat.setFromEuler(new THREE.Euler(0, p.yaw, 0));
        scale.set(0.18 * p.s, p.trunkH * p.s, 0.18 * p.s);
        m.compose(pos, quat, scale);
        palmTrunks.setMatrixAt(idx, m);
      });
      palmTrunks.instanceMatrix.needsUpdate = true;
    }

    if (palmFrondsInst) {
      treeData.palmFronds.forEach((f, idx) => {
        pos.set(f.x, floorY + f.trunkH * f.s + 0.25 * f.s, f.z);
        quat.setFromEuler(new THREE.Euler(-f.pitch, f.yaw, 0));
        scale.set(1.25 * f.s, 0.55 * f.s, 1.25 * f.s);
        m.compose(pos, quat, scale);
        palmFrondsInst.setMatrixAt(idx, m);
        palmFrondsInst.setColorAt(idx, f.col);
      });
      palmFrondsInst.instanceMatrix.needsUpdate = true;
      if (palmFrondsInst.instanceColor) palmFrondsInst.instanceColor.needsUpdate = true;
    }

    if (flowersInst) {
      treeData.flowers.forEach((f, idx) => {
        pos.set(f.x, floorY + 0.06, f.z);
        quat.setFromEuler(new THREE.Euler(0, prand(idx + 3100) * Math.PI * 2, 0));
        scale.set(1 * f.s, 1 * f.s, 1 * f.s);
        m.compose(pos, quat, scale);
        flowersInst.setMatrixAt(idx, m);
        flowersInst.setColorAt(idx, f.col);
      });
      flowersInst.instanceMatrix.needsUpdate = true;
      if (flowersInst.instanceColor) flowersInst.instanceColor.needsUpdate = true;
    }

    if (mushCaps && mushStems) {
      treeData.mushrooms.forEach((mm, idx) => {
        const rot = prand(idx + 4100) * Math.PI * 2;
        quat.setFromEuler(new THREE.Euler(0, rot, 0));

        // Stem
        pos.set(mm.x, floorY + 0.08 * mm.s, mm.z);
        scale.set(0.7 * mm.s, 1.0 * mm.s, 0.7 * mm.s);
        m.compose(pos, quat, scale);
        mushStems.setMatrixAt(idx, m);

        // Cap
        pos.set(mm.x, floorY + 0.16 * mm.s, mm.z);
        scale.set(1.0 * mm.s, 0.55 * mm.s, 1.0 * mm.s);
        m.compose(pos, quat, scale);
        mushCaps.setMatrixAt(idx, m);
      });
      mushCaps.instanceMatrix.needsUpdate = true;
      mushStems.instanceMatrix.needsUpdate = true;
    }

    if (grassInst) {
      treeData.grassClumps.forEach((g, idx) => {
        pos.set(g.x, floorY + 0.05, g.z);
        quat.setFromEuler(new THREE.Euler(0, prand(idx + 7100) * Math.PI * 2, 0));
        scale.set(1.0 * g.s, 1.0 * g.s, 1.0 * g.s);
        m.compose(pos, quat, scale);
        grassInst.setMatrixAt(idx, m);
        grassInst.setColorAt(idx, g.col);
      });
      grassInst.instanceMatrix.needsUpdate = true;
      if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
    }

    if (rocksInst) {
      treeData.rocks.forEach((r, idx) => {
        pos.set(r.x, floorY + 0.06 * r.s, r.z);
        quat.setFromEuler(new THREE.Euler((prand(idx + 8200) - 0.5) * 0.3, prand(idx + 8300) * Math.PI * 2, (prand(idx + 8400) - 0.5) * 0.3));
        scale.set(1.0 * r.s, 0.65 * r.s, 1.0 * r.s);
        m.compose(pos, quat, scale);
        rocksInst.setMatrixAt(idx, m);
      });
      rocksInst.instanceMatrix.needsUpdate = true;
    }

    if (sunflowerStems && sunflowerPetals && sunflowerCenters) {
      treeData.sunflowers.forEach((sf, idx) => {
        // Stem
        pos.set(sf.x, floorY + 0.28 * sf.s, sf.z);
        quat.setFromEuler(new THREE.Euler(0, sf.yaw, 0));
        scale.set(0.08 * sf.s, 0.56 * sf.s, 0.08 * sf.s);
        m.compose(pos, quat, scale);
        sunflowerStems.setMatrixAt(idx, m);

        // Petals + center (flat discs facing up)
        const headY = floorY + 0.58 * sf.s + 0.02;
        quat.setFromEuler(new THREE.Euler(-Math.PI / 2, sf.yaw, 0));

        pos.set(sf.x, headY, sf.z);
        scale.set(0.36 * sf.s, 0.36 * sf.s, 0.36 * sf.s);
        m.compose(pos, quat, scale);
        sunflowerPetals.setMatrixAt(idx, m);
        sunflowerPetals.setColorAt(idx, sf.petalCol);

        pos.set(sf.x, headY + 0.005, sf.z);
        scale.set(0.20 * sf.s, 0.20 * sf.s, 0.20 * sf.s);
        m.compose(pos, quat, scale);
        sunflowerCenters.setMatrixAt(idx, m);
      });
      sunflowerStems.instanceMatrix.needsUpdate = true;
      sunflowerPetals.instanceMatrix.needsUpdate = true;
      sunflowerCenters.instanceMatrix.needsUpdate = true;
      if (sunflowerPetals.instanceColor) sunflowerPetals.instanceColor.needsUpdate = true;
    }

    if (roseBloomsInst) {
      treeData.roseBlooms.forEach((r, idx) => {
        pos.set(r.x, floorY + 0.08, r.z);
        quat.setFromEuler(new THREE.Euler(0, prand(idx + 9100) * Math.PI * 2, 0));
        scale.set(0.30 * r.s, 0.26 * r.s, 0.30 * r.s);
        m.compose(pos, quat, scale);
        roseBloomsInst.setMatrixAt(idx, m);
        roseBloomsInst.setColorAt(idx, r.col);
      });
      roseBloomsInst.instanceMatrix.needsUpdate = true;
      if (roseBloomsInst.instanceColor) roseBloomsInst.instanceColor.needsUpdate = true;
    }

    if (roseLeavesInst) {
      treeData.roseLeaves.forEach((r, idx) => {
        pos.set(r.x, floorY + 0.05, r.z);
        quat.setFromEuler(new THREE.Euler(0, prand(idx + 11100) * Math.PI * 2, 0));
        scale.set(0.34 * r.s, 0.18 * r.s, 0.34 * r.s);
        m.compose(pos, quat, scale);
        roseLeavesInst.setMatrixAt(idx, m);
        roseLeavesInst.setColorAt(idx, r.col);
      });
      roseLeavesInst.instanceMatrix.needsUpdate = true;
      if (roseLeavesInst.instanceColor) roseLeavesInst.instanceColor.needsUpdate = true;
    }

    if (cyclamenStemsInst) {
      treeData.cyclamenStems.forEach((c, idx) => {
        pos.set(c.x, floorY + 0.60 * c.s, c.z);
        quat.setFromEuler(new THREE.Euler(0, c.yaw, 0));
        scale.set(0.06 * c.s, 1.20 * c.s, 0.06 * c.s);
        m.compose(pos, quat, scale);
        cyclamenStemsInst.setMatrixAt(idx, m);
      });
      cyclamenStemsInst.instanceMatrix.needsUpdate = true;
    }

    if (cyclamenPetalsInst) {
      treeData.cyclamenPetals.forEach((c, idx) => {
        // Petals cluster, slightly tilted forward.
        const headY = floorY + 1.28 * c.s + 0.02;
        pos.set(c.x, headY, c.z);
        quat.setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.35, c.yaw, 0));
        scale.set(0.28 * c.s, 0.28 * c.s, 0.28 * c.s);
        m.compose(pos, quat, scale);
        cyclamenPetalsInst.setMatrixAt(idx, m);
        cyclamenPetalsInst.setColorAt(idx, c.petalCol);
      });
      cyclamenPetalsInst.instanceMatrix.needsUpdate = true;
      if (cyclamenPetalsInst.instanceColor) cyclamenPetalsInst.instanceColor.needsUpdate = true;
    }

    if (gypsophilaInst) {
      treeData.gypsophila.forEach((g, idx) => {
        pos.set(g.x, floorY + 0.08 + 0.02 * prand(idx + 12100), g.z);
        quat.setFromEuler(new THREE.Euler(0, prand(idx + 12200) * Math.PI * 2, 0));
        scale.set(0.22 * g.s, 0.22 * g.s, 0.22 * g.s);
        m.compose(pos, quat, scale);
        gypsophilaInst.setMatrixAt(idx, m);
        gypsophilaInst.setColorAt(idx, g.col);
      });
      gypsophilaInst.instanceMatrix.needsUpdate = true;
      if (gypsophilaInst.instanceColor) gypsophilaInst.instanceColor.needsUpdate = true;
    }

  }, [treeData, floorY]);

  return (
    <group>
      {/* Grass ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]} receiveShadow>
        <planeGeometry args={[140, 140, 1, 1]} />
        <meshStandardMaterial
          color={'#43c75a'}
          map={grassTex || undefined}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Dirt path */}
      {pathGeo ? (
        <mesh geometry={pathGeo} receiveShadow>
          <meshStandardMaterial color={'#a58b63'} roughness={0.95} metalness={0} />
        </mesh>
      ) : null}

      {/* Water (single lake + ducks) */}
      {treeData.lake ? (
        <group>
          <mesh
            rotation={[-Math.PI / 2, treeData.lake.yaw, 0]}
            position={[treeData.lake.x, floorY + 0.031, treeData.lake.z]}
            scale={[treeData.lake.rx, treeData.lake.rz, 1]}
            receiveShadow
          >
            <circleGeometry args={[1, 48]} />
            <primitive object={waterMat} attach="material" />
          </mesh>

          {/* Sun glint reflection */}
          {lakeGlintTex ? (
            <mesh
              rotation={[-Math.PI / 2, treeData.lake.yaw + 0.35, 0]}
              position={[treeData.lake.x, floorY + 0.033, treeData.lake.z]}
              scale={[treeData.lake.rx * 0.72, treeData.lake.rz * 0.34, 1]}
              renderOrder={5}
            >
              <circleGeometry args={[1, 48]} />
              <meshBasicMaterial
                map={lakeGlintTex}
                transparent
                opacity={0.55}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          ) : null}

          {/* Subtle rainbow arc on the lake */}
          {rainbowTex ? (
            <mesh
              rotation={[-Math.PI / 2, treeData.lake.yaw - 0.15, 0]}
              position={[treeData.lake.x, floorY + 0.034, treeData.lake.z]}
              scale={[treeData.lake.rx * 0.92, treeData.lake.rz * 0.92, 1]}
              renderOrder={6}
            >
              <ringGeometry args={[0.62, 1.0, 96, 1, Math.PI * 0.05, Math.PI * 0.80]} />
              <meshBasicMaterial
                map={rainbowTex}
                transparent
                opacity={0.22}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          ) : null}

          {treeData.ducks?.map((d, idx) => (
            <group key={`duck-${idx}`} position={[d.x, floorY + 0.055, d.z]} rotation={[0, d.yaw, 0]} scale={[d.s, d.s, d.s]}>
              {/* body */}
              <mesh castShadow>
                <sphereGeometry args={[0.22, 14, 12]} />
                <primitive object={duckBodyMat} attach="material" />
              </mesh>
              {/* head */}
              <mesh position={[0.16, 0.12, 0]} castShadow>
                <sphereGeometry args={[0.14, 14, 12]} />
                <primitive object={duckBodyMat} attach="material" />
              </mesh>
              {/* beak */}
              <mesh position={[0.30, 0.10, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <coneGeometry args={[0.055, 0.10, 10, 1]} />
                <primitive object={duckBeakMat} attach="material" />
              </mesh>
              {/* eyes */}
              <mesh position={[0.20, 0.16, 0.06]} castShadow>
                <sphereGeometry args={[0.02, 8, 8]} />
                <primitive object={duckEyeMat} attach="material" />
              </mesh>
              <mesh position={[0.20, 0.16, -0.06]} castShadow>
                <sphereGeometry args={[0.02, 8, 8]} />
                <primitive object={duckEyeMat} attach="material" />
              </mesh>
            </group>
          ))}
        </group>
      ) : null}

      {/* Trees (variety) */}
      <instancedMesh ref={pineTrunkRef} args={[null, null, treeData.pines.length]} castShadow receiveShadow frustumCulled={false}>
        <cylinderGeometry args={[0.16, 0.22, 1.7, 7, 1]} />
        <primitive object={trunkMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={pineCanopyRef} args={[null, null, treeData.pines.length]} castShadow frustumCulled={false}>
        <coneGeometry args={[0.95, 2.35, 10, 1]} />
        <primitive object={leafMat} attach="material" />
      </instancedMesh>

      <instancedMesh ref={roundTrunkRef} args={[null, null, treeData.rounds.length]} castShadow receiveShadow frustumCulled={false}>
        <cylinderGeometry args={[0.14, 0.2, 1.35, 7, 1]} />
        <primitive object={trunkMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={roundCanopyRef} args={[null, null, treeData.rounds.length]} castShadow frustumCulled={false}>
        <sphereGeometry args={[1.05, 12, 10]} />
        <primitive object={roundLeafMat} attach="material" />
      </instancedMesh>

      <instancedMesh ref={birchTrunkRef} args={[null, null, treeData.birches.length]} castShadow receiveShadow frustumCulled={false}>
        <cylinderGeometry args={[0.11, 0.16, 2.0, 8, 1]} />
        <primitive object={birchMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={birchCanopyRef} args={[null, null, treeData.birches.length]} castShadow frustumCulled={false}>
        <dodecahedronGeometry args={[0.85, 0]} />
        <primitive object={leafMat} attach="material" />
      </instancedMesh>

      {/* Palm trees (bright green) */}
      <instancedMesh ref={palmTrunkRef} args={[null, null, treeData.palms.length]} castShadow receiveShadow frustumCulled={false}>
        <cylinderGeometry args={[0.12, 0.14, 1.0, 9, 1]} />
        <primitive object={palmTrunkMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={palmFrondRef} args={[null, null, treeData.palmFronds.length]} castShadow receiveShadow frustumCulled={false}>
        {/* A flattened cone reads like a palm frond cluster from above */}
        <coneGeometry args={[1.0, 0.55, 8, 1]} />
        <primitive object={palmLeafMat} attach="material" />
      </instancedMesh>

      {/* Bushes near the path */}
      <instancedMesh ref={bushRef} args={[null, null, treeData.bushes.length]} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[0.45, 10, 8]} />
        <primitive object={bushMat} attach="material" />
      </instancedMesh>

      {/* Flowers */}
      <instancedMesh ref={flowerRef} args={[null, null, treeData.flowers.length]} castShadow receiveShadow frustumCulled={false}>
        <coneGeometry args={[0.08, 0.18, 6, 1]} />
        <primitive object={flowerMat} attach="material" />
      </instancedMesh>

      {/* Sunflowers */}
      <instancedMesh ref={sunflowerStemRef} args={[null, null, treeData.sunflowers.length]} castShadow receiveShadow frustumCulled={false}>
        <cylinderGeometry args={[0.06, 0.06, 1.0, 7, 1]} />
        <primitive object={sunflowerStemMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={sunflowerPetalRef} args={[null, null, treeData.sunflowers.length]} castShadow receiveShadow frustumCulled={false}>
        <circleGeometry args={[1.0, 12]} />
        <primitive object={sunflowerPetalMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={sunflowerCenterRef} args={[null, null, treeData.sunflowers.length]} castShadow receiveShadow frustumCulled={false}>
        <circleGeometry args={[1.0, 12]} />
        <primitive object={sunflowerCenterMat} attach="material" />
      </instancedMesh>

      {/* Roses */}
      <instancedMesh ref={roseLeafRef} args={[null, null, treeData.roseLeaves.length]} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[0.26, 10, 8]} />
        <primitive object={roseLeafMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={roseBloomRef} args={[null, null, treeData.roseBlooms.length]} castShadow receiveShadow frustumCulled={false}>
        <icosahedronGeometry args={[0.22, 1]} />
        <primitive object={roseMat} attach="material" />
      </instancedMesh>

      {/* Cyclamen (pink, tall) */}
      <instancedMesh ref={cyclamenStemRef} args={[null, null, treeData.cyclamenStems.length]} castShadow receiveShadow frustumCulled={false}>
        <cylinderGeometry args={[0.05, 0.05, 1.0, 7, 1]} />
        <primitive object={cyclamenStemMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={cyclamenPetalRef} args={[null, null, treeData.cyclamenPetals.length]} castShadow receiveShadow frustumCulled={false}>
        <circleGeometry args={[1.0, 14]} />
        <primitive object={cyclamenPetalMat} attach="material" />
      </instancedMesh>

      {/* Gypsophila (colorful bouquets) */}
      <instancedMesh ref={gypsophilaRef} args={[null, null, treeData.gypsophila.length]} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[0.18, 8, 7]} />
        <primitive object={gypsophilaMat} attach="material" />
      </instancedMesh>

      {/* Taller grass clumps */}
      <instancedMesh ref={grassClumpRef} args={[null, null, treeData.grassClumps.length]} castShadow receiveShadow frustumCulled={false}>
        <coneGeometry args={[0.14, 0.55, 6, 1]} />
        <primitive object={grassClumpMat} attach="material" />
      </instancedMesh>

      {/* Rocks */}
      <instancedMesh ref={rockRef} args={[null, null, treeData.rocks.length]} castShadow receiveShadow frustumCulled={false}>
        <dodecahedronGeometry args={[0.32, 0]} />
        <primitive object={rockMat} attach="material" />
      </instancedMesh>

      {/* Mushrooms */}
      <instancedMesh ref={mushroomStemRef} args={[null, null, treeData.mushrooms.length]} castShadow receiveShadow frustumCulled={false}>
        <cylinderGeometry args={[0.05, 0.06, 0.18, 8, 1]} />
        <primitive object={mushroomStemMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={mushroomCapRef} args={[null, null, treeData.mushrooms.length]} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[0.10, 10, 8]} />
        <primitive object={mushroomCapMat} attach="material" />
      </instancedMesh>
    </group>
  );
}

ForestWorld.propTypes = {
  floorY: PropTypes.number.isRequired,
  curveData: PropTypes.shape({
    curve: PropTypes.any,
  }),
};

export function RobotEyeCamera({ targetRef, enabled = true }) {
  const { camera } = useThree();
  // Tuned for the hiker character proportions (slightly lower than the old robot).
  const eyeOffset = useMemo(() => new THREE.Vector3(0, 1.88, 0.20), []);
  const lookOffset = useMemo(() => new THREE.Vector3(0, 1.82, 3.6), []);

  const eyeWorld = useRef(new THREE.Vector3());
  const lookWorld = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!enabled) return;
    camera.near = 0.05;
    camera.far = 420;
    camera.fov = 72;
    camera.updateProjectionMatrix();
  }, [camera, enabled]);

  useFrame((_, delta) => {
    if (!enabled) return;
    const robot = targetRef?.current;
    if (!robot) return;

    // Eye position in world space (robot-local offset).
    tmp.current.copy(eyeOffset).applyQuaternion(robot.quaternion);
    eyeWorld.current.copy(robot.position).add(tmp.current);

    tmp.current.copy(lookOffset).applyQuaternion(robot.quaternion);
    lookWorld.current.copy(robot.position).add(tmp.current);

    const a = 1 - Math.exp(-delta * 18);
    camera.position.lerp(eyeWorld.current, a);
    camera.lookAt(lookWorld.current);
  });

  return null;
}

RobotEyeCamera.propTypes = {
  targetRef: PropTypes.shape({ current: PropTypes.any }),
  enabled: PropTypes.bool,
};

function ForestPOI({ kind, position, completed, iconTexture, onNavigate }) {
  const ringRef = useRef(null);
  const signRef = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const r = ringRef.current;
    if (r) {
      const s = 1 + 0.06 * Math.sin(t * 3.2);
      r.scale.setScalar(s);
      r.rotation.y = t * 0.6;
      const m = r.material;
      if (m && m.opacity != null) m.opacity = completed ? 0.25 : 0.33;
    }
    const s = signRef.current;
    if (s) {
      s.position.y = 1.75 + Math.sin(t * 2.6) * 0.06;
      s.rotation.y = t * 0.4;
    }
  });

  const onClick = () => {
    if (typeof onNavigate === 'function') onNavigate(kind);
  };

  const base = completed ? '#2e7d32' : '#2b5ea8';

  return (
    <group
      position={position}
      onPointerDown={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.85, 1.22, 44]} />
        <meshBasicMaterial color={base} transparent opacity={0.33} depthWrite={false} />
      </mesh>

      {/* Landmark */}
      {kind === 'password' ? (
        // Cozy cabin
        <group>
          <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 0.9, 1.2]} />
            <meshStandardMaterial color={'#8d6e63'} roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.2, 0]} castShadow>
            <coneGeometry args={[1.1, 0.7, 18]} />
            <meshStandardMaterial color={'#6d4c41'} roughness={0.92} />
          </mesh>
          <mesh position={[0.35, 0.45, 0.62]} castShadow>
            <boxGeometry args={[0.26, 0.36, 0.05]} />
            <meshStandardMaterial color={'#5d4037'} roughness={0.95} />
          </mesh>
          <mesh position={[-0.35, 0.62, 0.62]} castShadow>
            <boxGeometry args={[0.28, 0.24, 0.05]} />
            <meshStandardMaterial color={'#90caf9'} roughness={0.35} metalness={0.05} />
          </mesh>
        </group>
      ) : null}

      {kind === 'privacy' ? (
        // Small pond
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
            <circleGeometry args={[1.05, 32]} />
            <meshStandardMaterial
              color={'#7ec8ff'}
              roughness={0.15}
              metalness={0}
              transparent
              opacity={0.72}
            />
          </mesh>
          <mesh position={[0.0, 0.22, -0.55]} castShadow>
            <sphereGeometry args={[0.22, 12, 10]} />
            <meshStandardMaterial color={'#66bb6a'} roughness={0.9} />
          </mesh>
          <mesh position={[0.45, 0.18, 0.35]} castShadow>
            <sphereGeometry args={[0.18, 12, 10]} />
            <meshStandardMaterial color={'#66bb6a'} roughness={0.9} />
          </mesh>
        </group>
      ) : null}

      {kind === 'shop' ? (
        // Little hiking camp stall
        <group>
          <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.9, 0.9, 0.8, 16]} />
            <meshStandardMaterial color={'#f3e5ab'} roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.1, 0]} castShadow>
            <coneGeometry args={[1.05, 0.75, 18]} />
            <meshStandardMaterial color={'#ef9a9a'} roughness={0.85} />
          </mesh>
          <mesh position={[0.0, 1.55, 0.0]} castShadow>
            <boxGeometry args={[0.08, 0.55, 0.08]} />
            <meshStandardMaterial color={'#795548'} roughness={0.95} />
          </mesh>
          <mesh position={[0.0, 1.85, 0.0]} rotation={[0, 0, 0]} castShadow>
            <planeGeometry args={[0.6, 0.35]} />
            <meshStandardMaterial color={'#ffcc80'} roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : null}

      {/* Icon billboard */}
      {iconTexture ? (
        <group ref={signRef} position={[0, 1.75, 0]}>
          <mesh>
            <planeGeometry args={[1.05, 1.05]} />
            <meshBasicMaterial map={iconTexture} transparent opacity={0.95} depthWrite={false} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

ForestPOI.propTypes = {
  kind: PropTypes.oneOf(['password', 'privacy', 'shop']).isRequired,
  position: PropTypes.arrayOf(PropTypes.number).isRequired,
  completed: PropTypes.bool,
  iconTexture: PropTypes.any,
  onNavigate: PropTypes.func,
};

export function ForestPOIs({ floorY, nodes, completion, onNavigate }) {
  const icons = useMemo(() => {
    if (typeof document === 'undefined') return {};
    return {
      password: makePoiIconTexture({ emoji: '🏡', size: 320 }),
      privacy: makePoiIconTexture({ emoji: '🪷', size: 320 }),
      shop: makePoiIconTexture({ emoji: '⛺', size: 320 }),
    };
  }, []);

  if (!nodes) return null;

  const pw = nodes.password;
  const pr = nodes.privacy;
  const sh = nodes.shop;

  return (
    <group>
      {Array.isArray(pw) ? (
        <ForestPOI
          kind="password"
          position={[pw[0], floorY, pw[2]]}
          completed={Boolean(completion?.password)}
          iconTexture={icons.password}
          onNavigate={onNavigate}
        />
      ) : null}

      {Array.isArray(pr) ? (
        <ForestPOI
          kind="privacy"
          position={[pr[0], floorY, pr[2]]}
          completed={Boolean(completion?.privacy)}
          iconTexture={icons.privacy}
          onNavigate={onNavigate}
        />
      ) : null}

      {Array.isArray(sh) ? (
        <ForestPOI
          kind="shop"
          position={[sh[0], floorY, sh[2]]}
          completed={Boolean(completion?.shop)}
          iconTexture={icons.shop}
          onNavigate={onNavigate}
        />
      ) : null}
    </group>
  );
}

ForestPOIs.propTypes = {
  floorY: PropTypes.number.isRequired,
  nodes: PropTypes.object,
  completion: PropTypes.shape({
    password: PropTypes.bool,
    privacy: PropTypes.bool,
    shop: PropTypes.bool,
  }),
  onNavigate: PropTypes.func,
};
