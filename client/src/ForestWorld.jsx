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

  // Noise.
  for (let i = 0; i < 5000; i += 1) {
    const x = (i * 73) % size;
    const y = (i * 149) % size;
    const t = prand(i + 3);
    const c = t < 0.33 ? 'rgba(18,94,41,0.22)' : t < 0.66 ? 'rgba(62,155,77,0.18)' : 'rgba(145,214,120,0.12)';
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  }
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

function buildRibbonGeometry(points, { width = 2.6, y } = {}) {
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

    // If a constant `y` is provided, force the entire ribbon to that height.
    // Otherwise, follow the per-point height (so paths can climb terrain).
    const yy = Number.isFinite(y) ? y : p0.y;
    positions.push(lx, yy, lz, rx, yy, rz);

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

// Forest path tuning (shared between world + robot).
export const FOREST_PATH_SURFACE_LIFT = 0.18;
export const FOREST_PATH_RIBBON_LIFT = 0.19;
export const FOREST_PATH_DETAIL_LIFT = 0.195;

// These match the grassy mound meshes rendered in ForestWorld.
// Height is computed as the top surface of an ellipsoid (scaled sphere), then clamped to >= 0.
export const FOREST_TERRAIN_HILLS = Object.freeze([
  { x: -26, y: 0.55, z: 18, r: 16, sx: 1.35, sy: 0.09, sz: 1.35 },
  { x: 28, y: 0.45, z: -14, r: 18, sx: 1.25, sy: 0.08, sz: 1.25 },
  { x: 6, y: 0.38, z: 34, r: 14, sx: 1.2, sy: 0.075, sz: 1.2 },
  { x: -38, y: 0.42, z: -30, r: 15, sx: 1.18, sy: 0.08, sz: 1.18 },
  { x: 40, y: 0.35, z: 28, r: 13, sx: 1.12, sy: 0.065, sz: 1.12 },
]);

export function forestTerrainHeight(x, z) {
  let best = 0;
  for (let i = 0; i < FOREST_TERRAIN_HILLS.length; i += 1) {
    const h = FOREST_TERRAIN_HILLS[i];
    const X = (x - h.x) / (h.sx || 1);
    const Z = (z - h.z) / (h.sz || 1);
    const inside = (h.r * h.r) - (X * X) - (Z * Z);
    if (inside <= 0) continue;
    const ySurface = h.y + (h.sy || 1) * Math.sqrt(inside);
    if (ySurface > best) best = ySurface;
  }
  return Math.max(0, best);
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

function makeSoftShadowTexture({ size = 256 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;
  const g = ctx.createRadialGradient(cx, cy, r * 0.10, cx, cy, r);
  g.addColorStop(0, 'rgba(0,0,0,0.40)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.16)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}

function makeMirrorFakeTexture({ width = 512, height = 512 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Sky gradient.
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#bfe6ff');
  g.addColorStop(0.6, '#eaf8ff');
  g.addColorStop(1, '#d9ffe6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Soft "foliage" blobs (fake reflection).
  ctx.globalAlpha = 0.20;
  for (let i = 0; i < 38; i += 1) {
    const x = prand(i + 700) * width;
    const y = (0.35 + prand(i + 740) * 0.65) * height;
    const r = 30 + prand(i + 780) * 120;
    const hue = 0.25 + prand(i + 820) * 0.12;
    const col = new THREE.Color().setHSL(hue, 0.65, 0.42 + prand(i + 860) * 0.18);
    ctx.fillStyle = `rgba(${Math.floor(col.r * 255)},${Math.floor(col.g * 255)},${Math.floor(col.b * 255)},0.28)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Subtle vertical sheen.
  const sheen = ctx.createLinearGradient(0, 0, width, 0);
  sheen.addColorStop(0.0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.25, 'rgba(255,255,255,0.12)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  sheen.addColorStop(0.75, 'rgba(255,255,255,0.10)');
  sheen.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSoftCircleMaskTexture({ size = 256 } = {}) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.48;

  const g = ctx.createRadialGradient(cx, cy, r * 0.62, cx, cy, r);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
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

function smoothstep01(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function makeRoomSignTexture({ type = 'key', label = '', size = 256 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.30;

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Wood-ink look: single dark brown palette (no neon colors).
  const ink = 'rgba(42,26,16,0.92)';
  const inkFill = 'rgba(24,14,8,0.90)';

  ctx.lineWidth = size * 0.06;
  ctx.strokeStyle = ink;
  ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.shadowBlur = 0;

  if (type === 'privacy') {
    // Eye
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.05, r * 0.70, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = inkFill;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (type === 'key') {
    // Key
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy, r * 0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.02, cy);
    ctx.lineTo(cx + r * 0.95, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.45, cy);
    ctx.lineTo(cx + r * 0.45, cy + r * 0.25);
    ctx.moveTo(cx + r * 0.65, cy);
    ctx.lineTo(cx + r * 0.65, cy + r * 0.18);
    ctx.stroke();
  } else if (type === 'hub') {
    // Beacon / compass
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.95);
    ctx.lineTo(cx + r * 0.25, cy + r * 0.1);
    ctx.lineTo(cx, cy + r * 0.35);
    ctx.lineTo(cx - r * 0.25, cy + r * 0.1);
    ctx.closePath();
    ctx.fillStyle = inkFill;
    ctx.globalAlpha = 0.82;
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    // Shop: a t-shirt
    const w = r * 1.35;
    const h = r * 1.55;
    const x = cx - w / 2;
    const y = cy - h / 2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.22, y);
    ctx.lineTo(x + w * 0.02, y + h * 0.22);
    ctx.lineTo(x + w * 0.18, y + h * 0.34);
    ctx.lineTo(x + w * 0.18, y + h);
    ctx.lineTo(x + w * 0.82, y + h);
    ctx.lineTo(x + w * 0.82, y + h * 0.34);
    ctx.lineTo(x + w * 0.98, y + h * 0.22);
    ctx.lineTo(x + w * 0.78, y);
    ctx.quadraticCurveTo(cx, y + h * 0.28, x + w * 0.22, y);
    ctx.closePath();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.lineWidth = size * 0.03;
    ctx.strokeStyle = inkFill;
    ctx.globalAlpha = 0.82;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Minimal label (optional)
  if (label) {
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.fillStyle = ink;
    ctx.font = `700 ${Math.floor(size * 0.11)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.92;
    ctx.fillText(label, cx, size * 0.86);
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function ForestWorld({ floorY, curveData, robotRef, gestureRef, roomPortals, completion, onPortalEnter }) {
  // Global scaling: make the world feel bigger (robot handled elsewhere).
  const WORLD_SCALE = 1.35;
  const TREE_HEIGHT = 1.55;
  const PROP_SCALE = 1.55;

  const grassTex = useMemo(() => makeGrassTexture(), []);
  const lakeGlintTex = useMemo(() => makeLakeGlintTexture(), []);
  const softShadowTex = useMemo(() => makeSoftShadowTexture(), []);
  const mirrorTex = useMemo(() => makeMirrorFakeTexture(), []);
  const lakeMaskTex = useMemo(() => makeSoftCircleMaskTexture(), []);

  // Raise the trail noticeably above the grass (and keep all trail-adjacent items in sync).
  const pathSurfaceLift = FOREST_PATH_SURFACE_LIFT;
  const pathRibbonLift = FOREST_PATH_RIBBON_LIFT;
  const pathDetailLift = FOREST_PATH_DETAIL_LIFT;

  const pathPoints = useMemo(() => {
    if (!curveData?.curve) return [];
    const pts = curveData.curve.getPoints(260);
    // Lift the whole road slightly above the terrain so it reads as a constructed trail.
    for (const p of pts) p.y = floorY + forestTerrainHeight(p.x, p.z) + pathSurfaceLift;
    return pts;
  }, [curveData, floorY, pathSurfaceLift]);

  const pathGeo = useMemo(() => {
    if (!pathPoints.length) return null;
    // Follow the per-point heights (the points already include the terrain height + lift).
    return buildRibbonGeometry(pathPoints, { width: 2.9, y: undefined });
  }, [pathPoints]);

  const portals = useMemo(() => {
    if (!curveData?.curve || !Array.isArray(roomPortals) || roomPortals.length === 0) return [];

    return roomPortals.map((r, idx) => {
      const t = Number(r.t ?? 0);
      const p = curveData.curve.getPointAt(t);
      const tan = curveData.curve.getTangentAt(t);
      tan.y = 0;
      if (tan.lengthSq() < 1e-9) tan.set(0, 0, 1);
      tan.normalize();
      const left = new THREE.Vector3(0, 1, 0).cross(tan).normalize();

      const side = typeof r.side === 'number' ? Math.sign(r.side) || 1 : (idx % 2 === 0 ? 1 : -1);

      const scene = String(r.scene || '');
      const isPrivacy = scene === 'privacy';
      const isPassword = scene === 'password';
      const isShop = scene === 'shop';
      const isStrength = scene === 'strength';

      // Each room gets a distinct "discovery path" shape + width.
      const spurWidth = isShop ? 3.35 : ((isPassword || isStrength) ? 1.75 : 2.35);

      // Start slightly off the main ribbon edge.
      const p0 = p.clone()
        .addScaledVector(left, ((isPassword || isStrength) ? 1.25 : 1.65) * side)
        .addScaledVector(tan, (isPassword || isStrength) ? -0.85 : 0);

      // Control points:
      // - Privacy: soft S curve that feels like "hidden" and only reveals at the end.
      // - Shop: direct, wide, inviting.
      // - Passwords: narrow, slightly tucked behind a mound (rendered at the entrance).
      let curvePts;
      if (isPrivacy) {
        // Make the spur "disappear" behind a bend before the end reveal.
        const a1 = p0.clone().addScaledVector(left, 2.6 * side).addScaledVector(tan, -0.95);
        const a2 = p0.clone().addScaledVector(left, 4.2 * side).addScaledVector(tan, 0.65);
        const a3 = p0.clone().addScaledVector(left, 3.4 * side).addScaledVector(tan, 2.35);
        const a4 = p0.clone().addScaledVector(left, 5.9 * side).addScaledVector(tan, 2.85);
        const p2 = p0.clone().addScaledVector(left, 7.2 * side).addScaledVector(tan, 3.35);
        curvePts = [p0, a1, a2, a3, a4, p2];
      } else if (isShop) {
        // Still smooth (no 90°), but less "straight shot" so it reads as terrain-following.
        const p1 = p0.clone().addScaledVector(left, 2.8 * side).addScaledVector(tan, -0.55);
        const p2 = p0.clone().addScaledVector(left, 4.9 * side).addScaledVector(tan, 1.25);
        const p3 = p0.clone().addScaledVector(left, 6.7 * side).addScaledVector(tan, 2.65);
        curvePts = [p0, p1, p2, p3];
      } else {
        // Default: a gentle "hide then reveal" bend (starts by tucking behind a hill).
        const p1 = p0.clone().addScaledVector(left, 2.2 * side).addScaledVector(tan, -0.85);
        const p2 = p0.clone().addScaledVector(left, 4.4 * side).addScaledVector(tan, 0.75);
        const p3 = p0.clone().addScaledVector(left, 6.6 * side).addScaledVector(tan, 2.25);
        curvePts = [p0, p1, p2, p3];
      }

      const spurCurve = new THREE.CatmullRomCurve3(curvePts, false, 'catmullrom', isPrivacy ? 0.45 : 0.6);
      const spurPts = spurCurve.getPoints(58);
      for (const sp of spurPts) sp.y = floorY + forestTerrainHeight(sp.x, sp.z) + pathRibbonLift;
      const spurGeo = buildRibbonGeometry(spurPts, { width: spurWidth, y: undefined });

      // Occluding hills: placed along the early part of the spur to hide the portal until the
      // robot commits to the bend. These are purely visual (no collision), but they create the
      // "path disappears behind a hill" moment.
      const hills = [];
      const hillSteps = isPrivacy ? [0.18, 0.32, 0.46] : (isShop ? [0.22, 0.36] : [0.2, 0.34, 0.5]);
      for (let hi = 0; hi < hillSteps.length; hi += 1) {
        const tt = hillSteps[hi];
        const cp = spurCurve.getPointAt(tt);
        const tTan = spurCurve.getTangentAt(tt);
        tTan.y = 0;
        if (tTan.lengthSq() < 1e-9) tTan.set(0, 0, 1);
        tTan.normalize();
        const n = new THREE.Vector3(0, 1, 0).cross(tTan).normalize();
        const baseR = (isShop ? 1.7 : ((isPassword || isStrength) ? 1.85 : 1.6)) * (0.95 + 0.15 * prand(idx * 77 + hi * 19));
        const hScale = ((isPassword || isStrength) ? 1.55 : (isPrivacy ? 1.75 : 1.65));
        const offset = (spurWidth * 0.70 + baseR * 0.55);

        // Two hills flanking the spur; bias one side slightly bigger to form a visual "curtain".
        const bias = (hi % 2 === 0 ? 1 : -1);
        const bigSide = bias * side;
        const o1 = n.clone().multiplyScalar(offset);
        const o2 = n.clone().multiplyScalar(-offset);
        hills.push({
          x: cp.x + o1.x,
          y: (floorY + forestTerrainHeight(cp.x + o1.x, cp.z + o1.z) + pathSurfaceLift) + baseR * 0.40,
          z: cp.z + o1.z,
          r: baseR * (bigSide > 0 ? 1.18 : 1.0),
          sx: 1.25,
          sy: hScale * (bigSide > 0 ? 1.2 : 1.0),
          sz: 1.1,
          seed: idx * 1000 + hi * 13 + 1,
        });
        hills.push({
          x: cp.x + o2.x,
          y: (floorY + forestTerrainHeight(cp.x + o2.x, cp.z + o2.z) + pathSurfaceLift) + baseR * 0.36,
          z: cp.z + o2.z,
          r: baseR * (bigSide < 0 ? 1.18 : 1.0),
          sx: 1.2,
          sy: hScale,
          sz: 1.15,
          seed: idx * 1000 + hi * 13 + 2,
        });
      }

      // Entrance direction (for the gate).
      const p1dir = spurCurve.getPointAt(0.12);
      const entranceYaw = Math.atan2(p1dir.x - p0.x, p1dir.z - p0.z);

      // Breadcrumb candies (more for privacy S-curve, subtle for passwords).
      const crumbs = [];
      const crumbCount = isPrivacy ? 10 : ((isPassword || isStrength) ? 6 : 7);
      for (let i = 1; i <= crumbCount; i += 1) {
        const tt = 0.10 + (i / (crumbCount + 1)) * 0.82;
        const cp = spurCurve.getPointAt(tt);
        crumbs.push({
          x: cp.x,
          y: floorY + forestTerrainHeight(cp.x, cp.z) + pathSurfaceLift + 0.06,
          z: cp.z,
          s: ((isPassword || isStrength) ? 0.12 : 0.14) * (0.9 + 0.25 * prand(idx * 100 + i * 17)),
          a: r.accent || '#7afcff',
        });
      }

      // Face the gate back toward the spur start.
      const pEnd = spurCurve.getPointAt(1);
      const yaw = Math.atan2(p0.x - pEnd.x, p0.z - pEnd.z);

      const junctionY = floorY + forestTerrainHeight(p0.x, p0.z) + pathSurfaceLift;
      const platformY = floorY + forestTerrainHeight(pEnd.x, pEnd.z) + pathSurfaceLift;

      return {
        ...r,
        side,
        spurGeo,
        spurWidth,
        spurCurve,
        spurPts,
        hills,
        crumbs,
        junction: new THREE.Vector3(p0.x, junctionY, p0.z),
        junctionYaw: Math.atan2(-tan.x, -tan.z),
        platform: new THREE.Vector3(pEnd.x, platformY, pEnd.z),
        entranceYaw,
        yaw,
      };
    });
  }, [curveData, roomPortals, floorY, pathRibbonLift, pathSurfaceLift]);

  const signTextures = useMemo(() => {
    const typeForScene = (scene) => {
      if (scene === 'password') return 'key';
      if (scene === 'strength') return 'key';
      if (scene === 'privacy') return 'privacy';
      if (scene === 'shop') return 'shop';
      if (scene === 'clothing') return 'shop';
      if (scene === 'lobby' || scene === 'entry' || scene === 'tryAgain') return 'hub';
      return 'hub';
    };

    // Keep the original type keys for existing code paths.
    const out = {
      key: makeRoomSignTexture({ type: 'key', label: 'Passwords' }),
      privacy: makeRoomSignTexture({ type: 'privacy', label: 'Privacy' }),
      shop: makeRoomSignTexture({ type: 'shop', label: 'Shop' }),
      hub: makeRoomSignTexture({ type: 'hub', label: 'Start' }),
    };

    // Also generate per-scene textures so each sign can display the correct label.
    if (Array.isArray(roomPortals)) {
      roomPortals.forEach((r) => {
        const scene = String(r?.scene || '');
        if (!scene) return;
        const label = typeof r?.label === 'string' ? r.label : '';
        out[scene] = makeRoomSignTexture({ type: typeForScene(scene), label });
      });
    }

    return out;
  }, [roomPortals]);

  const signs = useMemo(() => {
    if (!curveData?.curve) return [];

    const resolveType = (scene) => {
      if (scene === 'password') return 'key';
      if (scene === 'strength') return 'key';
      if (scene === 'privacy') return 'privacy';
      if (scene === 'clothing') return 'shop';
      if (scene === 'lobby' || scene === 'entry' || scene === 'tryAgain') return 'hub';
      return 'shop';
    };

    const out = [];

    // One sign per room at the spur junction.
    portals.forEach((portal) => {
      if (!portal?.junction) return;
      out.push({
        kind: 'room',
        scene: portal.scene,
        type: resolveType(portal.scene),
        accent: portal.accent,
        label: portal.label,
        x: portal.junction.x,
        z: portal.junction.z,
        y: portal.junction.y,
        yaw: portal.junctionYaw ?? 0,
        s: 1.05,
      });
    });

    // One main entrance sign near the start of the road.
    const start = curveData.curve.getPointAt(0);
    const tan0 = curveData.curve.getTangentAt(0);
    tan0.y = 0;
    if (tan0.lengthSq() < 1e-9) tan0.set(0, 0, 1);
    tan0.normalize();
    const left0 = new THREE.Vector3(0, 1, 0).cross(tan0).normalize();
    out.push({
      kind: 'hub',
      scene: 'hub',
      type: 'hub',
      accent: '#fff44f',
      x: start.x + left0.x * 4.1,
      z: start.z + left0.z * 4.1,
      y: floorY + forestTerrainHeight(start.x + left0.x * 4.1, start.z + left0.z * 4.1) + pathSurfaceLift,
      yaw: Math.atan2(-tan0.x, -tan0.z),
      s: 1.35,
    });

    return out;
  }, [curveData, portals, floorY, pathSurfaceLift]);

  const portalGroupRefs = useRef([]);
  const spurMatRefs = useRef([]);
  const screenMatRefs = useRef([]);
  const ringMatRefs = useRef([]);
  const signGroupRefs = useRef([]);
  const signPanelMatRefs = useRef([]);
  const markerMatRefs = useRef([]);
  const portalAnim = useRef([]);
  const portalEnterCooldownUntilRef = useRef(0);
  const tmpV = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!portals.length) return;
    const robot = robotRef?.current;
    if (!robot) return;
    const gesture = gestureRef?.current?.gesture || 'none';

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const aReveal = 1 - Math.exp(-delta * 4.5);
    const aOpen = 1 - Math.exp(-delta * 8.5);

    for (let i = 0; i < portals.length; i += 1) {
      const portal = portals[i];
      const g = portalGroupRefs.current[i];
      const spurMat = spurMatRefs.current[i];
      const screenMat = screenMatRefs.current[i];
      const ringMat = ringMatRefs.current[i];
      if (!portal || !g) continue;

      tmpV.current.copy(portal.platform);
      const dx = robot.position.x - tmpV.current.x;
      const dz = robot.position.z - tmpV.current.z;
      const dist = Math.hypot(dx, dz);

      portalAnim.current[i] = portalAnim.current[i] || { reveal: 0, open: 0 };
      const anim = portalAnim.current[i];

      const targetReveal = smoothstep01(1 - (dist - 2.0) / 12.0);
      anim.reveal += (targetReveal - anim.reveal) * aReveal;

      const nearGate = dist < 2.4;
      const completed = Boolean(completion?.[portal.scene]);
      const wantsOpen = nearGate && (gesture === 'openPalm' || gesture === 'thumbUp');
      const targetOpen = completed ? 1 : (wantsOpen ? 1 : 0);
      anim.open += (targetOpen - anim.open) * aOpen;

      // Enter portal when it is open and the robot is on top of it.
      if (
        typeof onPortalEnter === 'function' &&
        portal?.scene &&
        anim.open > 0.62 &&
        dist < 1.35 &&
        nowMs >= portalEnterCooldownUntilRef.current
      ) {
        portalEnterCooldownUntilRef.current = nowMs + 1200;
        onPortalEnter(portal.scene);
      }

      // Emerge from the ground (slightly elevated above grass when fully revealed).
        g.position.y = portal.platform.y - (1 - anim.reveal) * 1.15;
      const s = 0.90 + anim.reveal * 0.10;
      g.scale.set(s, s, s);

      // Neon halo on the spur.
      if (spurMat) {
        spurMat.emissiveIntensity = 0.05 + anim.reveal * 0.85;
        spurMat.opacity = 0.94;
      }

      // Ring glow.
      if (ringMat) {
        ringMat.emissiveIntensity = 0.18 + anim.reveal * 1.15;
      }

      // Energy screen becomes more transparent as it "opens".
      if (screenMat) {
        const base = 0.78 - anim.open * 0.55;
        screenMat.opacity = Math.max(0.12, Math.min(0.88, base));
      }
    }

    // Just-in-time holographic signage (keeps the scene clean).
    if (Array.isArray(signs) && signs.length) {
      const a = 1 - Math.exp(-delta * 10);
      for (let i = 0; i < signs.length; i += 1) {
        const s = signs[i];
        const g = signGroupRefs.current[i];
        const panel = signPanelMatRefs.current[i];
        if (!s || !g) continue;

        const dx = robot.position.x - s.x;
        const dz = robot.position.z - s.z;
        const dist = Math.hypot(dx, dz);

        // Fade out when far; brighten when close.
        const targetVis = smoothstep01(1 - (dist - 3.0) / 14.0);
        const cur = g.userData._vis ?? 0;
        const vis = cur + (targetVis - cur) * a;
        g.userData._vis = vis;

        const baseS = s.s || 1;
        g.scale.setScalar(baseS * (0.92 + vis * 0.10));
        if (panel) panel.opacity = 0.15 + vis * 0.85;
      }
    }

    // Ground markers: only noticeable near the junction.
    if (Array.isArray(markerMatRefs.current) && markerMatRefs.current.length) {
      const a2 = 1 - Math.exp(-delta * 10);
      for (let i = 0; i < markerMatRefs.current.length; i += 1) {
        const mm = markerMatRefs.current[i];
        const meta = mm?.userData?._meta;
        if (!mm || !meta) continue;
        const dx = robot.position.x - meta.x;
        const dz = robot.position.z - meta.z;
        const dist = Math.hypot(dx, dz);
        const near = smoothstep01(1 - (dist - 2.0) / 12.0);
        const target = 0.02 + near * 0.26;
        const cur = mm.opacity ?? 0;
        mm.opacity = cur + (target - cur) * a2;
      }
    }
  });

  const treeData = useMemo(() => {
    const curvePts = pathPoints.length ? pathPoints : [];
    const curvePts2 = curvePts.map((p) => new THREE.Vector3(p.x, 0, p.z));

    const isInsideLake = (x, z, lk, pad = 1.08) => {
      if (!lk) return false;
      const px = x - lk.x;
      const pz = z - lk.z;
      const c = Math.cos(lk.yaw || 0);
      const s = Math.sin(lk.yaw || 0);
      const lx = c * px + s * pz;
      const lz = -s * px + c * pz;

      // Organic lakes: same inside-test drives rendering + duck placement.
      if (lk.kind === 'organic') {
        const theta = Math.atan2(lz, lx);
        const w1 = 0.55;
        const w2 = 0.30;
        const w3 = 0.15;
        const seed = lk.seed || 0;
        const f1 = lk.f1 || 3.0;
        const f2 = lk.f2 || 5.0;
        const f3 = lk.f3 || 8.0;
        const amp = lk.amp ?? 0.18;
        const n =
          (Math.sin(theta * f1 + seed * 0.001) * w1 + Math.sin(theta * f2 - seed * 0.002) * w2 + Math.sin(theta * f3 + seed * 0.003) * w3) /
          (w1 + w2 + w3);
        const baseR = lk.r ?? lk.rx ?? 1;
        const shoreR = baseR * (1 + amp * n);
        const r = Math.hypot(lx, lz);
        return r < shoreR * pad;
      }

      const dx = lx / (lk.rx * pad);
      const dz = lz / (lk.rz * pad);
      return dx * dx + dz * dz < 1;
    };

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
    const pathPebbles = [];
    const edgeStones = [];
    const leafPiles = [];
    const pathRoots = [];

    const bounds = 58;
    const clearance = 4.8; // keep path clear (bigger objects)
    const clearance2 = clearance * clearance;
    // Keep trees noticeably farther from the trail so the near-path zone reads as shrubs.
    const treeClearance = 11.5;
    const treeClearance2 = treeClearance * treeClearance;

    // Lakes (central features). Keep vegetation/props out of the water area.
    const lakeR = ((6.2 * 1.22) + (4.8 * 1.22)) / 2;
    const lake = { x: 0, z: 0, rx: lakeR, rz: lakeR, yaw: 0 };
    const lake2R = (5.2 + 3.9) / 2;
    // Slightly organic shoreline (not a perfect circle), with soft edge handled by the alpha mask.
    const lake2 = {
      x: 9.5,
      z: -6.5,
      r: lake2R,
      rx: lake2R,
      rz: lake2R,
      yaw: 0.42,
      kind: 'organic',
      amp: 0.20,
      f1: 3.0,
      f2: 5.0,
      f3: 9.0,
      seed: 9123,
    };

    // Trees (multiple types). Densely forested before; now thinned significantly.
    const treeTarget = 160;
    let attempts = 0;
    while (pines.length + rounds.length + birches.length < treeTarget && attempts < 4200) {
      attempts += 1;
      const i = attempts;
      const x = (prand(i + 100) - 0.5) * bounds * 2;
      const z = (prand(i + 200) - 0.5) * bounds * 2;
      const d2 = curvePts2.length ? minDist2ToCurve(x, z) : 999;
      if (d2 < treeClearance2) continue;
      if (isInsideLake(x, z, lake) || isInsideLake(x, z, lake2)) continue;
      if (x * x + z * z < 18) continue; // keep the absolute center a bit open

      const typeRoll = prand(i + 777);
      const s = (0.72 + prand(i + 300) * 0.9) * WORLD_SCALE;

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
    while (palms.length < 55 && attempts < 2800) {
      attempts += 1;
      const i = attempts;
      const x = (prand(i + 2100) - 0.5) * bounds * 2;
      const z = (prand(i + 2200) - 0.5) * bounds * 2;
      const d2 = curvePts2.length ? minDist2ToCurve(x, z) : 999;
      if (d2 < (treeClearance + 1.6) * (treeClearance + 1.6)) continue;
      if (isInsideLake(x, z, lake) || isInsideLake(x, z, lake2)) continue;
      if (x * x + z * z < 22) continue;

      // Prefer outskirts (gives skyline variety).
      const r = Math.hypot(x, z);
      if (r < 34 && prand(i + 2300) < 0.75) continue;

      const s = (0.85 + prand(i + 2400) * 1.05) * WORLD_SCALE;
      const trunkH = (3.1 + prand(i + 2500) * 2.2) * TREE_HEIGHT;
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
    const edgeCount = 320;
    if (!curveData?.curve || curveData.curve?.points?.length < 2) {
      // No path curve available yet.
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
        pathPebbles,
        edgeStones,
        leafPiles,
        pathRoots,
        lake,
        lake2,
      };
    }

    for (let i = 0; i < edgeCount; i += 1) {
      const t = edgeCount <= 1 ? 0 : i / (edgeCount - 1);
      const p = curveData.curve.getPointAt(t);
      const tan = curveData.curve.getTangentAt(t);
      tan.y = 0;
      tan.normalize();
      const left = new THREE.Vector3(0, 1, 0).cross(tan).normalize();

      const side = i % 2 === 0 ? 1 : -1;
      // Keep shrubs fairly close to the path (creates a readable corridor).
      const off = 2.0 + prand(i + 900) * 2.3;
      const x = p.x + left.x * off * side;
      const z = p.z + left.z * off * side;
      if (isInsideLake(x, z, lake, 1.02) || isInsideLake(x, z, lake2, 1.02)) continue;
      // Smaller shrubs near the trail.
      const s = (0.26 + prand(i + 920) * 0.34) * WORLD_SCALE;
      bushes.push({ x, z, s });

      // Flowers a bit further from the path.
      if (i % 2 === 0) {
        const off2 = off + 1.4 + prand(i + 940) * 1.8;
        const fx = p.x + left.x * off2 * side;
        const fz = p.z + left.z * off2 * side;
        if (isInsideLake(fx, fz, lake, 1.02) || isInsideLake(fx, fz, lake2, 1.02)) continue;
        const fs = (0.22 + prand(i + 960) * 0.22) * WORLD_SCALE;
        // Pastel palette: pink / sky-blue / yellow.
        const hues = [0.92, 0.58, 0.13];
        const baseHue = hues[Math.floor(prand(i + 980) * hues.length) % hues.length];
        const hue = (baseHue + (prand(i + 981) - 0.5) * 0.035 + 1) % 1;
        const sat = 0.62 + prand(i + 982) * 0.12;
        const light = 0.72 + prand(i + 983) * 0.08;
        const col = new THREE.Color().setHSL(hue, sat, light);
        flowers.push({ x: fx, z: fz, s: fs, col });
      }

      // Sunflowers (pretty, more noticeable).
      if (i % 7 === 0) {
        const offS = off + 2.2 + prand(i + 1210) * 2.4;
        const sx = p.x + left.x * offS * side;
        const sz = p.z + left.z * offS * side;
        if (isInsideLake(sx, sz, lake, 1.02) || isInsideLake(sx, sz, lake2, 1.02)) continue;
        const ss = (0.45 + prand(i + 1220) * 0.55) * WORLD_SCALE;
        const yaw = prand(i + 1230) * Math.PI * 2;
        const petalCol = new THREE.Color().setHSL(0.13 + prand(i + 1240) * 0.04, 0.92, 0.60);
        sunflowers.push({ x: sx, z: sz, s: ss, yaw, petalCol });
      }

      // Tall pink cyclamen (rakafet) near the path.
      if (i % 6 === 1) {
        const offC = off + 1.2 + prand(i + 1510) * 2.2;
        const cx = p.x + left.x * offC * side + (prand(i + 1520) - 0.5) * 0.9;
        const cz = p.z + left.z * offC * side + (prand(i + 1530) - 0.5) * 0.9;
        if (isInsideLake(cx, cz, lake, 1.02) || isInsideLake(cx, cz, lake2, 1.02)) continue;
        const cs = (0.55 + prand(i + 1540) * 0.75) * WORLD_SCALE;
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
        if (isInsideLake(gx, gz, lake, 1.02) || isInsideLake(gx, gz, lake2, 1.02)) continue;
        const baseS = (0.20 + prand(i + 1740) * 0.22) * WORLD_SCALE;
        const count = 16 + Math.floor(prand(i + 1750) * 18);
        const hues = [0.92, 0.58, 0.13];
        for (let k = 0; k < count; k += 1) {
          const ox = (prand(i * 50 + k + 1760) - 0.5) * 0.85;
          const oz = (prand(i * 50 + k + 1770) - 0.5) * 0.85;
          const s = baseS * (0.55 + prand(i * 50 + k + 1780) * 0.8);
          const baseHue = hues[Math.floor(prand(i * 50 + k + 1790) * hues.length) % hues.length];
          const hue = (baseHue + (prand(i * 50 + k + 1791) - 0.5) * 0.05 + 1) % 1;
          const col = new THREE.Color().setHSL(hue, 0.58, 0.80);
          gypsophila.push({ x: gx + ox, z: gz + oz, s, col });
        }
      }

      // Roses (red/pink clusters).
      if (prand(i + 1310) > 0.25) {
        const offR = off + 1.0 + prand(i + 1320) * 1.6;
        const rx = p.x + left.x * offR * side + (prand(i + 1330) - 0.5) * 0.8;
        const rz = p.z + left.z * offR * side + (prand(i + 1340) - 0.5) * 0.8;
        const baseS = (0.30 + prand(i + 1350) * 0.38) * WORLD_SCALE;
        const bloomCount = 8 + Math.floor(prand(i + 1355) * 8);
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

        const leafCount = 5 + Math.floor(prand(i + 1420) * 6);
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
      if (prand(i + 1004) > 0.62) {
        const mx = x + (prand(i + 1010) - 0.5) * 1.2;
        const mz = z + (prand(i + 1015) - 0.5) * 1.2;
        const ms = (0.16 + prand(i + 1020) * 0.18) * WORLD_SCALE;
        mushrooms.push({ x: mx, z: mz, s: ms });
      }

      // Tufts of taller grass (lots of small variety close to the path).
      if (prand(i + 1111) > 0.12) {
        const gx = x + (prand(i + 1120) - 0.5) * 1.6;
        const gz = z + (prand(i + 1130) - 0.5) * 1.6;
        const gs = (0.22 + prand(i + 1140) * 0.38) * WORLD_SCALE;
        const hue = 0.27 + prand(i + 1150) * 0.10;
        const col = new THREE.Color().setHSL(hue, 0.65, 0.46 + prand(i + 1160) * 0.14);
        grassClumps.push({ x: gx, z: gz, s: gs, col });
      }
    }

    // Rocks scattered around (low profile, helps break repetition).
    for (let i = 0; i < 190; i += 1) {
      const x = (prand(i + 5000) - 0.5) * bounds * 2;
      const z = (prand(i + 5100) - 0.5) * bounds * 2;
      const d2 = curvePts2.length ? minDist2ToCurve(x, z) : 999;
      if (d2 < (clearance + 0.8) * (clearance + 0.8)) continue;
      if (isInsideLake(x, z, lake) || isInsideLake(x, z, lake2)) continue;
      if (x * x + z * z < 16) continue;
      const s = (0.22 + prand(i + 5200) * 0.55) * WORLD_SCALE;
      rocks.push({ x, z, s });
    }

    // Small pebbles sprinkled on the path to break the smoothness.
    // Keep this relatively sparse so the robot path stays readable.
    const pebbleCount = 70;
    for (let i = 0; i < pebbleCount; i += 1) {
      const t = prand(i + 60000);
      const p = curveData.curve.getPointAt(t);
      const tan = curveData.curve.getTangentAt(t);
      tan.y = 0;
      tan.normalize();
      const left = new THREE.Vector3(0, 1, 0).cross(tan).normalize();

      const side = prand(i + 60100) > 0.5 ? 1 : -1;
      const off = (0.15 + prand(i + 60200) * 1.05) * side; // within the ribbon
      const along = (prand(i + 60300) - 0.5) * 0.55;
      const x = p.x + left.x * off + tan.x * along;
      const z = p.z + left.z * off + tan.z * along;
      if (x * x + z * z < 7.2 * 7.2) continue;

      // Tiny pebbles + random light-brown variants (avoid dark).
      const s = (0.010 + prand(i + 60400) * 0.022) * WORLD_SCALE;
      // Match the path hue closely so pebbles blend into the road.
      const col = new THREE.Color('#a58b63');
      col.offsetHSL(
        (prand(i + 60510) - 0.5) * 0.015,
        (prand(i + 60520) - 0.5) * 0.06,
        (prand(i + 60530) - 0.5) * 0.05
      );
      pathPebbles.push({ x, z, s, col });
    }

    // Stones along the path edges to soften the grass/path transition.
    // Keep fewer stones to avoid cluttering the route.
    const edgeStoneCount = 90;
    for (let i = 0; i < edgeStoneCount; i += 1) {
      const t = prand(i + 71000);
      const p = curveData.curve.getPointAt(t);
      const tan = curveData.curve.getTangentAt(t);
      tan.y = 0;
      tan.normalize();
      const left = new THREE.Vector3(0, 1, 0).cross(tan).normalize();

      const side = prand(i + 71100) > 0.5 ? 1 : -1;
      const off = 1.55 + prand(i + 71200) * 1.35; // just outside the ribbon (width ~2.9)
      const along = (prand(i + 71300) - 0.5) * 1.15;
      const x = p.x + left.x * off * side + tan.x * along;
      const z = p.z + left.z * off * side + tan.z * along;
      if (x * x + z * z < 8.4 * 8.4) continue;

      // Much smaller edge stones + light-brown variants (avoid dark).
      const s = (0.018 + prand(i + 71400) * 0.045) * WORLD_SCALE;
      const col = new THREE.Color('#a58b63');
      col.offsetHSL(
        (prand(i + 71510) - 0.5) * 0.015,
        (prand(i + 71520) - 0.5) * 0.06,
        (prand(i + 71530) - 0.5) * 0.05
      );
      edgeStones.push({ x, z, s, col });
    }

    // Fallen leaf piles in autumn colors (small low-poly mounds).
    const leafPileCount = 170;
    for (let i = 0; i < leafPileCount; i += 1) {
      const t = prand(i + 72000);
      const p = curveData.curve.getPointAt(t);
      const tan = curveData.curve.getTangentAt(t);
      tan.y = 0;
      tan.normalize();
      const left = new THREE.Vector3(0, 1, 0).cross(tan).normalize();

      // Some piles on the edge, some lightly spilling onto the path.
      const spillOnPath = prand(i + 72100) > 0.64;
      const side = prand(i + 72110) > 0.5 ? 1 : -1;
      const off = spillOnPath
        ? (prand(i + 72120) - 0.5) * 1.25
        : (1.35 + prand(i + 72130) * 2.15) * side;
      const along = (prand(i + 72140) - 0.5) * 1.05;
      const x = p.x + left.x * off + tan.x * along;
      const z = p.z + left.z * off + tan.z * along;
      if (x * x + z * z < 8.2 * 8.2) continue;

      const s = (0.16 + prand(i + 72200) * 0.34) * WORLD_SCALE;
      const yaw = prand(i + 72300) * Math.PI * 2;
      const pick = prand(i + 72400);
      const col = pick < 0.34
        ? new THREE.Color('#f4b23a') // golden
        : pick < 0.68
          ? new THREE.Color('#e3632d') // orange
          : new THREE.Color('#c43c2f'); // red
      leafPiles.push({ x, z, s, yaw, col });
    }

    // Occasional exposed roots/twigs that cross the path a bit.
    // Keep them small so they read as subtle sticks.
    const rootCount = 12;
    for (let i = 0; i < rootCount; i += 1) {
      const t = prand(i + 73000);
      const p = curveData.curve.getPointAt(t);
      const tan = curveData.curve.getTangentAt(t);
      tan.y = 0;
      tan.normalize();
      const left = new THREE.Vector3(0, 1, 0).cross(tan).normalize();

      const along = (prand(i + 73100) - 0.5) * 1.4;
      const x = p.x + tan.x * along;
      const z = p.z + tan.z * along;
      if (x * x + z * z < 10.0 * 10.0) continue;

      const side = prand(i + 73200) > 0.5 ? 1 : -1;
      const yaw = Math.atan2(left.x * side, left.z * side) + (prand(i + 73300) - 0.5) * 0.35;
      const len = (1.25 + prand(i + 73400) * 0.85) * WORLD_SCALE;
      const r = (0.045 + prand(i + 73500) * 0.045) * WORLD_SCALE;
      pathRoots.push({ x, z, yaw, len, r });
    }

    // Extra rose patches for a richer look.
    for (let i = 0; i < 170; i += 1) {
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
      const baseS = (0.30 + prand(i + 9400) * 0.42) * WORLD_SCALE;
      const bloomCount = 9 + Math.floor(prand(i + 9500) * 10);
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
      const leafCount = 6 + Math.floor(prand(i + 9970) * 6);
      for (let l = 0; l < leafCount; l += 1) {
        const ox = (prand(i * 50 + l + 9980) - 0.5) * 1.05;
        const oz = (prand(i * 50 + l + 9990) - 0.5) * 1.05;
        const ls = baseS * (0.55 + prand(i * 50 + l + 10010) * 0.55);
        const hue = 0.28 + prand(i * 50 + l + 10020) * 0.08;
        const col = new THREE.Color().setHSL(hue, 0.72, 0.34 + prand(i * 50 + l + 10030) * 0.12);
        roseLeaves.push({ x: rx + ox, z: rz + oz, s: ls, col });
      }
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
      pathPebbles,
      edgeStones,
      leafPiles,
      pathRoots,
      lake,
      lake2,
    };
  }, [curveData, pathPoints, floorY, TREE_COLOR_REV]);

  const lake2WaterGeo = useMemo(() => {
    const lk = treeData?.lake2;
    if (!lk || lk.kind !== 'organic') return null;
    const w1 = 0.55;
    const w2 = 0.30;
    const w3 = 0.15;
    const seed = lk.seed || 0;
    const f1 = lk.f1 || 3.0;
    const f2 = lk.f2 || 5.0;
    const f3 = lk.f3 || 8.0;
    const amp = lk.amp ?? 0.18;
    const baseR = lk.r ?? lk.rx ?? 1;

    const segs = 160;
    const shape = new THREE.Shape();
    for (let i = 0; i <= segs; i += 1) {
      const t = (i / segs) * Math.PI * 2;
      const n =
        (Math.sin(t * f1 + seed * 0.001) * w1 + Math.sin(t * f2 - seed * 0.002) * w2 + Math.sin(t * f3 + seed * 0.003) * w3) /
        (w1 + w2 + w3);
      const r = baseR * (1 + amp * n);
      const x = Math.cos(t) * r;
      const y = Math.sin(t) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    const geo = new THREE.ShapeGeometry(shape, 16);
    geo.computeVertexNormals();
    return geo;
  }, [treeData?.lake2]);

  const lake2MaskTex = useMemo(() => {
    const lk = treeData?.lake2;
    if (!lk || lk.kind !== 'organic') return null;

    const w1 = 0.55;
    const w2 = 0.30;
    const w3 = 0.15;
    const seed = lk.seed || 0;
    const f1 = lk.f1 || 3.0;
    const f2 = lk.f2 || 5.0;
    const f3 = lk.f3 || 8.0;
    const amp = lk.amp ?? 0.18;
    const baseR = lk.r ?? lk.rx ?? 1;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, size, size);

    const maxR = baseR * (1 + amp);
    const rToPx = (size * 0.45) / maxR;
    const cx = size * 0.5;
    const cy = size * 0.5;

    const segs = 180;
    ctx.beginPath();
    for (let i = 0; i <= segs; i += 1) {
      const t = (i / segs) * Math.PI * 2;
      const n =
        (Math.sin(t * f1 + seed * 0.001) * w1 + Math.sin(t * f2 - seed * 0.002) * w2 + Math.sin(t * f3 + seed * 0.003) * w3) /
        (w1 + w2 + w3);
      const r = baseR * (1 + amp * n);
      const x = cx + Math.cos(t) * r * rToPx;
      const y = cy + Math.sin(t) * r * rToPx;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // Soft edge: paint a blurred fill, then a crisp fill on top.
    ctx.save();
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'white';
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [treeData?.lake2]);

  const hammocks = useMemo(() => {
    if (!treeData) return [];

    const all = [
      ...(treeData.pines || []).map((t, idx) => ({ ...t, _type: 'pine', _idx: idx })),
      ...(treeData.rounds || []).map((t, idx) => ({ ...t, _type: 'round', _idx: idx })),
      ...(treeData.birches || []).map((t, idx) => ({ ...t, _type: 'birch', _idx: idx })),
    ];
    if (all.length < 2) return [];

    const pts = Array.isArray(pathPoints) ? pathPoints : [];
    const minDist2ToPath = (x, z) => {
      if (!pts.length) return 999;
      let best = Infinity;
      for (let i = 0; i < pts.length; i += 1) {
        const dx = pts[i].x - x;
        const dz = pts[i].z - z;
        const d2 = dx * dx + dz * dz;
        if (d2 < best) best = d2;
      }
      return best;
    };

    const attachY = (t) => {
      const f = t._type === 'birch' ? 1.35 : 1.10;
      return floorY + f * t.s * TREE_HEIGHT;
    };

    const isInsideLakeLocal = (x, z, lk, pad = 1.08) => {
      if (!lk) return false;
      const px = x - lk.x;
      const pz = z - lk.z;
      const c = Math.cos(lk.yaw || 0);
      const s = Math.sin(lk.yaw || 0);
      const lx = c * px + s * pz;
      const lz = -s * px + c * pz;

      if (lk.kind === 'organic') {
        const theta = Math.atan2(lz, lx);
        const w1 = 0.55;
        const w2 = 0.30;
        const w3 = 0.15;
        const seed = lk.seed || 0;
        const f1 = lk.f1 || 3.0;
        const f2 = lk.f2 || 5.0;
        const f3 = lk.f3 || 8.0;
        const amp = lk.amp ?? 0.18;
        const n =
          (Math.sin(theta * f1 + seed * 0.001) * w1 + Math.sin(theta * f2 - seed * 0.002) * w2 + Math.sin(theta * f3 + seed * 0.003) * w3) /
          (w1 + w2 + w3);
        const baseR = lk.r ?? lk.rx ?? 1;
        const shoreR = baseR * (1 + amp * n);
        const r = Math.hypot(lx, lz);
        return r < shoreR * pad;
      }

      const dx = lx / (lk.rx * pad);
      const dz = lz / (lk.rz * pad);
      return dx * dx + dz * dz < 1;
    };

    const used = new Set();
    const res = [];
    let guard = 0;

    const makeBedGeom = (len, seedBase) => {
      const width = 1.05;
      const sag = 0.70 + prand(seedBase) * 0.25;
      const geom = new THREE.PlaneGeometry(len, width, 22, 1);
      geom.rotateX(-Math.PI / 2);
      const pos = geom.attributes.position;
      for (let i = 0; i < pos.count; i += 1) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const u = x / len + 0.5;
        const edge = Math.abs(z) / (width * 0.5);
        const edgeLift = 0.92 - 0.18 * edge;
        const drop = Math.sin(Math.PI * u) * sag * edgeLift;
        pos.setY(i, -drop);
      }
      pos.needsUpdate = true;
      geom.computeVertexNormals();
      return geom;
    };

    // Base set: was 7; now generate 12 (adds +5 hammocks).
    while (res.length < 12 && guard < 2400) {
      guard += 1;

      const aIdx = Math.floor(prand(99000 + guard * 11) * all.length);
      const A = all[aIdx];
      if (!A || used.has(`${A._type}:${A._idx}`)) continue;

      const ax = A.x;
      const az = A.z;
      // Prefer hammocks away from the path corridor (keeps the trail readable).
      if (minDist2ToPath(ax, az) < 15 * 15) continue;

      const Ay = attachY(A);

      // Find a nearby tree to tie to.
      let B = null;
      for (let tries = 0; tries < 60; tries += 1) {
        const bIdx = Math.floor(prand(99500 + guard * 37 + tries * 13) * all.length);
        const cand = all[bIdx];
        if (!cand) continue;
        if (cand === A) continue;
        if (used.has(`${cand._type}:${cand._idx}`)) continue;

        const bx = cand.x;
        const bz = cand.z;
        const dx = bx - ax;
        const dz = bz - az;
        const d = Math.hypot(dx, dz);
        if (d < 4.6 || d > 7.6) continue;
        if (minDist2ToPath((ax + bx) * 0.5, (az + bz) * 0.5) < 14 * 14) continue;

        const By = attachY(cand);
        if (Math.abs(By - Ay) > 0.9) continue;

        B = { ...cand, _attachY: By };
        break;
      }
      if (!B) continue;

      const bx = B.x;
      const bz = B.z;
      const By = B._attachY;

      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz);
      const yaw = Math.atan2(dz, dx);
      const mx = (ax + bx) * 0.5;
      const mz = (az + bz) * 0.5;
      const my = (Ay + By) * 0.5;

      const geom = makeBedGeom(len, 99700 + guard * 19);

      res.push({ ax, az, Ay, bx, bz, By, mx, my, mz, len, yaw, geom, variant: res.length % 2 });
      used.add(`${A._type}:${A._idx}`);
      used.add(`${B._type}:${B._idx}`);
    }

    // Add 3 extra hammocks near the center (2 pink + 1 orange).
    const centerColors = ['#ff7eb6', '#ff7eb6', '#ff8f2b'];
    const centerTrees = all.filter((t) => {
      const r = Math.hypot(t.x, t.z);
      if (r < 18 || r > 34) return false;
      // Keep off the immediate trail corridor.
      if (minDist2ToPath(t.x, t.z) < 11 * 11) return false;
      // Avoid lakes.
      if (treeData.lake && isInsideLakeLocal(t.x, t.z, treeData.lake, 1.22)) return false;
      if (treeData.lake2 && isInsideLakeLocal(t.x, t.z, treeData.lake2, 1.22)) return false;
      return true;
    });

    for (let ci = 0; ci < centerColors.length; ci += 1) {
      const bedColor = centerColors[ci];
      let found = null;
      let foundB = null;

      for (let tries = 0; tries < 160 && !found; tries += 1) {
        const aIdx = Math.floor(prand(130000 + ci * 991 + tries * 17) * Math.max(1, centerTrees.length));
        const A = centerTrees[aIdx];
        if (!A) continue;
        if (used.has(`${A._type}:${A._idx}`)) continue;
        const ax = A.x;
        const az = A.z;

        for (let j = 0; j < 240; j += 1) {
          const bIdx = Math.floor(prand(131000 + ci * 887 + tries * 29 + j * 13) * Math.max(1, centerTrees.length));
          const B = centerTrees[bIdx];
          if (!B || B === A) continue;
          if (used.has(`${B._type}:${B._idx}`)) continue;
          const bx = B.x;
          const bz = B.z;
          const dx = bx - ax;
          const dz = bz - az;
          const d = Math.hypot(dx, dz);
          if (d < 4.6 || d > 7.6) continue;
          const mx = (ax + bx) * 0.5;
          const mz = (az + bz) * 0.5;
          // Keep these hammocks actually near the central forest area.
          if (Math.hypot(mx, mz) > 30) continue;
          if (minDist2ToPath(mx, mz) < 10 * 10) continue;

          const Ay = attachY(A);
          const By = attachY(B);
          if (Math.abs(By - Ay) > 0.9) continue;

          found = { A, ax, az, Ay };
          foundB = { B, bx, bz, By };
          break;
        }
      }

      if (!found || !foundB) continue;

      const dx = foundB.bx - found.ax;
      const dz = foundB.bz - found.az;
      const len = Math.hypot(dx, dz);
      const yaw = Math.atan2(dz, dx);
      const mx = (found.ax + foundB.bx) * 0.5;
      const mz = (found.az + foundB.bz) * 0.5;
      const my = (found.Ay + foundB.By) * 0.5;
      const geom = makeBedGeom(len, 132200 + ci * 101);

      res.push({
        ax: found.ax,
        az: found.az,
        Ay: found.Ay,
        bx: foundB.bx,
        bz: foundB.bz,
        By: foundB.By,
        mx,
        my,
        mz,
        len,
        yaw,
        geom,
        bedColor,
      });

      used.add(`${found.A._type}:${found.A._idx}`);
      used.add(`${foundB.B._type}:${foundB.B._idx}`);
    }

    return res;
  }, [treeData, pathPoints, floorY]);

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

  const pathPebbleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        vertexColors: true,
        roughness: 0.96,
        metalness: 0,
      }),
    []
  );

  const edgeStoneMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        vertexColors: true,
        roughness: 0.98,
        metalness: 0,
      }),
    []
  );

  const leafPileMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        vertexColors: true,
        roughness: 0.92,
        metalness: 0,
      }),
    []
  );

  const rootMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#6b4b2a',
        roughness: 0.95,
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
        opacity: 0.74,
        alphaMap: lakeMaskTex || undefined,
        roughness: 0.06,
        metalness: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [lakeMaskTex]
  );

  const waterMat2 = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#67d5ff',
        transparent: true,
        opacity: 0.74,
        alphaMap: lake2MaskTex || undefined,
        roughness: 0.06,
        metalness: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [lake2MaskTex]
  );

  const woodMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#7a5432',
        roughness: 0.92,
        metalness: 0,
      }),
    []
  );

  const ropeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cdbb9a',
        roughness: 0.95,
        metalness: 0,
      }),
    []
  );

  const metalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#b7c2cc',
        roughness: 0.35,
        metalness: 0.85,
      }),
    []
  );

  const mirrorMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: mirrorTex || undefined,
        toneMapped: false,
      }),
    [mirrorTex]
  );

  const propsData = useMemo(() => {
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

    const bounds = 58;
    const clearance = 7.2;
    const clearance2 = clearance * clearance;

    const pickSpot = (seed, rMin = 18, rMax = 52) => {
      for (let k = 0; k < 140; k += 1) {
        const a = prand(seed + k * 10) * Math.PI * 2;
        const r = rMin + prand(seed + k * 10 + 2) * (rMax - rMin);
        const x = Math.cos(a) * r + (prand(seed + k * 10 + 3) - 0.5) * 6;
        const z = Math.sin(a) * r + (prand(seed + k * 10 + 4) - 0.5) * 6;
        if (curvePts2.length && minDist2ToCurve(x, z) < clearance2) continue;
        // avoid lake area
        if (x * x + z * z < 9.5 * 9.5) continue;
        if (Math.abs(x) > bounds || Math.abs(z) > bounds) continue;
        return { x, z };
      }
      return { x: (prand(seed) - 0.5) * bounds * 1.6, z: (prand(seed + 1) - 0.5) * bounds * 1.6 };
    };

    const mirrors = Array.from({ length: 5 }, (_, i) => ({ ...pickSpot(31001 + i * 7), yaw: prand(31002 + i * 11) * Math.PI * 2, s: 0.95 + prand(31003 + i * 13) * 0.18 }));

    const swings = Array.from({ length: 3 }, (_, i) => ({ ...pickSpot(31101 + i * 19), yaw: prand(31102 + i * 23) * Math.PI * 2, s: 0.95 + prand(31103 + i * 29) * 0.16 }));
    const explorers = Array.from({ length: 10 }, (_, i) => ({ ...pickSpot(31201 + i * 31), yaw: prand(31202 + i * 37) * Math.PI * 2, s: 1.55 + prand(31203 + i * 41) * 0.40 }));
    const picnics = Array.from({ length: 2 }, (_, i) => ({ ...pickSpot(31301 + i * 43), yaw: prand(31302 + i * 47) * Math.PI * 2, s: 0.95 + prand(31303 + i * 53) * 0.14 }));

    const ladders = Array.from({ length: 5 }, (_, i) => ({ ...pickSpot(31401 + i * 13), yaw: prand(31402 + i * 17) * Math.PI * 2, s: 0.92 + prand(31403 + i * 19) * 0.18 }));

    return { mirrors, swings, explorers, picnics, ladders };
  }, [floorY, pathPoints]);

  const swingRef = useRef(null);
  const pathPebbleRef = useRef(null);
  const edgeStoneRef = useRef(null);
  const leafPileRef = useRef(null);

  useEffect(() => {
    const pebbles = pathPebbleRef.current;
    if (!pebbles || !treeData.pathPebbles?.length) return;

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    treeData.pathPebbles.forEach((p, idx) => {
      pos.set(p.x, floorY + forestTerrainHeight(p.x, p.z) + pathDetailLift, p.z);
      quat.setFromEuler(new THREE.Euler(0, prand(idx + 65000) * Math.PI * 2, 0));
      sc.set(p.s, p.s * (0.55 + prand(idx + 65100) * 0.9), p.s);
      m.compose(pos, quat, sc);
      pebbles.setMatrixAt(idx, m);
      pebbles.setColorAt(idx, p.col);
    });
    pebbles.instanceMatrix.needsUpdate = true;
    if (pebbles.instanceColor) pebbles.instanceColor.needsUpdate = true;

    const stones = edgeStoneRef.current;
    if (stones && treeData.edgeStones?.length) {
      const m2 = new THREE.Matrix4();
      const pos2 = new THREE.Vector3();
      const quat2 = new THREE.Quaternion();
      const sc2 = new THREE.Vector3();
      treeData.edgeStones.forEach((s, idx) => {
        pos2.set(s.x, floorY + forestTerrainHeight(s.x, s.z) + pathDetailLift, s.z);
        quat2.setFromEuler(new THREE.Euler(0, prand(idx + 66000) * Math.PI * 2, 0));
        sc2.set(s.s, s.s * (0.55 + prand(idx + 66100) * 0.9), s.s);
        m2.compose(pos2, quat2, sc2);
        stones.setMatrixAt(idx, m2);
        stones.setColorAt(idx, s.col);
      });
      stones.instanceMatrix.needsUpdate = true;
      if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
    }

    const piles = leafPileRef.current;
    if (piles && treeData.leafPiles?.length) {
      const m3 = new THREE.Matrix4();
      const pos3 = new THREE.Vector3();
      const quat3 = new THREE.Quaternion();
      const sc3 = new THREE.Vector3();
      treeData.leafPiles.forEach((p, idx) => {
        pos3.set(p.x, floorY + forestTerrainHeight(p.x, p.z) + pathDetailLift, p.z);
        quat3.setFromEuler(new THREE.Euler(0, p.yaw, 0));
        // Flatten into a little mound.
        sc3.set(p.s, p.s * (0.20 + prand(idx + 67100) * 0.16), p.s);
        m3.compose(pos3, quat3, sc3);
        piles.setMatrixAt(idx, m3);
        piles.setColorAt(idx, p.col);
      });
      piles.instanceMatrix.needsUpdate = true;
      if (piles.instanceColor) piles.instanceColor.needsUpdate = true;
    }
  }, [treeData, floorY, pathDetailLift]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // Gentle swing motion.
    if (swingRef.current) {
      swingRef.current.rotation.z = Math.sin(t * 0.7) * 0.18;
      swingRef.current.rotation.x = Math.sin(t * 0.42) * 0.04;
    }
  });

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
      pos.set(t.x, floorY + 0.8 * t.s * TREE_HEIGHT, t.z);
      quat.setFromEuler(new THREE.Euler(0, prand(idx + 600) * Math.PI * 2, 0));
      scale.set(1 * t.s, 1.25 * t.s * TREE_HEIGHT, 1 * t.s);
      m.compose(pos, quat, scale);
      pineTrunks.setMatrixAt(idx, m);
      if (t.trunkCol) pineTrunks.setColorAt(idx, t.trunkCol);

      pos.set(t.x, floorY + (1.95 + prand(idx + 800) * 0.25) * t.s * TREE_HEIGHT, t.z);
      scale.set(1.0 * t.s, 1.45 * t.s * TREE_HEIGHT, 1.0 * t.s);
      m.compose(pos, quat, scale);
      pineCanopies.setMatrixAt(idx, m);
      pineCanopies.setColorAt(idx, t.leafCol);
    });

    treeData.rounds.forEach((t, idx) => {
      pos.set(t.x, floorY + 0.65 * t.s * TREE_HEIGHT, t.z);
      quat.setFromEuler(new THREE.Euler(0, prand(idx + 1600) * Math.PI * 2, 0));
      scale.set(0.9 * t.s, 1.05 * t.s * TREE_HEIGHT, 0.9 * t.s);
      m.compose(pos, quat, scale);
      roundTrunks.setMatrixAt(idx, m);
      if (t.trunkCol) roundTrunks.setColorAt(idx, t.trunkCol);

      pos.set(t.x, floorY + (1.55 + prand(idx + 1800) * 0.35) * t.s * TREE_HEIGHT, t.z);
      scale.set(1.25 * t.s, 1.15 * t.s * TREE_HEIGHT, 1.25 * t.s);
      m.compose(pos, quat, scale);
      roundCanopies.setMatrixAt(idx, m);
      roundCanopies.setColorAt(idx, t.leafCol);
    });

    treeData.birches.forEach((t, idx) => {
      pos.set(t.x, floorY + 0.9 * t.s * TREE_HEIGHT, t.z);
      quat.setFromEuler(new THREE.Euler(0, prand(idx + 2600) * Math.PI * 2, 0));
      scale.set(0.55 * t.s, 1.6 * t.s * TREE_HEIGHT, 0.55 * t.s);
      m.compose(pos, quat, scale);
      birchTrunks.setMatrixAt(idx, m);
      if (t.trunkCol) birchTrunks.setColorAt(idx, t.trunkCol);

      pos.set(t.x, floorY + (2.05 + prand(idx + 2800) * 0.35) * t.s * TREE_HEIGHT, t.z);
      scale.set(0.95 * t.s, 0.85 * t.s * TREE_HEIGHT, 0.95 * t.s);
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
        scale.set(0.06 * c.s, 1.40 * c.s, 0.06 * c.s);
        m.compose(pos, quat, scale);
        cyclamenStemsInst.setMatrixAt(idx, m);
      });
      cyclamenStemsInst.instanceMatrix.needsUpdate = true;
    }

    if (cyclamenPetalsInst) {
      treeData.cyclamenPetals.forEach((c, idx) => {
        // Petals cluster, slightly tilted forward.
        const headY = floorY + 1.46 * c.s + 0.02;
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
      {/* Grass ground + gentle hills (visual-only mounds layered over the plane) */}
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]} receiveShadow>
          <planeGeometry args={[140, 140, 1, 1]} />
          <meshStandardMaterial color={'#43c75a'} map={grassTex || undefined} roughness={1} metalness={0} />
        </mesh>

        <group position={[0, floorY, 0]}>
          <mesh position={[-26, 0.55, 18]} scale={[1.35, 0.09, 1.35]} castShadow receiveShadow>
            <sphereGeometry args={[16, 28, 20]} />
            <meshStandardMaterial color={'#43c75a'} map={grassTex || undefined} roughness={1} metalness={0} />
          </mesh>
          <mesh position={[28, 0.45, -14]} scale={[1.25, 0.08, 1.25]} castShadow receiveShadow>
            <sphereGeometry args={[18, 28, 20]} />
            <meshStandardMaterial color={'#43c75a'} map={grassTex || undefined} roughness={1} metalness={0} />
          </mesh>
          <mesh position={[6, 0.38, 34]} scale={[1.2, 0.075, 1.2]} castShadow receiveShadow>
            <sphereGeometry args={[14, 26, 18]} />
            <meshStandardMaterial color={'#43c75a'} map={grassTex || undefined} roughness={1} metalness={0} />
          </mesh>
          <mesh position={[-38, 0.42, -30]} scale={[1.18, 0.08, 1.18]} castShadow receiveShadow>
            <sphereGeometry args={[15, 26, 18]} />
            <meshStandardMaterial color={'#43c75a'} map={grassTex || undefined} roughness={1} metalness={0} />
          </mesh>
          <mesh position={[40, 0.35, 28]} scale={[1.12, 0.065, 1.12]} castShadow receiveShadow>
            <sphereGeometry args={[13, 24, 16]} />
            <meshStandardMaterial color={'#43c75a'} map={grassTex || undefined} roughness={1} metalness={0} />
          </mesh>
        </group>
      </group>

      {/* Dirt path */}
      {pathGeo ? (
        <mesh geometry={pathGeo} receiveShadow>
          <meshStandardMaterial color={'#a58b63'} roughness={0.95} metalness={0} />
        </mesh>
      ) : null}

      {/* Minimal, holographic, just-in-time signage */}
      {signs?.length ? (
        <group>
          {signs.map((s, idx) => {
            const tex = signTextures?.[s.scene] || signTextures?.[s.type] || null;
            return (
              <group
                // eslint-disable-next-line react/no-array-index-key
                key={`sign-${idx}`}
                ref={(el) => {
                  signGroupRefs.current[idx] = el;
                }}
                position={[s.x, s.y, s.z]}
                rotation={[0, s.yaw, 0]}
                scale={[s.s, s.s, s.s]}
              >
                {/* Post (grounded, not floating) */}
                <mesh position={[0, 0.92, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.06, 0.07, 1.85, 10, 1]} />
                  <primitive object={woodMat} attach="material" />
                </mesh>

                {/* Wooden sign board (uniform wood color) */}
                <mesh position={[0, 1.65, -0.02]} castShadow receiveShadow>
                  <boxGeometry args={[0.92, 0.62, 0.08]} />
                  <primitive object={woodMat} attach="material" />
                </mesh>

                {/* Dark wood-ink label (decal) */}
                {tex ? (
                  <mesh position={[0, 1.65, 0.03]} renderOrder={8}>
                    <planeGeometry args={[0.82, 0.58]} />
                    <meshBasicMaterial
                      ref={(m) => {
                        signPanelMatRefs.current[idx] = m;
                      }}
                      map={tex}
                      transparent
                      opacity={0.92}
                      toneMapped={false}
                      depthWrite={false}
                    />
                  </mesh>
                ) : null}
              </group>
            );
          })}
        </group>
      ) : null}

      {/* Subtle ground wayfinding markers near each junction */}
      {portals?.length ? (
        <group>
          {portals.map((p, idx) => {
            if (!p?.junction) return null;
            const yaw = p.junctionYaw ?? 0;
            const side = typeof p.side === 'number' ? Math.sign(p.side) || 1 : 1;
            const leftX = Math.cos(yaw);
            const leftZ = -Math.sin(yaw);
            const x = p.junction.x + leftX * 0.95 * side;
            const z = p.junction.z + leftZ * 0.95 * side;
            const y = floorY + forestTerrainHeight(x, z) + pathSurfaceLift + 0.012;
            const accent = p.accent || '#7afcff';
            return (
              <group
                // eslint-disable-next-line react/no-array-index-key
                key={`marker-${idx}`}
                position={[x, y, z]}
                rotation={[0, yaw, 0]}
              >
                <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
                  <planeGeometry args={[0.95, 0.18]} />
                  <meshBasicMaterial
                    ref={(m) => {
                      markerMatRefs.current[idx] = m;
                      if (m) m.userData._meta = { x, z };
                    }}
                    color={accent}
                    transparent
                    opacity={0.0}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      ) : null}

      {/* Active Rooms: spur paths + portals emerging from the ground */}
      {portals.length ? (
        <group>
          {portals.map((p, idx) => (
            <group key={`room-${p.scene || 'unknown'}-${idx}`}>
              {/* Occluding hills along the spur (gradual reveal) */}
              {Array.isArray(p.hills) && p.hills.length ? (
                <group>
                  {p.hills.map((h, hi) => (
                    <mesh
                      // eslint-disable-next-line react/no-array-index-key
                      key={`hill-${idx}-${hi}`}
                      position={[h.x, h.y, h.z]}
                      scale={[h.sx || 1, h.sy || 1, h.sz || 1]}
                      castShadow
                      receiveShadow
                    >
                      <dodecahedronGeometry args={[h.r || 1.5, 0]} />
                      <meshStandardMaterial color={'#43c75a'} roughness={1} metalness={0} />
                    </mesh>
                  ))}
                </group>
              ) : null}

              {/* Spur path */}
              <mesh geometry={p.spurGeo} receiveShadow>
                <meshStandardMaterial
                  ref={(m) => {
                    spurMatRefs.current[idx] = m;
                  }}
                  color={'#a58b63'}
                  roughness={0.92}
                  metalness={0}
                  emissive={'#a58b63'}
                  emissiveIntensity={0.05}
                  transparent
                  opacity={0.94}
                />
              </mesh>

              {/* Entrance gate + discovery breadcrumbs */}
              {p.junction ? (
                <group position={[p.junction.x, p.junction.y, p.junction.z]} rotation={[0, p.entranceYaw || 0, 0]}>
                  {/* Gate style: privacy = between two hills; shop = wide arch; password = "hidden" mound */}
                  {p.scene === 'privacy' ? (
                    <group>
                      <mesh position={[-1.05, 0.70, -0.55]} scale={[1.05, 1.45, 1.0]} castShadow receiveShadow>
                        <dodecahedronGeometry args={[0.65, 0]} />
                        <meshStandardMaterial color={'#4b2616'} roughness={0.95} metalness={0.05} />
                      </mesh>
                      <mesh position={[1.05, 0.70, -0.55]} scale={[1.05, 1.45, 1.0]} castShadow receiveShadow>
                        <dodecahedronGeometry args={[0.65, 0]} />
                        <meshStandardMaterial color={'#4b2616'} roughness={0.95} metalness={0.05} />
                      </mesh>
                    </group>
                  ) : p.scene === 'shop' ? (
                    <group position={[0, 1.05, -0.55]}>
                      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                        <torusGeometry args={[1.45, 0.16, 10, 36]} />
                        <meshStandardMaterial color={'#ff7eb6'} roughness={0.35} metalness={0.05} emissive={'#ff7eb6'} emissiveIntensity={0.06} />
                      </mesh>
                    </group>
                  ) : (
                    <group>
                      <mesh position={[0, 0.65, -0.55]} scale={[1.6, 1.35, 1.2]} castShadow receiveShadow>
                        <dodecahedronGeometry args={[0.75, 0]} />
                        <meshStandardMaterial color={'#4b2616'} roughness={0.98} metalness={0.02} />
                      </mesh>
                    </group>
                  )}

                  {/* Breadcrumb candies */}
                  {Array.isArray(p.crumbs) && p.crumbs.length ? (
                    <group>
                      {p.crumbs.map((c, i) => (
                        <mesh
                          // eslint-disable-next-line react/no-array-index-key
                          key={`crumb-${idx}-${i}`}
                          position={[c.x - p.junction.x, 0.06, c.z - p.junction.z]}
                          scale={[c.s, c.s, c.s]}
                          castShadow
                        >
                          <icosahedronGeometry args={[0.22, 0]} />
                          <meshStandardMaterial
                            color={c.a}
                            emissive={c.a}
                            emissiveIntensity={p.scene === 'password' ? 0.10 : 0.18}
                            roughness={0.35}
                            metalness={0.05}
                            transparent
                            opacity={0.92}
                          />
                        </mesh>
                      ))}
                    </group>
                  ) : null}
                </group>
              ) : null}

              {/* Portal platform + room volume */}
              <group
                ref={(el) => {
                  portalGroupRefs.current[idx] = el;
                }}
                position={[p.platform.x, p.platform.y - 1.15, p.platform.z]}
                rotation={[0, p.yaw, 0]}
              >
                {/* Platform base */}
                <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[2.35, 2.55, 0.16, 24, 1]} />
                  <meshStandardMaterial color={'#a58b63'} roughness={0.95} metalness={0} />
                </mesh>

                {/* Neon ring */}
                <mesh position={[0, 0.17, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={3}>
                  <torusGeometry args={[2.05, 0.08, 10, 40]} />
                  <meshStandardMaterial
                    ref={(m) => {
                      ringMatRefs.current[idx] = m;
                    }}
                    color={'#ffffff'}
                    roughness={0.25}
                    metalness={0.15}
                    emissive={p.accent || '#7afcff'}
                    emissiveIntensity={0.25}
                  />
                </mesh>

                {/* Frosted-glass room volume (teaser) */}
                <mesh position={[0, 0.85, 0.55]} castShadow receiveShadow>
                  <boxGeometry args={[3.15, 1.55, 2.55]} />
                  <meshPhysicalMaterial
                    color={'#ffffff'}
                    roughness={0.22}
                    metalness={0.02}
                    clearcoat={1}
                    clearcoatRoughness={0.35}
                    transparent
                    opacity={0.18}
                  />
                </mesh>

                {/* Gate frame */}
                <group position={[0, 0.16, -1.30]}>
                  <mesh position={[-1.05, 1.05, 0]} castShadow>
                    <boxGeometry args={[0.18, 2.2, 0.18]} />
                    <meshStandardMaterial
                      color={'#0e0f14'}
                      roughness={0.35}
                      metalness={0.45}
                      emissive={p.accent || '#7afcff'}
                      emissiveIntensity={0.35}
                    />
                  </mesh>
                  <mesh position={[1.05, 1.05, 0]} castShadow>
                    <boxGeometry args={[0.18, 2.2, 0.18]} />
                    <meshStandardMaterial
                      color={'#0e0f14'}
                      roughness={0.35}
                      metalness={0.45}
                      emissive={p.accent || '#7afcff'}
                      emissiveIntensity={0.35}
                    />
                  </mesh>
                  <mesh position={[0, 2.16, 0]} castShadow>
                    <boxGeometry args={[2.35, 0.18, 0.18]} />
                    <meshStandardMaterial
                      color={'#0e0f14'}
                      roughness={0.35}
                      metalness={0.45}
                      emissive={p.accent || '#7afcff'}
                      emissiveIntensity={0.35}
                    />
                  </mesh>

                  {/* Energy screen */}
                  <mesh position={[0, 1.10, 0.02]} renderOrder={6}>
                    <planeGeometry args={[2.05, 2.05, 1, 1]} />
                    <meshBasicMaterial
                      ref={(m) => {
                        screenMatRefs.current[idx] = m;
                      }}
                      color={p.accent || '#7afcff'}
                      transparent
                      opacity={0.78}
                      blending={THREE.AdditiveBlending}
                      depthWrite={false}
                      toneMapped={false}
                    />
                  </mesh>
                </group>

                {/* Grounded bushes to blend the platform into the forest */}
                {Array.from({ length: 12 }, (_, i) => {
                  const a = (i / 12) * Math.PI * 2;
                  const rr = 2.55 + prand(i + idx * 999 + 8000) * 0.55;
                  const x = Math.cos(a) * rr;
                  const z = Math.sin(a) * rr;
                  const s = 0.28 + prand(i + idx * 999 + 8100) * 0.22;
                  return (
                    <mesh
                      // eslint-disable-next-line react/no-array-index-key
                      key={`blend-${idx}-${i}`}
                      position={[x, 0.12, z]}
                      scale={[s, 0.55 + s, s]}
                      castShadow
                      receiveShadow
                    >
                      <dodecahedronGeometry args={[0.55, 0]} />
                      <meshStandardMaterial color={'#2f8a4a'} roughness={1} metalness={0} />
                    </mesh>
                  );
                })}
              </group>
            </group>
          ))}
        </group>
      ) : null}

      {/* Path details: small pebbles */}
      {treeData.pathPebbles?.length ? (
        <instancedMesh ref={pathPebbleRef} args={[null, null, treeData.pathPebbles.length]} frustumCulled={false} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 0]} />
          <primitive object={pathPebbleMat} attach="material" />
        </instancedMesh>
      ) : null}

      {/* Path edge stones */}
      {treeData.edgeStones?.length ? (
        <instancedMesh ref={edgeStoneRef} args={[null, null, treeData.edgeStones.length]} frustumCulled={false} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <primitive object={edgeStoneMat} attach="material" />
        </instancedMesh>
      ) : null}

      {/* Fallen leaves (autumn piles) */}
      {treeData.leafPiles?.length ? (
        <instancedMesh ref={leafPileRef} args={[null, null, treeData.leafPiles.length]} frustumCulled={false} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <primitive object={leafPileMat} attach="material" />
        </instancedMesh>
      ) : null}

      {/* Occasional roots crossing the path */}
      {treeData.pathRoots?.length
        ? treeData.pathRoots.map((r, idx) => (
          <mesh
            key={`root-${idx}`}
            position={[r.x, floorY + 0.055, r.z]}
            rotation={[Math.PI / 2, r.yaw, 0]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[r.r, r.r * 0.85, r.len, 7, 1]} />
            <primitive object={rootMat} attach="material" />
          </mesh>
        ))
        : null}

      {/* Water (two lakes) */}
      {treeData.lake || treeData.lake2 ? (
        <group>
          {[treeData.lake, treeData.lake2].filter(Boolean).map((lk, idx) => (
            <group key={`lake-${idx}`}>
              {lk.kind === 'organic' && lake2WaterGeo ? (
                <mesh rotation={[-Math.PI / 2, lk.yaw, 0]} position={[lk.x, floorY + 0.031, lk.z]} receiveShadow>
                  <primitive object={lake2WaterGeo} attach="geometry" />
                  <primitive object={waterMat2} attach="material" />
                </mesh>
              ) : (
                <mesh rotation={[-Math.PI / 2, lk.yaw, 0]} position={[lk.x, floorY + 0.031, lk.z]} scale={[lk.rx, lk.rz, 1]} receiveShadow>
                  <circleGeometry args={[1, 96]} />
                  <primitive object={waterMat} attach="material" />
                </mesh>
              )}

              {/* Sun glint reflection */}
              {lakeGlintTex ? (
                <mesh
                  rotation={[-Math.PI / 2, lk.yaw + 0.35, 0]}
                  position={[lk.x, floorY + 0.033, lk.z]}
                  scale={[(lk.rx ?? lk.r ?? 1) * 0.72, (lk.rz ?? lk.r ?? 1) * 0.34, 1]}
                  renderOrder={5}
                >
                  <circleGeometry args={[1, 96]} />
                  <meshBasicMaterial
                    map={lakeGlintTex}
                    alphaMap={(lk.kind === 'organic' ? lake2MaskTex : lakeMaskTex) || undefined}
                    transparent
                    opacity={0.15}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    toneMapped={false}
                  />
                </mesh>
              ) : null}
            </group>
          ))}
        </group>
      ) : null}

      {/* Hammocks (orange/pink) tied between trees */}
      {hammocks?.length ? (
        <group>
          {hammocks.map((h, idx) => (
            // eslint-disable-next-line react/no-array-index-key
            <group key={`hammock-${idx}`} position={[h.mx, h.my, h.mz]} rotation={[0, h.yaw, 0]}>
              {/* hammock bed */}
              <mesh castShadow receiveShadow>
                <primitive object={h.geom} attach="geometry" />
                <meshStandardMaterial color={h.bedColor || (h.variant === 0 ? '#ff7eb6' : '#ff8f2b')} roughness={0.85} metalness={0.0} />
              </mesh>
              {/* simple rope line */}
              <mesh position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.018, 0.018, h.len, 8, 1, true]} />
                <meshStandardMaterial color={'#f1eadf'} roughness={0.92} metalness={0.0} />
              </mesh>
            </group>
          ))}
        </group>
      ) : null}

      {/* Light & reflections props */}
      {/* (No airborne props) */}

      {/* Ancient mirrors */}
      {propsData.mirrors.map((m, idx) => (
        <group key={`mirror-${idx}`} position={[m.x, floorY, m.z]} rotation={[0, m.yaw, 0]} scale={[m.s * PROP_SCALE, m.s * PROP_SCALE, m.s * PROP_SCALE]}>
          {/* frame */}
          <mesh position={[0, 1.65, 0.02]} castShadow receiveShadow>
            <boxGeometry args={[2.1, 3.0, 0.18]} />
            <primitive object={woodMat} attach="material" />
          </mesh>
          {/* mirror surface */}
          <mesh position={[0, 1.65, 0.12]}>
            <planeGeometry args={[1.72, 2.56, 1, 1]} />
            <primitive object={mirrorMat} attach="material" />
          </mesh>
          {/* base */}
          <mesh position={[0, 0.18, -0.20]} castShadow receiveShadow>
            <boxGeometry args={[1.0, 0.22, 0.8]} />
            <primitive object={woodMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Rustic swings */}
      {propsData.swings.map((s, idx) => (
        <group key={`swing-${idx}`} position={[s.x, floorY, s.z]} rotation={[0, s.yaw, 0]} scale={[s.s * PROP_SCALE, s.s * PROP_SCALE, s.s * PROP_SCALE]}>
          {/* Soft contact shadow to "stick" the swing to the ground */}
          {softShadowTex ? (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[2.6, 1.8, 1]} renderOrder={3}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial map={softShadowTex} transparent opacity={0.42} depthWrite={false} />
            </mesh>
          ) : null}

          {/* Frame (anchored posts + top beam + footings) */}
          <mesh position={[0, 2.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.1, 0.12, 0.16]} />
            <primitive object={woodMat} attach="material" />
          </mesh>
          {[
            [-0.78, 1.25, -0.48],
            [-0.78, 1.25, 0.48],
            [0.78, 1.25, -0.48],
            [0.78, 1.25, 0.48],
          ].map((p, j) => (
            <group key={`post-${j}`} position={[p[0], 0, p[2]]}>
              <mesh position={[0, p[1], 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.09, 0.11, 2.55, 10]} />
                <primitive object={woodMat} attach="material" />
              </mesh>
              {/* footing */}
              <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.18, 0.22, 0.12, 14]} />
                <primitive object={metalMat} attach="material" />
              </mesh>
            </group>
          ))}

          {/* Little grass around footings to soften the hard edge */}
          {Array.from({ length: 12 }, (_, k) => {
            const feet = [
              [-0.78, -0.48],
              [-0.78, 0.48],
              [0.78, -0.48],
              [0.78, 0.48],
            ];
            const f = feet[k % feet.length];
            const ox = (prand(idx * 1000 + k * 17 + 700) - 0.5) * 0.42;
            const oz = (prand(idx * 1000 + k * 17 + 701) - 0.5) * 0.42;
            const ss = 0.16 + prand(idx * 1000 + k * 17 + 702) * 0.12;
            const yaw = prand(idx * 1000 + k * 17 + 703) * Math.PI * 2;
            return (
              <mesh key={`swing-grass-${k}`} position={[f[0] + ox, 0.03, f[1] + oz]} rotation={[0, yaw, 0]} castShadow>
                <coneGeometry args={[0.11 * ss, 0.28 * ss, 6, 1]} />
                <primitive object={grassClumpMat} attach="material" />
              </mesh>
            );
          })}

          {/* Swinging seat assembly */}
          <group position={[0, 2.55, 0]} ref={idx === 0 ? swingRef : undefined}>
            {/* ropes */}
            <mesh position={[-0.34, -1.1, 0]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 2.2, 8]} />
              <primitive object={ropeMat} attach="material" />
            </mesh>
            <mesh position={[0.34, -1.1, 0]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 2.2, 8]} />
              <primitive object={ropeMat} attach="material" />
            </mesh>
            {/* plank */}
            <mesh position={[0, -2.25, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.95, 0.10, 0.35]} />
              <primitive object={woodMat} attach="material" />
            </mesh>
          </group>
        </group>
      ))}

      {/* Old ladders with pots/jars */}
      {propsData.ladders.map((l, idx) => (
        <group key={`ladder-${idx}`} position={[l.x, floorY, l.z]} rotation={[0, l.yaw, 0]} scale={[l.s * PROP_SCALE, l.s * PROP_SCALE, l.s * PROP_SCALE]}>
          <group rotation={[0, 0, -0.35]} position={[0, 0, 0]}>
            <mesh position={[-0.35, 1.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.10, 2.8, 0.10]} />
              <primitive object={woodMat} attach="material" />
            </mesh>
            <mesh position={[0.35, 1.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.10, 2.8, 0.10]} />
              <primitive object={woodMat} attach="material" />
            </mesh>
            {Array.from({ length: 5 }, (_, r) => (
              <mesh key={r} position={[0, 0.55 + r * 0.48, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.78, 0.06, 0.12]} />
                <primitive object={woodMat} attach="material" />
              </mesh>
            ))}

            {/* pot */}
            <mesh position={[0.10, 2.55, 0.12]} castShadow receiveShadow>
              <cylinderGeometry args={[0.12, 0.16, 0.20, 12]} />
              <meshStandardMaterial color={'#d77a3a'} roughness={0.9} metalness={0} />
            </mesh>
            <mesh position={[0.10, 2.70, 0.12]} castShadow>
              <sphereGeometry args={[0.18, 12, 10]} />
              <meshStandardMaterial color={'#2f8a3b'} roughness={0.9} metalness={0} />
            </mesh>

            {/* jar */}
            <mesh position={[-0.18, 2.45, 0.14]} castShadow>
              <cylinderGeometry args={[0.10, 0.12, 0.22, 12]} />
              <meshPhysicalMaterial color={'#ffffff'} transmission={0.9} thickness={0.3} roughness={0.1} />
            </mesh>
            <mesh position={[-0.18, 2.33, 0.14]} castShadow>
              <cylinderGeometry args={[0.09, 0.09, 0.06, 10]} />
              <primitive object={woodMat} attach="material" />
            </mesh>
          </group>
        </group>
      ))}

      {/* Explorer corners: table + maps + magnifier + books + easel */}
      {propsData.explorers.map((e, idx) => (
      <group key={`explorer-${idx}`} position={[e.x, floorY, e.z]} rotation={[0, e.yaw, 0]} scale={[e.s * PROP_SCALE, e.s * PROP_SCALE, e.s * PROP_SCALE]}>
        {/* table */}
        <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.12, 1.2]} />
          <primitive object={woodMat} attach="material" />
        </mesh>
        {[
          [-0.95, 0.30, -0.48],
          [0.95, 0.30, -0.48],
          [-0.95, 0.30, 0.48],
          [0.95, 0.30, 0.48],
        ].map((p, idx) => (
          <mesh key={`leg-${idx}`} position={[p[0], p[1], p[2]]} castShadow receiveShadow>
            <boxGeometry args={[0.10, 0.60, 0.10]} />
            <primitive object={woodMat} attach="material" />
          </mesh>
        ))}

        {/* maps */}
        <mesh position={[-0.25, 0.69, 0.05]} rotation={[-Math.PI / 2, 0.25, 0]}>
          <planeGeometry args={[1.4, 0.8]} />
          <meshStandardMaterial color={'#f5e9c8'} roughness={0.95} metalness={0} />
        </mesh>
        <mesh position={[0.35, 0.70, -0.20]} rotation={[-Math.PI / 2, -0.35, 0]}>
          <planeGeometry args={[0.9, 0.55]} />
          <meshStandardMaterial color={'#efe0b2'} roughness={0.95} metalness={0} />
        </mesh>

        {/* magnifying glass */}
        <mesh position={[0.62, 0.72, 0.25]} rotation={[-Math.PI / 2, 0.2, 0]} castShadow>
          <torusGeometry args={[0.16, 0.03, 10, 22]} />
          <primitive object={metalMat} attach="material" />
        </mesh>
        <mesh position={[0.78, 0.72, 0.33]} rotation={[-Math.PI / 2, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.22, 10]} />
          <primitive object={woodMat} attach="material" />
        </mesh>
        <mesh position={[0.62, 0.72, 0.25]} rotation={[-Math.PI / 2, 0.2, 0]}>
          <circleGeometry args={[0.135, 18]} />
          <meshPhysicalMaterial color={'#ffffff'} transmission={0.9} thickness={0.2} roughness={0.08} opacity={0.85} transparent />
        </mesh>

        {/* books */}
        <mesh position={[-0.72, 0.70, -0.24]} rotation={[0, 0.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.08, 0.28]} />
          <meshStandardMaterial color={'#6b2a2a'} roughness={0.9} metalness={0.05} />
        </mesh>
        <mesh position={[-0.56, 0.78, -0.18]} rotation={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.07, 0.26]} />
          <meshStandardMaterial color={'#2a3a6b'} roughness={0.9} metalness={0.05} />
        </mesh>

        {/* easel + canvas */}
        <group position={[2.1, 0, -0.4]} rotation={[0, -0.75, 0]}>
          <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 1.8, 0.08]} />
            <primitive object={woodMat} attach="material" />
          </mesh>
          <mesh position={[-0.35, 0.65, 0]} rotation={[0, 0, 0.12]} castShadow receiveShadow>
            <boxGeometry args={[0.07, 1.3, 0.07]} />
            <primitive object={woodMat} attach="material" />
          </mesh>
          <mesh position={[0.35, 0.65, 0]} rotation={[0, 0, -0.12]} castShadow receiveShadow>
            <boxGeometry args={[0.07, 1.3, 0.07]} />
            <primitive object={woodMat} attach="material" />
          </mesh>
          <mesh position={[0, 1.08, 0.12]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.95, 0.70]} />
            <meshStandardMaterial color={'#ffffff'} roughness={0.95} metalness={0} />
          </mesh>
          {/* half-painted */}
          <mesh position={[0, 1.08, 0.121]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.95, 0.70]} />
            <meshBasicMaterial color={'#7fd26c'} transparent opacity={0.22} />
          </mesh>
        </group>
      </group>
      ))}

      {/* Picnic blanket + baskets */}
      {propsData.picnics.map((p, idx) => (
        <group key={`picnic-${idx}`} position={[p.x, floorY + 0.02, p.z]} rotation={[0, p.yaw, 0]} scale={[p.s * PROP_SCALE, p.s * PROP_SCALE, p.s * PROP_SCALE]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[3.2, 2.2, 1, 1]} />
            <meshStandardMaterial color={'#f7f1e6'} roughness={0.95} metalness={0} />
          </mesh>
          <mesh position={[-0.65, 0.12, 0.10]} castShadow receiveShadow>
            <boxGeometry args={[0.55, 0.26, 0.40]} />
            <meshStandardMaterial color={'#caa56a'} roughness={0.95} metalness={0} />
          </mesh>
          <mesh position={[-0.65, 0.28, 0.10]} castShadow>
            <sphereGeometry args={[0.18, 12, 10]} />
            <meshStandardMaterial color={'#b13b3b'} roughness={0.8} metalness={0} />
          </mesh>
          <mesh position={[0.55, 0.10, -0.25]} castShadow receiveShadow>
            <boxGeometry args={[0.42, 0.22, 0.34]} />
            <meshStandardMaterial color={'#caa56a'} roughness={0.95} metalness={0} />
          </mesh>
        </group>
      ))}

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
  robotRef: PropTypes.shape({ current: PropTypes.any }),
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
  roomPortals: PropTypes.arrayOf(
    PropTypes.shape({
      scene: PropTypes.string,
      label: PropTypes.string,
      accent: PropTypes.string,
      t: PropTypes.number,
      side: PropTypes.number,
    })
  ),
  completion: PropTypes.object,
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
