import CyberpunkCanvasBackdrop from './CyberpunkCanvasBackdrop.jsx';
/* eslint-disable react/no-unknown-property */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import PropTypes from 'prop-types';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Bloom, EffectComposer, GodRays } from '@react-three/postprocessing';
import RobotModel from './RobotModel.jsx';
import { SCENES } from './context/gameState.js';
import { CANDY_PATH_POINTS, MAP_NODES, MAP_Y } from './game/mapTargets.js';
import { useKeyboard } from './useKeyboard';
import { CyberpunkWorld } from './CyberpunkWorld.jsx';
import { forestTerrainHeight, FOREST_PATH_SURFACE_LIFT, ForestSky, ForestWorld } from './ForestWorld.jsx';

function smoothstep01(x) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}
function dampAngle(current, target, alpha) {
  const d = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + d * alpha;
}

function ScreenTintOverlay({ color = '#6B5B95', opacity = 0.15 }) {
  const meshRef = useRef(null);
  const { camera } = useThree();
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpDir = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const m = meshRef.current;
    if (!m || !camera) return;
    camera.getWorldPosition(tmpPos);
    camera.getWorldQuaternion(tmpQuat);
    tmpDir.set(0, 0, -1).applyQuaternion(tmpQuat);
    // Place just in front of the camera.
    m.position.copy(tmpPos).addScaledVector(tmpDir, 0.22);
    m.quaternion.copy(tmpQuat);
  });

  return (
    <mesh ref={meshRef} renderOrder={999}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  );
}

ScreenTintOverlay.propTypes = {
  color: PropTypes.string,
  opacity: PropTypes.number,
};

const CANDY = Object.freeze({
  // Requested palette
  cottonCandyPink: '#FFB7D5',
  skyBlue: '#87CEEB',
  mint: '#98FF98',
  lemon: '#FFF44F',
  // Sky gradient
  skyOrange: '#FFC58A',
  skyPurple: '#D7B7FF',
  // Materials
  ground: '#FFF0FA',
  roadRed: '#FF2A6D',
  roadWhite: '#FFF7FF',
  grape: '#8A2BFF',
  chocolate: '#4B2616',
});



function prand(n) {
  // Deterministic pseudo-random in [0,1). Avoids Math.random() (lint purity rule).
  const x = Math.sin(n * 999.123 + n * n * 0.17) * 43758.5453123;
  return x - Math.floor(x);
}

function makePastelSkyTexture({ width = 512, height = 512 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, CANDY.skyOrange);
  g.addColorStop(0.5, '#fff7fd');
  g.addColorStop(1, CANDY.skyPurple);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Soft cloud blobs.
  for (let i = 0; i < 14; i += 1) {
    const x = prand(i + 2) * width;
    const y = prand(i + 25) * height * 0.6;
    const r = 40 + prand(i + 71) * 110;
    ctx.globalAlpha = 0.12 + prand(i + 90) * 0.12;
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fff0fb';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Tiny sparkles.
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (let i = 0; i < 180; i += 1) {
    const x = ((i * 73) % width) + ((i % 7) * 3);
    const y = ((i * 41) % height) * 0.75;
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCandyIconTexture({ type, size = 256 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const roundRect = (x, y, w, h, rr) => {
    const r = Math.max(0, Math.min(rr, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  ctx.clearRect(0, 0, size, size);

  const centerX = size / 2;
  const centerY = size / 2;
  const r = size * 0.34;

  // Soft glow backdrop
  const glow = ctx.createRadialGradient(centerX, centerY, r * 0.1, centerX, centerY, r * 1.15);
  glow.addColorStop(0, 'rgba(255,183,213,0.55)');
  glow.addColorStop(0.6, 'rgba(135,206,235,0.22)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(centerX, centerY, r * 1.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const stroke = type === 'lock' ? 'rgba(135,206,235,0.92)' : 'rgba(255,90,142,0.92)';
  const stroke2 = type === 'lock' ? 'rgba(255,244,79,0.70)' : 'rgba(152,255,152,0.70)';

  ctx.lineWidth = size * 0.06;
  ctx.strokeStyle = stroke;
  ctx.shadowColor = stroke;
  ctx.shadowBlur = size * 0.10;

  if (type === 'lock') {
    // Simple lock icon
    const w = size * 0.38;
    const h = size * 0.28;
    const x0 = centerX - w / 2;
    const y0 = centerY + size * 0.04;
    roundRect(x0, y0, w, h, size * 0.08);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, y0, size * 0.16, Math.PI, 0);
    ctx.stroke();
  } else {
    // Simple shield icon
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - r * 1.05);
    ctx.bezierCurveTo(centerX + r * 1.0, centerY - r * 0.65, centerX + r * 0.7, centerY + r * 0.85, centerX, centerY + r * 1.05);
    ctx.bezierCurveTo(centerX - r * 0.7, centerY + r * 0.85, centerX - r * 1.0, centerY - r * 0.65, centerX, centerY - r * 1.05);
    ctx.closePath();
    ctx.stroke();
  }

  // Secondary highlight stroke
  ctx.shadowBlur = 0;
  ctx.lineWidth = size * 0.03;
  ctx.strokeStyle = stroke2;
  ctx.globalAlpha = 0.95;
  ctx.stroke();
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCandyStripeTexture({ size = 512 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = CANDY.roadWhite;
  ctx.fillRect(0, 0, size, size);

  // Diagonal candy-cane stripes.
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.translate(-size / 2, -size / 2);
  const stripeW = Math.max(18, Math.floor(size / 16));
  for (let x = -size; x < size * 2; x += stripeW * 2) {
    ctx.fillStyle = CANDY.roadRed;
    ctx.fillRect(x, -size, stripeW, size * 3);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 1);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSprinkleTexture({ size = 512 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = CANDY.ground;
  ctx.fillRect(0, 0, size, size);

  const colors = [CANDY.roadRed, CANDY.grape, CANDY.mint, CANDY.lemon, '#ff9bf6', '#7afcff'];
  for (let i = 0; i < 220; i += 1) {
    const x = ((i * 97) % size) + (i % 11);
    const y = ((i * 53) % size) + ((i % 5) * 2);
    const c = colors[i % colors.length];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((i % 13) / 13) * Math.PI);
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.65;
    ctx.fillRect(-2, -1, 5, 2);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCandyBoardTexture({ size = 512, tiles = 10 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Soft pastel base.
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#fff7fd');
  bg.addColorStop(0.35, CANDY.ground);
  bg.addColorStop(1, '#fff2fb');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const tile = size / tiles;
  const pad = Math.max(3, Math.floor(tile * 0.10));
  const rr = Math.max(10, Math.floor(tile * 0.26));

  const tileColors = [CANDY.cottonCandyPink, CANDY.skyBlue, CANDY.mint, CANDY.lemon];

  const roundRect = (x, y, w, h, r) => {
    const rr2 = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr2, y);
    ctx.lineTo(x + w - rr2, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr2);
    ctx.lineTo(x + w, y + h - rr2);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr2, y + h);
    ctx.lineTo(x + rr2, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr2);
    ctx.lineTo(x, y + rr2);
    ctx.quadraticCurveTo(x, y, x + rr2, y);
    ctx.closePath();
  };

  // Jelly tiles with glossy highlights.
  for (let ty = 0; ty < tiles; ty += 1) {
    for (let tx = 0; tx < tiles; tx += 1) {
      const x0 = tx * tile + pad;
      const y0 = ty * tile + pad;
      const w = tile - pad * 2;
      const h = tile - pad * 2;
      const idx = (tx + ty * 3) % tileColors.length;
      const base = tileColors[idx];

      // Base fill.
      roundRect(x0, y0, w, h, rr);
      ctx.fillStyle = base;
      ctx.globalAlpha = 0.22;
      ctx.fill();

      // Inner tint.
      roundRect(x0 + 2, y0 + 2, w - 4, h - 4, rr * 0.9);
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Specular highlight.
      const g = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.28, 'rgba(255,255,255,0.10)');
      g.addColorStop(1, 'rgba(255,255,255,0.00)');
      roundRect(x0 + 3, y0 + 3, w - 6, h - 6, rr * 0.85);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = g;
      ctx.fill();

      // Soft outline.
      roundRect(x0 + 1, y0 + 1, w - 2, h - 2, rr * 0.95);
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = Math.max(2, Math.floor(tile * 0.05));
      ctx.strokeStyle = 'rgba(255,255,255,0.70)';
      ctx.stroke();
    }
  }

  // Tiny sparkles.
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (let i = 0; i < 260; i += 1) {
    const x = ((i * 71) % size) + ((i % 7) * 2);
    const y = ((i * 47) % size) + ((i % 5) * 2);
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 2.2);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeVortexTexture({ size = 512 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);

  // Soft radial glow.
  const g = ctx.createRadialGradient(0, 0, size * 0.02, 0, 0, size * 0.5);
  g.addColorStop(0, 'rgba(255,255,255,0.0)');
  g.addColorStop(0.35, 'rgba(255,183,213,0.16)');
  g.addColorStop(0.6, 'rgba(135,206,235,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Candy spiral strokes.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const colors = ['rgba(255,42,109,0.90)', 'rgba(152,255,152,0.75)', 'rgba(138,43,255,0.75)', 'rgba(255,244,79,0.70)'];
  for (let k = 0; k < 4; k += 1) {
    ctx.strokeStyle = colors[k];
    ctx.lineWidth = size * (0.018 - k * 0.0025);
    ctx.shadowColor = colors[k];
    ctx.shadowBlur = size * 0.03;
    ctx.beginPath();
    const turns = 3.2;
    for (let i = 0; i <= 220; i += 1) {
      const t = i / 220;
      const a = t * Math.PI * 2 * turns + k * 0.6;
      const r = (t ** 0.65) * size * 0.44;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCaramelTexture({ size = 512 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#8b4a1d');
  g.addColorStop(0.25, '#c56a2a');
  g.addColorStop(0.55, '#ffbb6e');
  g.addColorStop(1, '#7a3a12');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Swirly syrup lines.
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = Math.max(2, Math.floor(size * 0.01));
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 14; i += 1) {
    ctx.beginPath();
    const y = (i / 14) * size;
    for (let x = 0; x <= size; x += 12) {
      const t = x / size;
      const wobble = Math.sin((t * Math.PI * 2 * 2) + i * 0.7) * (size * 0.02);
      const yy = y + wobble;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.5);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildCurveData(points) {
  const pts = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.25);
  curve.arcLengthDivisions = 900;
  const length = curve.getLength();

  const sampleCount = 900;
  const sampleTs = new Float32Array(sampleCount);
  const samplePts = Array.from({ length: sampleCount }, () => new THREE.Vector3());
  for (let i = 0; i < sampleCount; i += 1) {
    // For closed curves, avoid duplicating t=0 and t=1 (same point).
    const t = i / sampleCount;
    sampleTs[i] = t;
    samplePts[i].copy(curve.getPointAt(t));
  }
  return { curve, length, sampleTs, samplePts };
}

function closestTOnSamples(point, sampleTs, samplePts) {
  let bestI = 0;
  let bestD2 = Infinity;
  for (let i = 0; i < samplePts.length; i += 1) {
    const p = samplePts[i];
    const dx = p.x - point.x;
    const dz = p.z - point.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestI = i;
    }
  }
  return sampleTs[bestI];
}

function computePolylineT(routeXZ, pointXZ) {
  if (!Array.isArray(routeXZ) || routeXZ.length < 2) return 0;
  const px = Number(pointXZ?.[0] ?? 0);
  const pz = Number(pointXZ?.[1] ?? 0);

  let totalLen = 0;
  const segLens = [];
  for (let i = 0; i < routeXZ.length - 1; i += 1) {
    const a = routeXZ[i];
    const b = routeXZ[i + 1];
    const dx = (b[0] - a[0]);
    const dz = (b[1] - a[1]);
    const len = Math.max(1e-6, Math.hypot(dx, dz));
    segLens.push(len);
    totalLen += len;
  }

  let bestDist2 = Infinity;
  let bestAlong = 0;
  let acc = 0;
  for (let i = 0; i < routeXZ.length - 1; i += 1) {
    const a = routeXZ[i];
    const b = routeXZ[i + 1];
    const ax = a[0];
    const az = a[1];
    const bx = b[0];
    const bz = b[1];
    const vx = bx - ax;
    const vz = bz - az;
    const vv = vx * vx + vz * vz;
    const wx = px - ax;
    const wz = pz - az;
    const u = vv > 1e-9 ? Math.max(0, Math.min(1, (wx * vx + wz * vz) / vv)) : 0;
    const cx = ax + vx * u;
    const cz = az + vz * u;
    const dx = px - cx;
    const dz = pz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      bestAlong = acc + segLens[i] * u;
    }
    acc += segLens[i];
  }

  return totalLen > 0 ? bestAlong / totalLen : 0;
}

function RobotController({
  robotRef,
  controlsEnabled,
  gestureRef,
  floorY,
  curveData,
  roomPortals,
  autoWalkTarget,
  onAutoWalkArrived,
  idlePatrolEnabled,
  equippedItem,
  laptopCanvas,
  mode,
}) {
  const keys = useKeyboard();
  const scratch2 = useRef(new THREE.Vector3());
  const scratch3 = useRef(new THREE.Vector3());
  const tmpV = useRef(new THREE.Vector3());
  const prevP = useRef(new THREE.Vector3());
  const hasPrev = useRef(false);
  const prevYaw = useRef(0);

  useFrame(({ clock, camera }, delta) => {
    if (!robotRef.current) return;

    const robot = robotRef.current;
    robot.userData = robot.userData || {};

    // Cave mode: keep the robot inside the cave (no path walking), subtle breathing only.
    if (mode === 'cave') {
      const time = clock.getElapsedTime();
      robot.userData.setAction?.('Idle');
      robot.position.set(0, floorY + 0.02, 0);

      if (camera) {
        const toCamX = camera.position.x - robot.position.x;
        const toCamZ = camera.position.z - robot.position.z;
        robot.rotation.y = Math.atan2(toCamX, toCamZ);
        robot.rotation.z = 0;
      }

      const targetSX = 1.0 + 0.01 * Math.sin(time * 1.1);
      const targetSY = 1.0 - 0.008 * Math.sin(time * 1.1);
      const lerp = 1 - Math.exp(-delta * 10);
      robot.scale.x = robot.scale.x + (targetSX - robot.scale.x) * lerp;
      robot.scale.y = robot.scale.y + (targetSY - robot.scale.y) * lerp;
      robot.scale.z = robot.scale.z + (targetSX - robot.scale.z) * lerp;
      return;
    }

    // Cyberpunk (now sunset skyline) mode: robot is user-controlled only; no auto-walk.
    if (mode === 'cyberpunk') {
      const time = clock.getElapsedTime();
      const k = keys.current || {};

      const forward = (k.KeyW || k.ArrowUp) ? 1 : 0;
      const back = (k.KeyS || k.ArrowDown) ? 1 : 0;
      const left = (k.KeyA || k.ArrowLeft) ? 1 : 0;
      const right = (k.KeyD || k.ArrowRight) ? 1 : 0;

      const moveInput = (forward - back);
      const turnInput = (right - left);
      const hasInput = controlsEnabled !== false && (moveInput !== 0 || turnInput !== 0);

      // Initialize pose
      if (!robot.userData.cy) {
        robot.userData.cy = { yaw: Math.PI, x: 0, z: 0 };
      }

      const state = robot.userData.cy;
      const turnSpeed = 2.2; // rad/sec
      const walkSpeed = 1.6; // units/sec

      if (hasInput) {
        robot.userData.setAction?.('Walking');
        state.yaw += turnInput * turnSpeed * delta;
        // Forward is toward -Z when yaw ~= PI.
        const dirX = Math.sin(state.yaw);
        const dirZ = Math.cos(state.yaw);
        state.x += dirX * moveInput * walkSpeed * delta;
        state.z += dirZ * moveInput * walkSpeed * delta;

        // Sync leg cadence with input magnitude (smoothed to avoid jitter).
        const targetScale = Math.max(0.2, Math.min(2.2, Math.abs(moveInput) * 1.2));
        robot.userData._speedScaleSmoothed = robot.userData._speedScaleSmoothed ?? 1;
        const aS = 1 - Math.exp(-(delta || 0.016) * 10);
        robot.userData._speedScaleSmoothed += (targetScale - robot.userData._speedScaleSmoothed) * aS;
        robot.userData.setSpeedScale?.(robot.userData._speedScaleSmoothed);
      } else {
        robot.userData.setAction?.('Idle');
        robot.userData._speedScaleSmoothed = robot.userData._speedScaleSmoothed ?? 1;
        const aS = 1 - Math.exp(-(delta || 0.016) * 10);
        robot.userData._speedScaleSmoothed += (1 - robot.userData._speedScaleSmoothed) * aS;
        robot.userData.setSpeedScale?.(robot.userData._speedScaleSmoothed);
      }

      // Keep robot within a small playable band so the framing stays consistent.
      state.x = Math.max(-2.2, Math.min(2.2, state.x));
      state.z = Math.max(-3.0, Math.min(2.0, state.z));

      robot.rotation.y = state.yaw;
      robot.position.set(state.x, floorY, state.z);

      // Eye contact + greeting trigger.
      if (camera) {
        robot.userData.lookAtVec = robot.userData.lookAtVec || new THREE.Vector3();
        robot.userData.lookAtVec.copy(camera.position);

        const toCamX = camera.position.x - robot.position.x;
        const toCamZ = camera.position.z - robot.position.z;
        const toCamLen = Math.hypot(toCamX, toCamZ) || 1;
        const fwdX = Math.sin(robot.rotation.y);
        const fwdZ = Math.cos(robot.rotation.y);
        const dot = (fwdX * (toCamX / toCamLen)) + (fwdZ * (toCamZ / toCamLen));
        const dist = toCamLen;

        const wantsGreet = dot > 0.78 && dist < 10;
        robot.userData.greetHold = robot.userData.greetHold || 0;
        robot.userData.greetHold = wantsGreet
          ? Math.min(1.2, robot.userData.greetHold + delta)
          : Math.max(0, robot.userData.greetHold - delta * 2.0);
        robot.userData.greetActive = robot.userData.greetHold > 0.35;
      }

      // Subtle breathing only (no bobbing translation).
      const targetSX = 1.0 + 0.01 * Math.sin(time * 1.1);
      const targetSY = 1.0 - 0.008 * Math.sin(time * 1.1);
      const lerp = 1 - Math.exp(-delta * 10);
      robot.scale.x = robot.scale.x + (targetSX - robot.scale.x) * lerp;
      robot.scale.y = robot.scale.y + (targetSY - robot.scale.y) * lerp;
      robot.scale.z = robot.scale.z + (targetSX - robot.scale.z) * lerp;

      robot.position.y = Math.max(robot.position.y, floorY + 0.02);
      return;
    }

    if (!curveData?.curve) return;

    if (robot.userData.repositioning) {
      robot.userData.setAction?.('Idle');
      return;
    }

    if (typeof robot.userData.pathT !== 'number') {
      robot.userData.pathT = closestTOnSamples(robot.position, curveData.sampleTs, curveData.samplePts);
    }

    const time = clock.getElapsedTime();
    const length = curveData.length || 1;
    const baseSpeed = 2.2; // relaxed walking pace

    // Waze-style auto navigation (used by Destinations + portals).
    // If an auto-walk target is provided, the robot should move even when hand-control is disabled.
    const navActive = Array.isArray(autoWalkTarget) && autoWalkTarget.length >= 3;
    if (navActive) {
      robot.userData.nav = robot.userData.nav || { targetKey: '', targetT: 0, arrived: false };
      const key = `${Number(autoWalkTarget[0]).toFixed(3)}|${Number(autoWalkTarget[1]).toFixed(3)}|${Number(autoWalkTarget[2]).toFixed(3)}`;
      if (robot.userData.nav.targetKey !== key) {
        robot.userData.nav.targetKey = key;
        robot.userData.nav.arrived = false;
        const targetVec = scratch3.current;
        targetVec.set(Number(autoWalkTarget[0]), Number(autoWalkTarget[1]), Number(autoWalkTarget[2]));
        robot.userData.nav.targetT = closestTOnSamples(targetVec, curveData.sampleTs, curveData.samplePts);
      }
    }

    // Hand-controlled movement (requested): robot starts stopped and moves only after an "activate" hand gesture.
    // Commands (gestures):
    // - openPalm: activate/start robot
    // - iLoveYou: move backward (hold)
    // - peace: toggle speed x2
    // - fist: stop robot
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const g = gestureRef?.current;
    const gesture = String(g?.gesture || 'none');
    const hasHand = Boolean(g?.hasHand);

    robot.userData.handControl = robot.userData.handControl || {
      enabled: false,
      speedMult: 1,
      lastCmdAt: 0,
      lastGesture: 'none',
    };

    // Ensure we start stopped each fresh session.
    if (!robot.userData.handControl._initialized) {
      robot.userData.handControl.enabled = false;
      robot.userData.handControl.speedMult = 1;
      robot.userData.handControl.lastCmdAt = 0;
      robot.userData.handControl.lastGesture = 'none';
      robot.userData.handControl._initialized = true;
    }

    const cmdCooldownMs = 650;
    const isNewGesture = gesture !== robot.userData.handControl.lastGesture;
    if (hasHand && isNewGesture) {
      robot.userData.handControl.lastGesture = gesture;

      const canCmd = (nowMs - robot.userData.handControl.lastCmdAt) >= cmdCooldownMs;
      if (canCmd) {
        if (gesture === 'openPalm') {
          robot.userData.handControl.enabled = true;
          robot.userData.handControl.lastCmdAt = nowMs;
        } else if (gesture === 'fist') {
          robot.userData.handControl.enabled = false;
          robot.userData.handControl.lastCmdAt = nowMs;
        } else if (gesture === 'peace') {
          // Toggle x2 speed.
          robot.userData.handControl.speedMult = robot.userData.handControl.speedMult === 2 ? 1 : 2;
          robot.userData.handControl.lastCmdAt = nowMs;
        }
      }
    }

    // Keep keyboard reads referenced (avoid dead code) but do not use them in forest mode.
    void keys;
    void controlsEnabled;
    void idlePatrolEnabled;

    const enabled = Boolean(robot.userData.handControl.enabled);
    const speedMult = robot.userData.handControl.speedMult || 1;

    const moving = navActive ? !robot.userData.nav?.arrived : enabled;

    // Smooth transition between Idle/Walking so the start/stop isn't snappy.
    robot.userData._walkBlend = Number.isFinite(robot.userData._walkBlend) ? robot.userData._walkBlend : 0;
    const walkBlendA = 1 - Math.exp(-(delta || 0.016) * 10);
    robot.userData._walkBlend = THREE.MathUtils.lerp(robot.userData._walkBlend, moving ? 1 : 0, walkBlendA);
    const walkBlend = robot.userData._walkBlend;

    if (navActive) {
      // Move along the loop toward the target T (shortest direction around the ring).
      const targetT = Number(robot.userData.nav?.targetT ?? 0);
      const tNow = Number(robot.userData.pathT ?? 0);
      const forwardDist = ((targetT - tNow) % 1 + 1) % 1;
      const backwardDist = ((tNow - targetT) % 1 + 1) % 1;
      const navDir = forwardDist <= backwardDist ? 1 : -1;

      // Slow down gently near arrival, but cruise fast while far away.
      // NOTE: curve length is large, so we use a higher "navigation" speed than normal walking.
      const distT = Math.min(forwardDist, backwardDist);
      const near01 = 1 - THREE.MathUtils.smoothstep(distT, 0, 0.085); // 1 near target, 0 far
      const navSpeedMax = 16.0;
      const navSpeedMin = 6.5;
      const navSpeedUnits = THREE.MathUtils.lerp(navSpeedMax, navSpeedMin, near01);
      const dt = navDir * (navSpeedUnits / length) * delta;

      if (!robot.userData.nav?.arrived) {
        robot.userData.setAction?.('Walking');
        robot.userData.pathT = tNow + dt;
        robot.userData.pathT = ((robot.userData.pathT % 1) + 1) % 1;
      }

      // Arrival check: close on path + close in world space.
      const tAfter = Number(robot.userData.pathT ?? 0);
      const forwardAfter = ((targetT - tAfter) % 1 + 1) % 1;
      const backwardAfter = ((tAfter - targetT) % 1 + 1) % 1;
      const distAfter = Math.min(forwardAfter, backwardAfter);
      const pNow = curveData.curve.getPointAt(tAfter);
      const targetP = curveData.curve.getPointAt(targetT);
      const arrived = distAfter < 0.01 && pNow.distanceTo(targetP) < 1.1;
      if (arrived && !robot.userData.nav?.arrived) {
        robot.userData.nav.arrived = true;
        hasPrev.current = false;
        robot.userData.setAction?.('Idle');
        if (typeof onAutoWalkArrived === 'function') onAutoWalkArrived();
      }
    } else if (enabled) {
      const direction = gesture === 'iLoveYou' ? -1 : 1;
      const dt = direction * speedMult * (baseSpeed / length) * delta;
      robot.userData.setAction?.('Walking');
      robot.userData.pathT = robot.userData.pathT + dt;
      // Wrap 0..1
      robot.userData.pathT = ((robot.userData.pathT % 1) + 1) % 1;
    } else {
      robot.userData.setAction?.('Idle');
      hasPrev.current = false;
      // Smooth animation speed back toward 1.
      robot.userData._speedScaleSmoothed = robot.userData._speedScaleSmoothed ?? 1;
      const aS = 1 - Math.exp(-(delta || 0.016) * 10);
      robot.userData._speedScaleSmoothed += (1 - robot.userData._speedScaleSmoothed) * aS;
      robot.userData.setSpeedScale?.(robot.userData._speedScaleSmoothed);
    }

    // Keep robot centered; use path tangent for facing direction.
    const t = robot.userData.pathT;
    const p = curveData.curve.getPointAt(t);
    const tan = curveData.curve.getTangentAt(t);
    tan.y = 0;
    if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
    tan.normalize();

    scratch2.current.copy(tan);
    const yawTarget = Math.atan2(scratch2.current.x, scratch2.current.z);

    // Compute turn direction + intensity (for body lean + camera tilt).
    robot.userData._yawTargetPrev = Number.isFinite(robot.userData._yawTargetPrev) ? robot.userData._yawTargetPrev : yawTarget;
    const dyawTargetRaw = yawTarget - robot.userData._yawTargetPrev;
    const dyawTarget = Math.atan2(Math.sin(dyawTargetRaw), Math.cos(dyawTargetRaw));
    robot.userData._yawTargetPrev = yawTarget;

    const turnSide = Math.sign(dyawTarget) || 0;
    const turnRate = (delta > 1e-6) ? (Math.abs(dyawTarget) / delta) : 0; // rad/sec
    const turnAmtTarget = Math.max(0, Math.min(1, turnRate / 2.6));
    robot.userData.turnFxCurve = robot.userData.turnFxCurve || { side: 0, amount: 0 };
    const turnFxA = 1 - Math.exp(-(delta || 0.016) * 8);
    robot.userData.turnFxCurve.side = turnSide;
    robot.userData.turnFxCurve.amount += (turnAmtTarget - robot.userData.turnFxCurve.amount) * turnFxA;
    robot.userData._yawSmoothed = typeof robot.userData._yawSmoothed === 'number' ? robot.userData._yawSmoothed : yawTarget;
    const yawA = 1 - Math.exp(-(delta || 0.016) * 14);
    robot.userData._yawSmoothed = dampAngle(robot.userData._yawSmoothed, yawTarget, yawA);

    // Add a tiny procedural sway that depends on walking + turning.
    const yawTurnLean = turnSide * (robot.userData.turnFxCurve.amount || 0) * 0.035;
    const yawMicro = Math.sin(time * 1.35) * 0.012;
    const yaw = robot.userData._yawSmoothed + (yawTurnLean + yawMicro) * walkBlend;
    robot.rotation.y = yaw;

    // Roll into turns (lean). Keep very subtle.
    robot.userData._rollSmoothed = Number.isFinite(robot.userData._rollSmoothed) ? robot.userData._rollSmoothed : 0;
    const rollTurn = turnSide * (robot.userData.turnFxCurve.amount || 0) * 0.18;
    const rollMicro = Math.sin(time * 2.8) * 0.035;
    const rollTarget = (rollTurn + rollMicro) * walkBlend;
    const rollA = 1 - Math.exp(-(delta || 0.016) * 10);
    robot.userData._rollSmoothed = THREE.MathUtils.lerp(robot.userData._rollSmoothed, rollTarget, rollA);
    robot.rotation.z = robot.userData._rollSmoothed;

    // Place the robot on the route (Google-Maps-ish). Keep Y stable for a smoother adventure feel.
    const terrainY = floorY + forestTerrainHeight(p.x, p.z) + FOREST_PATH_SURFACE_LIFT;
    // Bobbing synced to walk cadence.
    const speedScale = robot.userData._speedScaleSmoothed ?? 1;
    const bobFreq = 6.8 + Math.min(2.2, speedScale) * 1.4;
    const bobAmp = 0.028 + Math.min(0.02, (speedScale - 1) * 0.008);
    const bob = Math.sin(time * bobFreq) * bobAmp * walkBlend;
    robot.position.set(p.x, terrainY + bob, p.z);

    // Eye contact + greeting trigger.
    if (camera) {
      robot.userData.lookAtVec = robot.userData.lookAtVec || new THREE.Vector3();
      robot.userData.lookAtVec.copy(camera.position);

      const toCamX = camera.position.x - robot.position.x;
      const toCamZ = camera.position.z - robot.position.z;
      const toCamLen = Math.hypot(toCamX, toCamZ) || 1;
      const fwdX = Math.sin(robot.rotation.y);
      const fwdZ = Math.cos(robot.rotation.y);
      const dot = (fwdX * (toCamX / toCamLen)) + (fwdZ * (toCamZ / toCamLen));
      const dist = toCamLen;

      const wantsGreet = dot > 0.78 && dist < 14;
      robot.userData.greetHold = robot.userData.greetHold || 0;
      robot.userData.greetHold = wantsGreet
        ? Math.min(1.2, robot.userData.greetHold + delta)
        : Math.max(0, robot.userData.greetHold - delta * 2.0);
      robot.userData.greetActive = robot.userData.greetHold > 0.35;
    }

    // Drive leg cadence from actual movement speed (and slightly from turning) to avoid foot sliding.
    if (moving && delta > 1e-6) {
      if (!hasPrev.current) {
        prevP.current.copy(p);
        prevYaw.current = yaw;
        hasPrev.current = true;
      } else {
        const dist = prevP.current.distanceTo(p);
        const speed = dist / delta; // units/sec
        const dyawRaw = yaw - prevYaw.current;
        const dyaw = Math.atan2(Math.sin(dyawRaw), Math.cos(dyawRaw));
        const turnRate = Math.abs(dyaw) / delta; // rad/sec

        // Base cadence follows speed; add a small boost on sharper turns.
        const targetScale = Math.max(0.25, Math.min(2.75, (speed / baseSpeed) * (1 + Math.min(0.35, turnRate * 0.10))));
        robot.userData._speedScaleSmoothed = robot.userData._speedScaleSmoothed ?? 1;
        const aS = 1 - Math.exp(-(delta || 0.016) * 8.5);
        robot.userData._speedScaleSmoothed += (targetScale - robot.userData._speedScaleSmoothed) * aS;
        robot.userData.setSpeedScale?.(robot.userData._speedScaleSmoothed);

        prevP.current.copy(p);
        prevYaw.current = yaw;
      }
    }

    // Transition FX near spur junctions: camera tilt/zoom + slow environmental tint.
    if (Array.isArray(roomPortals) && roomPortals.length) {
      let bestDist = Infinity;
      let bestSide = 0;
      let bestScene = '';

      const pAt = scratch2.current; // reuse scratch
      const tanAt = scratch3.current;
      const leftAt = tmpV.current;

      for (let i = 0; i < roomPortals.length; i += 1) {
        const r = roomPortals[i];
        const rt = Number(r?.t ?? 0);
        curveData.curve.getPointAt(rt, pAt);
        curveData.curve.getTangentAt(rt, tanAt);
        tanAt.y = 0;
        if (tanAt.lengthSq() < 1e-9) tanAt.set(0, 0, 1);
        tanAt.normalize();
        leftAt.set(0, 1, 0).cross(tanAt).normalize();

        const side = typeof r?.side === 'number' ? Math.sign(r.side) || 1 : (i % 2 === 0 ? 1 : -1);
        const isPassword = r?.scene === 'password';
        const jx = pAt.x + leftAt.x * (isPassword ? 1.25 : 1.65) * side + tanAt.x * (isPassword ? -0.85 : 0);
        const jz = pAt.z + leftAt.z * (isPassword ? 1.25 : 1.65) * side + tanAt.z * (isPassword ? -0.85 : 0);

        const dx = robot.position.x - jx;
        const dz = robot.position.z - jz;
        const d = Math.hypot(dx, dz);
        if (d < bestDist) {
          bestDist = d;
          bestSide = side;
          bestScene = String(r?.scene || '');
        }
      }

      const amt = smoothstep01(1 - (bestDist - 1.8) / 7.0);
      robot.userData.turnFx = { side: bestSide, amount: amt };
      robot.userData.envFx = { scene: bestScene, amount: amt };
    } else {
      robot.userData.turnFx = { side: 0, amount: 0 };
      robot.userData.envFx = { scene: '', amount: 0 };
    }

    // Keep animation stable: avoid high-frequency scale wobble that reads as jitter.
    const targetSX = 1.0 + 0.008 * Math.sin(time * 2.5);
    const targetSY = 1.0 - 0.006 * Math.sin(time * 2.5);
    const lerp = 1 - Math.exp(-delta * 10);
    robot.scale.x = robot.scale.x + (targetSX - robot.scale.x) * lerp;
    robot.scale.y = robot.scale.y + (targetSY - robot.scale.y) * lerp;
    robot.scale.z = robot.scale.z + (targetSX - robot.scale.z) * lerp;

    // Keep robot slightly above the ground.
    robot.position.y = Math.max(robot.position.y, floorY + 0.02);
    scratch3.current.copy(p);
  });

  return (
    <RobotModel
      ref={robotRef}
      scale={1.05}
      position={[0, floorY, 0]}
      laptopCanvas={laptopCanvas || undefined}
      equippedItem={equippedItem || undefined}
    />
  );
}

RobotController.propTypes = {
  robotRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  controlsEnabled: PropTypes.bool,
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
  floorY: PropTypes.number.isRequired,
  curveData: PropTypes.shape({
    curve: PropTypes.any,
    length: PropTypes.number,
    sampleTs: PropTypes.any,
    samplePts: PropTypes.any,
  }),
  roomPortals: PropTypes.arrayOf(PropTypes.any),
  autoWalkTarget: PropTypes.arrayOf(PropTypes.number),
  onAutoWalkArrived: PropTypes.func,
  idlePatrolEnabled: PropTypes.bool,
  equippedItem: PropTypes.string,
  laptopCanvas: PropTypes.any,
  mode: PropTypes.string,
};

function SceneAtmosphere({ mode }) {
  const { scene } = useThree();

  useEffect(() => {
    if (!scene) return;
    let bg = '#fff7fd';
    let fogColor = '#fff7fd';
    let fogNear = 24;
    let fogFar = 120;

    if (mode === 'cyberpunk') {
      bg = '#0a0e1a';
      fogColor = '#1a1a3e';
      fogNear = 15;
      fogFar = 45;
    } else if (mode === 'sunset') {
      bg = '#ffd3b0';
      fogColor = '#ffd3b0';
      fogNear = 18;
      fogFar = 95;
    } else if (mode === 'city') {
      bg = '#050810';
      fogColor = '#050810';
      fogNear = 26;
      fogFar = 120;
    } else if (mode === 'forest') {
      bg = '#bfe6ff';
      // Forest: use light exponential fog for depth/atmosphere.
      fogColor = '#d9ffe6';
      fogNear = 9999;
      fogFar = 10000;
    }

    scene.background = new THREE.Color(bg);
    if (mode === 'forest') {
      scene.fog = new THREE.FogExp2(fogColor, 0.02);
    } else {
      scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    }
  }, [mode, scene]);

  return null;
}

SceneAtmosphere.propTypes = {
  mode: PropTypes.oneOf(['forest', 'candy', 'city', 'cyberpunk', 'sunset']).isRequired,
};

function SunsetCameraRig() {
  const { camera } = useThree();
  useLayoutEffect(() => {
    if (!camera) return;
    camera.lookAt(0, 2.2, -18);
    camera.updateProjectionMatrix?.();
    camera.updateMatrixWorld?.();
  }, [camera]);
  return null;
}

function RouteTelemetry({ robotRef, onUpdate }) {
  const lastSentRef = useRef({ at: 0, t: 0 });
  useFrame(() => {
    const robot = robotRef?.current;
    if (!robot) return;
    const t = Number(robot.userData?.pathT ?? 0);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Throttle to ~20fps to avoid excessive React updates.
    if (now - lastSentRef.current.at < 50 && Math.abs(t - lastSentRef.current.t) < 0.002) return;
    lastSentRef.current = { at: now, t };
    if (typeof onUpdate === 'function') onUpdate(t);
  });
  return null;
}

RouteTelemetry.propTypes = {
  robotRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  onUpdate: PropTypes.func,
};

function WorldScroller({ robotRef, curveData, worldRef }) {
  const tmp = useRef(new THREE.Vector3());
  const tan = useRef(new THREE.Vector3());
  const left = useRef(new THREE.Vector3());
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  useFrame(() => {
    const robot = robotRef?.current;
    const world = worldRef?.current;
    if (!robot || !world || !curveData?.curve) return;
    const t = Number(robot.userData?.pathT ?? 0);
    tmp.current.copy(curveData.curve.getPointAt(t));
    tan.current.copy(curveData.curve.getTangentAt(t));
    tan.current.y = 0;
    if (tan.current.lengthSq() < 1e-6) tan.current.set(0, 0, 1);
    tan.current.normalize();
    left.current.crossVectors(up, tan.current).normalize();

    // Keep the robot on the sidewalk (world shifts opposite of curve point + lateral offset).
    const sidewalkOffset = 2.6;
    const side = 1; // right sidewalk
    const ox = left.current.x * sidewalkOffset * side;
    const oz = left.current.z * sidewalkOffset * side;
    world.position.set(-(tmp.current.x + ox), 0, -(tmp.current.z + oz));
  });
  return null;
}

WorldScroller.propTypes = {
  robotRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  curveData: PropTypes.shape({ curve: PropTypes.any }).isRequired,
  worldRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
};

function FirstPersonCamera({ targetRef, enabled = true }) {
  const { camera } = useThree();
  const eyeOffset = useMemo(() => new THREE.Vector3(0, 1.72, 0.18), []);
  const lookOffset = useMemo(() => new THREE.Vector3(0, 1.55, 4.0), []);
  const eyeWorld = useRef(new THREE.Vector3());
  const lookWorld = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!enabled) return;
    camera.near = 0.05;
    camera.far = 600;
    camera.fov = 70;
    camera.updateProjectionMatrix();
  }, [camera, enabled]);

  useFrame(({ clock }, delta) => {
    if (!enabled) return;
    const robot = targetRef?.current;
    if (!robot) return;

    // Eye position in world space (robot-local offset).
    tmp.current.copy(eyeOffset).applyQuaternion(robot.quaternion);
    eyeWorld.current.copy(robot.position).add(tmp.current);

    tmp.current.copy(lookOffset).applyQuaternion(robot.quaternion);
    lookWorld.current.copy(robot.position).add(tmp.current);

    // Subtle head sway (relaxed walk).
    const t = clock.getElapsedTime();
    const sway = Math.sin(t * 1.6) * 0.02;
    eyeWorld.current.x += sway;

    const a = 1 - Math.exp(-delta * 10);
    camera.position.lerp(eyeWorld.current, a);
    camera.lookAt(lookWorld.current);
  });

  return null;
}

FirstPersonCamera.propTypes = {
  targetRef: PropTypes.shape({ current: PropTypes.any }),
  enabled: PropTypes.bool,
};

function CameraLaptop({ laptopCanvas }) {
  const groupRef = useRef(null);
  const matRef = useRef(null);
  const texRef = useRef(null);
  const { camera } = useThree();

  useEffect(() => {
    if (texRef.current) {
      try {
        texRef.current.dispose();
      } catch {
        // ignore
      }
      texRef.current = null;
    }
    if (!laptopCanvas) return;

    const tex = new THREE.CanvasTexture(laptopCanvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    texRef.current = tex;
    if (matRef.current) {
      matRef.current.map = tex;
      matRef.current.needsUpdate = true;
    }

    return () => {
      try {
        tex.dispose();
      } catch {
        // ignore
      }
    };
  }, [laptopCanvas]);

  useFrame(() => {
    if (texRef.current) texRef.current.needsUpdate = true;
    const g = groupRef.current;
    if (!g) return;
    // Follow the camera (diegetic "hands-held" laptop).
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={groupRef}>
      <group position={[0.0, -0.32, -0.78]} rotation={[-0.18, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.72, 0.04, 0.46]} />
          <meshStandardMaterial color={'#0b0f18'} roughness={0.35} metalness={0.65} />
        </mesh>
        <mesh position={[0, 0.24, -0.20]} rotation={[0.92, 0, 0]}>
          <planeGeometry args={[0.72, 0.48]} />
          <meshBasicMaterial color={'#ffffff'} transparent opacity={0.10} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.24, -0.195]} rotation={[0.92, 0, 0]} renderOrder={20}>
          <planeGeometry args={[0.66, 0.42]} />
          <meshBasicMaterial ref={matRef} map={texRef.current || undefined} toneMapped={false} transparent opacity={0.98} />
        </mesh>
      </group>
    </group>
  );
}

CameraLaptop.propTypes = {
  laptopCanvas: PropTypes.any,
};

function StreetCamera({ targetRef, enabled = true }) {
  const { camera } = useThree();
  // Wide-angle, farther back so the robot feels smaller and the city feels bigger.
  const eyeOffset = useMemo(() => new THREE.Vector3(0, 3.4, -12.8), []);
  const lookOffset = useMemo(() => new THREE.Vector3(0, 1.35, 4.6), []);
  const eyeWorld = useRef(new THREE.Vector3());
  const lookWorld = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());

  useLayoutEffect(() => {
    if (!enabled) return;
    camera.near = 0.05;
    camera.far = 520;
    camera.fov = 82;
    camera.updateProjectionMatrix();
  }, [camera, enabled]);

  useFrame(() => {
    if (!enabled) return;
    const robot = targetRef?.current;
    if (!robot) return;

    tmp.current.copy(eyeOffset).applyQuaternion(robot.quaternion);
    eyeWorld.current.copy(robot.position).add(tmp.current);

    tmp.current.copy(lookOffset).applyQuaternion(robot.quaternion);
    lookWorld.current.copy(robot.position).add(tmp.current);

    // No easing/intro: camera snaps to the designed framing immediately.
    camera.position.copy(eyeWorld.current);
    camera.lookAt(lookWorld.current);
  });

  return null;
}

StreetCamera.propTypes = {
  targetRef: PropTypes.shape({ current: PropTypes.any }),
  enabled: PropTypes.bool,
};

function PastelSky({ texture }) {
  return (
    <mesh>
      <sphereGeometry args={[220, 36, 24]} />
      <meshBasicMaterial map={texture || undefined} side={THREE.BackSide} />
    </mesh>
  );
}

PastelSky.propTypes = {
  texture: PropTypes.any,
};

function SugaryGround({ y, texture }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y - 0.03, 0]} receiveShadow>
      <planeGeometry args={[120, 120, 1, 1]} />
      <meshPhysicalMaterial
        color={CANDY.ground}
        roughness={0.06}
        metalness={0}
        transmission={0.5}
        thickness={1}
        ior={1.22}
        transparent
        opacity={0.92}
        clearcoat={0.75}
        clearcoatRoughness={0.04}
        map={texture || undefined}
      />
    </mesh>
  );
}

function CandyBoardGround({ y, texture }) {
  // Center the board around the lobby path.
  const centerZ = -6;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y - 0.035, centerZ]} receiveShadow>
        <planeGeometry args={[34, 30, 1, 1]} />
        <meshPhysicalMaterial
          color={CANDY.ground}
          roughness={0.08}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.02}
          transmission={0.18}
          thickness={0.5}
          ior={1.22}
          transparent
          opacity={0.98}
          map={texture || undefined}
        />
      </mesh>

      {/* Candy frame */}
      <group position={[0, y + 0.18, centerZ]}>
        <mesh position={[0, 0.35, 15.3]} castShadow>
          <boxGeometry args={[35.5, 0.75, 0.9]} />
          <meshPhysicalMaterial color={CANDY.cottonCandyPink} roughness={0.06} metalness={0.05} clearcoat={1} clearcoatRoughness={0.02} />
        </mesh>
        <mesh position={[0, 0.35, -15.3]} castShadow>
          <boxGeometry args={[35.5, 0.75, 0.9]} />
          <meshPhysicalMaterial color={CANDY.skyBlue} roughness={0.06} metalness={0.05} clearcoat={1} clearcoatRoughness={0.02} />
        </mesh>
        <mesh position={[17.8, 0.35, 0]} castShadow>
          <boxGeometry args={[0.9, 0.75, 31.2]} />
          <meshPhysicalMaterial color={CANDY.mint} roughness={0.06} metalness={0.05} clearcoat={1} clearcoatRoughness={0.02} />
        </mesh>
        <mesh position={[-17.8, 0.35, 0]} castShadow>
          <boxGeometry args={[0.9, 0.75, 31.2]} />
          <meshPhysicalMaterial color={CANDY.lemon} roughness={0.06} metalness={0.05} clearcoat={1} clearcoatRoughness={0.02} />
        </mesh>
      </group>
    </group>
  );
}

CandyBoardGround.propTypes = {
  y: PropTypes.number.isRequired,
  texture: PropTypes.any,
};

function CandyBoardPieces({ y, curveData }) {
  const instRef = useRef(null);

  const pieces = useMemo(() => {
    const out = [];
    if (!curveData?.samplePts) return out;

    // Board extents match CandyBoardGround.
    const centerZ = -6;
    const x0 = -15.4;
    const x1 = 15.4;
    const z0 = centerZ - 13.2;
    const z1 = centerZ + 13.2;

    const step = 2.2;
    const threshold = 1.35; // keep the spline path visually clear

    const colors = [CANDY.roadRed, CANDY.grape, CANDY.mint, CANDY.lemon, CANDY.cottonCandyPink, CANDY.skyBlue];
    const tmp = new THREE.Vector3();

    let k = 0;
    for (let z = z0; z <= z1; z += step) {
      for (let x = x0; x <= x1; x += step) {
        // Distance to spline samples (2D XZ).
        let best = Infinity;
        for (let i = 0; i < curveData.samplePts.length; i += 1) {
          const p = curveData.samplePts[i];
          const dx = x - p.x;
          const dz = z - p.z;
          const d2 = (dx * dx) + (dz * dz);
          if (d2 < best) best = d2;
        }
        const d = Math.sqrt(best);
        if (d < threshold) continue;

        const j = prand(k + 1);
        // Slight positional jitter for a more organic board.
        const jx = (j - 0.5) * 0.25;
        const jz = (prand(k + 9) - 0.5) * 0.25;
        tmp.set(x + jx, y + 0.55 + prand(k + 4) * 0.25, z + jz);
        const s = 0.58 + prand(k + 5) * 0.22;
        out.push({
          pos: tmp.clone(),
          scale: s,
          color: colors[k % colors.length],
          rot: prand(k + 12) * Math.PI,
        });
        k += 1;
        if (out.length >= 90) return out;
      }
    }
    return out;
  }, [curveData, y]);

  useEffect(() => {
    const inst = instRef.current;
    if (!inst) return;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const c = new THREE.Color();

    for (let i = 0; i < pieces.length; i += 1) {
      const p = pieces[i];
      q.setFromEuler(new THREE.Euler(0, p.rot, 0));
      s.set(p.scale, p.scale, p.scale);
      m.compose(p.pos, q, s);
      inst.setMatrixAt(i, m);
      c.set(p.color);
      inst.setColorAt(i, c);
    }
    inst.count = pieces.length;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  }, [pieces]);

  if (pieces.length === 0) return null;

  return (
    <instancedMesh ref={instRef} args={[null, null, 90]} castShadow>
      <sphereGeometry args={[0.65, 18, 14]} />
      <meshPhysicalMaterial
        roughness={0.05}
        metalness={0.06}
        clearcoat={1}
        clearcoatRoughness={0.02}
        transmission={0.25}
        thickness={0.55}
        ior={1.18}
        vertexColors
      />
    </instancedMesh>
  );
}

CandyBoardPieces.propTypes = {
  y: PropTypes.number.isRequired,
  curveData: PropTypes.shape({ samplePts: PropTypes.any }).isRequired,
};

SugaryGround.propTypes = {
  y: PropTypes.number.isRequired,
  texture: PropTypes.any,
};

function CandyRoad({ curveData, texture, gestureRef }) {
  const geom = useMemo(() => {
    if (!curveData?.curve) return null;

    // Build a floating ribbon strip along the spline.
    const segs = 520;
    const halfW = 0.92;
    const positions = new Float32Array((segs + 1) * 2 * 3);
    const uvs = new Float32Array((segs + 1) * 2 * 2);
    const indices = new Uint32Array(segs * 6);

    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const right = new THREE.Vector3();

    for (let i = 0; i <= segs; i += 1) {
      const t = i / segs;
      curveData.curve.getPointAt(t, p);
      curveData.curve.getTangentAt(t, tan);
      tan.y = 0;
      if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
      tan.normalize();
      right.set(-tan.z, 0, tan.x).normalize();

      const y = p.y + 0.12;
      const l = i * 2;
      const lx = p.x - right.x * halfW;
      const lz = p.z - right.z * halfW;
      const rx = p.x + right.x * halfW;
      const rz = p.z + right.z * halfW;

      positions[(l * 3) + 0] = lx;
      positions[(l * 3) + 1] = y;
      positions[(l * 3) + 2] = lz;

      positions[(l * 3) + 3] = rx;
      positions[(l * 3) + 4] = y;
      positions[(l * 3) + 5] = rz;

      const u = t * 10;
      uvs[(l * 2) + 0] = u;
      uvs[(l * 2) + 1] = 0;
      uvs[(l * 2) + 2] = u;
      uvs[(l * 2) + 3] = 1;
    }

    for (let i = 0; i < segs; i += 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      const ii = i * 6;
      indices[ii + 0] = a;
      indices[ii + 1] = c;
      indices[ii + 2] = b;
      indices[ii + 3] = b;
      indices[ii + 4] = c;
      indices[ii + 5] = d;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    g.setIndex(new THREE.BufferAttribute(indices, 1));
    g.computeVertexNormals();
    return g;
  }, [curveData]);

  const matRef = useRef(null);
  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;

    const g = gestureRef?.current;
    const gesture = g?.gesture;
    const likeActive = gesture === 'thumbUp';

    const t = clock.getElapsedTime();
    if (!likeActive) {
      // Gentle idle pulse.
      mat.emissive.set(CANDY.roadRed);
      mat.emissiveIntensity = 0.12 + 0.04 * Math.sin(t * 2.8);
      return;
    }

    // Like gesture: full rainbow neon ribbon.
    // const hue = (t * 0.22) % 1;
    // mat.emissive.setHSL(hue, 0.9, 0.58);
    // mat.emissiveIntensity = 0.35 + 0.18 * Math.sin(t * 10.0);
  });

  if (!geom) return null;

  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <meshPhysicalMaterial
        ref={matRef}
        map={texture || undefined}
        color={CANDY.roadWhite}
        roughness={0.02}
        metalness={0.15}
        clearcoat={1}
        clearcoatRoughness={0}
        emissive={CANDY.roadRed}
        emissiveIntensity={0.12}
        transparent
        opacity={0.96}
        transmission={0.18}
        thickness={0.65}
        ior={1.18}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

CandyRoad.propTypes = {
  curveData: PropTypes.shape({ curve: PropTypes.any }).isRequired,
  texture: PropTypes.any,
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
};

function CandyDecor() {
  const items = useMemo(() => {
    const out = [];
    const colors = [CANDY.roadRed, CANDY.mint, CANDY.grape, CANDY.lemon, '#ff9bf6', '#7afcff'];
    for (let i = 0; i < 26; i += 1) {
      const a = prand(i + 2) * Math.PI * 2;
      const r = 14 + prand(i + 8) * 30;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 6;
      const s = 0.9 + prand(i + 17) * 1.8;
      const kind = i % 3; // 0: lollipop, 1: gumdrop, 2: marshmallow
      out.push({ key: i, x, z, s, kind, c: colors[i % colors.length] });
    }
    return out;
  }, []);

  return (
    <group>
      {items.map((it) => (
        <group key={it.key} position={[it.x, MAP_Y, it.z]} scale={it.s}>
          {it.kind === 0 ? (
            <>
              <mesh position={[0, 1.4, 0]} castShadow>
                <sphereGeometry args={[0.95, 18, 18]} />
                <meshPhysicalMaterial
                  color={it.c}
                  roughness={0}
                  metalness={0.02}
                  clearcoat={1}
                  clearcoatRoughness={0}
                  emissive={it.c}
                  emissiveIntensity={0.06}
                />
              </mesh>
              <mesh position={[0, 0.55, 0]} castShadow>
                <cylinderGeometry args={[0.10, 0.12, 1.2, 10]} />
                <meshPhysicalMaterial color="#fff7ff" roughness={0} metalness={0.03} clearcoat={1} clearcoatRoughness={0} />
              </mesh>
            </>
          ) : null}

          {it.kind === 1 ? (
            <mesh position={[0, 0.75, 0]} castShadow>
              <sphereGeometry args={[0.95, 16, 12]} />
              <meshPhysicalMaterial
                color={it.c}
                roughness={0}
                metalness={0.01}
                clearcoat={1}
                clearcoatRoughness={0}
                emissive={it.c}
                emissiveIntensity={0.04}
              />
            </mesh>
          ) : null}

          {it.kind === 2 ? (
            <mesh position={[0, 0.7, 0]} castShadow>
              <cylinderGeometry args={[0.9, 0.9, 1.1, 14]} />
              <meshPhysicalMaterial color="#fff0fb" roughness={0.06} metalness={0} clearcoat={1} clearcoatRoughness={0.02} />
            </mesh>
          ) : null}
        </group>
      ))}
    </group>
  );
}

function FloatingCandySky({ count = 42 }) {
  const bubblesRef = useRef(null);
  const marshRef = useRef(null);
  const tmpRef = useRef(new THREE.Object3D());

  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = prand(i + 2) * Math.PI * 2;
        const r = 18 + prand(i + 11) * 70;
        const y = 8 + prand(i + 31) * 28;
        const speed = 0.12 + prand(i + 71) * 0.22;
        const wobble = 0.6 + prand(i + 101) * 1.4;
        const scale = 0.55 + prand(i + 151) * 1.15;
        return { a, r, y, speed, wobble, scale };
      }),
    [count]
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const tmp = tmpRef.current;

    const bubbles = bubblesRef.current;
    const marsh = marshRef.current;
    if (!bubbles || !marsh) return;

    for (let i = 0; i < count; i += 1) {
      const s = seeds[i];
      const ang = s.a + t * 0.05;
      const x = Math.cos(ang) * s.r + Math.sin(t * 0.7 + i) * 1.8;
      const z = Math.sin(ang) * s.r + Math.cos(t * 0.6 + i) * 1.8;
      const y = s.y + Math.sin(t * s.wobble + i) * 0.9;

      // Bubbles
      tmp.position.set(x, y, z);
      tmp.rotation.set(0, ang, 0);
      tmp.scale.setScalar(s.scale);
      tmp.updateMatrix();
      bubbles.setMatrixAt(i, tmp.matrix);

      // Marshmallows (a bit lower)
      tmp.position.set(x * 0.85, y - 2.2, z * 0.85);
      tmp.rotation.set(0.15 * Math.sin(t * 0.3 + i), ang, 0);
      tmp.scale.setScalar(0.65 * s.scale);
      tmp.updateMatrix();
      marsh.setMatrixAt(i, tmp.matrix);
    }

    bubbles.instanceMatrix.needsUpdate = true;
    marsh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bubblesRef} args={[null, null, count]}>
        <sphereGeometry args={[0.55, 12, 10]} />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0}
          metalness={0}
          transparent
          opacity={0.22}
          clearcoat={1}
          clearcoatRoughness={0}
          transmission={0.9}
          ior={1.15}
        />
      </instancedMesh>

      <instancedMesh ref={marshRef} args={[null, null, count]}>
        <capsuleGeometry args={[0.4, 0.75, 6, 10]} />
        <meshPhysicalMaterial
          color="#fff7ff"
          roughness={0.25}
          metalness={0}
          clearcoat={0.85}
          clearcoatRoughness={0.05}
        />
      </instancedMesh>
    </group>
  );
}

FloatingCandySky.propTypes = {
  count: PropTypes.number,
};

function RobotHalo({ robotRef, enabled, colorA = CANDY.cottonCandyPink, colorB = CANDY.skyBlue }) {
  const haloRef = useRef(null);

  useFrame(({ clock }) => {
    const halo = haloRef.current;
    const robot = robotRef.current;
    if (!halo || !robot) return;

    const t = clock.getElapsedTime();
    halo.position.copy(robot.position);
    halo.position.y = MAP_Y + 0.02;
    const s = enabled ? 1.0 + 0.18 * Math.sin(t * 8.0) : 0.95 + 0.10 * Math.sin(t * 2.4);
    halo.scale.setScalar(s);

    const mat = halo.material;
    if (mat && mat.color) {
      const mix = 0.5 + 0.5 * Math.sin(t * 2.2);
      mat.color.set(colorA).lerp(new THREE.Color(colorB), mix);
      mat.opacity = enabled ? 0.42 : 0.28;
    }
  });

  return (
    <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.75, 1.25, 48]} />
      <meshBasicMaterial transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

RobotHalo.propTypes = {
  robotRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  enabled: PropTypes.bool,
  colorA: PropTypes.string,
  colorB: PropTypes.string,
};

function CandyHouse({ kind, position, completed, iconTexture, vortexTexture }) {
  const glowRef = useRef(null);
  const holoRef = useRef(null);
  const vortexRef = useRef(null);
  useFrame(({ clock }) => {
    const g = glowRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const pulse = completed ? 0.22 + 0.08 * Math.sin(t * 3.1) : 0.14 + 0.06 * Math.sin(t * 2.2);
    g.scale.setScalar(1 + pulse);
    g.rotation.y = t * 0.6;

    const h = holoRef.current;
    if (h) {
      h.position.y = 2.45 + Math.sin(t * 2.8) * 0.12;
      h.rotation.y = t * 0.8;
    }

    const v = vortexRef.current;
    if (v) {
      v.rotation.y = t * 1.4;
      v.rotation.x = Math.sin(t * 0.9) * 0.12;
      const m = v.material;
      if (m && m.opacity != null) m.opacity = completed ? 0.58 : 0.72;
    }
  });

  return (
    <group position={position}>
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.8, 1.2, 42]} />
        <meshBasicMaterial
          color={completed ? CANDY.mint : CANDY.grape}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {iconTexture ? (
        <group ref={holoRef} position={[0, 2.45, 0]}>
          <mesh>
            <planeGeometry args={[1.2, 1.2]} />
            <meshBasicMaterial
              map={iconTexture}
              transparent
              opacity={0.92}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ) : null}

      {/* Vortex portal ring */}
      <mesh ref={vortexRef} position={[0, 0.38, 0]}>
        <torusGeometry args={[1.22, 0.12, 14, 64]} />
        <meshBasicMaterial
          map={vortexTexture || undefined}
          color={completed ? CANDY.mint : CANDY.roadRed}
          transparent
          opacity={0.72}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {kind === 'password' ? (
        <group>
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[2.2, 1.1, 1.5]} />
            <meshPhysicalMaterial color={CANDY.chocolate} roughness={0} metalness={0.02} clearcoat={1} clearcoatRoughness={0} />
          </mesh>
          <mesh position={[-0.9, 1.2, -0.45]} castShadow>
            <cylinderGeometry args={[0.35, 0.45, 1.3, 14]} />
            <meshPhysicalMaterial color={CANDY.chocolate} roughness={0} metalness={0.02} clearcoat={1} clearcoatRoughness={0} />
          </mesh>
          <mesh position={[0.9, 1.2, -0.45]} castShadow>
            <cylinderGeometry args={[0.35, 0.45, 1.3, 14]} />
            <meshPhysicalMaterial color={CANDY.chocolate} roughness={0} metalness={0.02} clearcoat={1} clearcoatRoughness={0} />
          </mesh>
          <mesh position={[0, 1.35, 0.4]} castShadow>
            <coneGeometry args={[1.0, 0.9, 18]} />
            <meshPhysicalMaterial
              color={CANDY.roadRed}
              roughness={0}
              metalness={0.02}
              clearcoat={1}
              clearcoatRoughness={0}
              emissive={CANDY.roadRed}
              emissiveIntensity={0.06}
            />
          </mesh>
        </group>
      ) : null}

      {kind === 'privacy' ? (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[1.15, 1.2, 1.0, 22]} />
            <meshPhysicalMaterial color="#ffffff" roughness={0} metalness={0.03} clearcoat={1} clearcoatRoughness={0} />
          </mesh>
          <mesh position={[0, 1.15, 0]} castShadow>
            <sphereGeometry args={[1.05, 24, 18]} />
            <meshPhysicalMaterial
              color={CANDY.skyBlue}
              roughness={0}
              metalness={0}
              clearcoat={1}
              clearcoatRoughness={0}
              transparent
              opacity={0.52}
              transmission={0.6}
              ior={1.2}
              emissive={CANDY.mint}
              emissiveIntensity={0.08}
            />
          </mesh>
          <mesh position={[0, 0.95, 0]}>
            <torusGeometry args={[1.05, 0.09, 12, 44]} />
            <meshPhysicalMaterial
              color={CANDY.mint}
              roughness={0}
              metalness={0.02}
              clearcoat={1}
              clearcoatRoughness={0}
              emissive={CANDY.mint}
              emissiveIntensity={0.14}
            />
          </mesh>
        </group>
      ) : null}

      {kind === 'shop' ? (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[1.25, 1.35, 0.9, 20]} />
            <meshPhysicalMaterial color="#fff7ff" roughness={0} metalness={0.02} clearcoat={1} clearcoatRoughness={0} />
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow>
            <sphereGeometry args={[0.95, 24, 18]} />
            <meshPhysicalMaterial
              color="#ffffff"
              roughness={0}
              metalness={0}
              clearcoat={1}
              clearcoatRoughness={0}
              transparent
              opacity={0.60}
              transmission={0.55}
              ior={1.18}
              emissive={CANDY.lemon}
              emissiveIntensity={0.06}
            />
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshPhysicalMaterial color={CANDY.roadRed} roughness={0} metalness={0.02} clearcoat={1} clearcoatRoughness={0} emissive={CANDY.roadRed} emissiveIntensity={0.08} />
          </mesh>
          <mesh position={[0.35, 1.2, 0.15]} castShadow>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshPhysicalMaterial color={CANDY.mint} roughness={0} metalness={0.02} clearcoat={1} clearcoatRoughness={0} emissive={CANDY.mint} emissiveIntensity={0.08} />
          </mesh>
          <mesh position={[-0.35, 1.25, -0.1]} castShadow>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshPhysicalMaterial color={CANDY.grape} roughness={0} metalness={0.02} clearcoat={1} clearcoatRoughness={0} emissive={CANDY.grape} emissiveIntensity={0.08} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

CandyHouse.propTypes = {
  kind: PropTypes.oneOf(['password', 'privacy', 'shop']).isRequired,
  position: PropTypes.arrayOf(PropTypes.number).isRequired,
  completed: PropTypes.bool,
  iconTexture: PropTypes.any,
  vortexTexture: PropTypes.any,
};

function SparkleTrail({ robotRef, enabled }) {
  const instRef = useRef(null);
  const tmpRef = useRef(new THREE.Object3D());
  const baseColor = useMemo(() => new THREE.Color().setHSL(0.86, 0.75, 0.72), []);
  const scratchColorRef = useRef(new THREE.Color());
  const ring = useRef({
    i: 0,
    n: 70,
    pts: Array.from({ length: 70 }, () => ({ p: new THREE.Vector3(0, 0, 0), t: -999 })),
    last: new THREE.Vector3(999, 999, 999),
  });

  useFrame(({ clock }) => {
    const inst = instRef.current;
    const robot = robotRef.current;
    if (!inst || !robot) return;

    const tmp = tmpRef.current;
    const scratchColor = scratchColorRef.current;

    const now = clock.getElapsedTime();

    if (enabled) {
      const d = ring.current.last.distanceToSquared(robot.position);
      if (d > 0.18 * 0.18) {
        ring.current.last.copy(robot.position);
        const slot = ring.current.pts[ring.current.i];
        slot.p.copy(robot.position);
        slot.t = now;
        ring.current.i = (ring.current.i + 1) % ring.current.n;
      }
    }

    for (let i = 0; i < ring.current.n; i += 1) {
      const s = ring.current.pts[i];
      const age = now - s.t;
      const life = 1.35;
      const a = 1 - Math.max(0, Math.min(1, age / life));

      tmp.position.copy(s.p);
      tmp.position.y += 0.06 + (1 - a) * 0.16;
      const sc = 0.22 * a;
      tmp.scale.set(sc, sc, sc);
      tmp.updateMatrix();
      inst.setMatrixAt(i, tmp.matrix);

      scratchColor.copy(baseColor).multiplyScalar(a);
      inst.setColorAt(i, scratchColor);
    }

    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instRef} args={[null, null, 70]}>
      <sphereGeometry args={[0.25, 10, 10]} />
      <meshBasicMaterial transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
}

SparkleTrail.propTypes = {
  robotRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  enabled: PropTypes.bool,
};

function CandyFollowCamera({ targetRef, curveData, navActive, boardMode = false, occluderRootRef }) {
  const { scene } = useThree();
  const isoOffset = useMemo(
    () => (boardMode ? new THREE.Vector3(6.2, 16.5, 12.8) : new THREE.Vector3(10.5, 10.0, 10.5)),
    [boardMode]
  );
  const scratchRef = useRef(new THREE.Vector3());
  const scratch2Ref = useRef(new THREE.Vector3());
  const scratch3Ref = useRef(new THREE.Vector3());
  const shakeScratchRef = useRef(new THREE.Vector3());
  const turnRightRef = useRef(new THREE.Vector3());
  const lookAtSmoothedRef = useRef(new THREE.Vector3());
  const lookAtDesiredRef = useRef(new THREE.Vector3());
  const targetYSmoothedRef = useRef(NaN);

  const occludersRef = useRef([]);
  const occluderRefreshRef = useRef(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const rayOriginRef = useRef(new THREE.Vector3());
  const rayDirRef = useRef(new THREE.Vector3());
  const occlusionAmtRef = useRef(0);

  // Stability-first: disable raycast-based occlusion camera pushes.
  // Those tiny hit/no-hit toggles (foliage/props) can read as constant screen shaking.
  const occlusionEnabled = false;

  const rebuildOccluders = () => {
    const root = occluderRootRef?.current || scene;
    if (!root) return;
    const out = [];
    root.traverse((o) => {
      if (!o.visible) return;
      if (o.userData?.noCameraOcclude) return;
      if (o.isInstancedMesh) {
        out.push(o);
        return;
      }
      if (o.isMesh && o.castShadow) {
        out.push(o);
      }
    });
    occludersRef.current = out;
  };

  useFrame(({ camera }, delta) => {
    if (!targetRef.current) return;
    if (!curveData?.curve) return;
    const target = targetRef.current;
    const p = target.position;

    // Terrain-following can introduce tiny continuous Y changes.
    // Dampen Y separately (and ignore sub-centimeter jitter) so the view stays stable while climbing.
    const ySpeed = boardMode ? 2.2 : 1.4;
    const yA = 1 - Math.exp(-(delta || 0.016) * ySpeed);
    if (!Number.isFinite(targetYSmoothedRef.current)) targetYSmoothedRef.current = p.y;
    const yDeadZone = boardMode ? 0.006 : 0.01;
    const dy = p.y - targetYSmoothedRef.current;
    if (Math.abs(dy) > yDeadZone) targetYSmoothedRef.current += dy * yA;
    const pY = targetYSmoothedRef.current;

    if (occlusionEnabled) {
      // Refresh occluder list occasionally (trees/props are static, so this is cheap and stable).
      occluderRefreshRef.current += 1;
      if (occludersRef.current.length === 0 || occluderRefreshRef.current % 240 === 1) {
        rebuildOccluders();
      }
    } else {
      occlusionAmtRef.current = 0;
    }

    const t = typeof target.userData?.pathT === 'number'
      ? target.userData.pathT
      : closestTOnSamples(p, curveData.sampleTs, curveData.samplePts);

    const tan = curveData.curve.getTangentAt(t);
    tan.y = 0;
    if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
    tan.normalize();

    // Cinematic feel: slight lead/lag + tiny roll into turns.
    const fx = target.userData?.turnFxCurve || target.userData?.turnFx;
    const turnAmt = Math.max(0, Math.min(1, Number(fx?.amount ?? 0)));
    const turnSide = Math.sign(Number(fx?.side ?? 0)) || 0;
    const turnRight = turnRightRef.current;
    turnRight.set(tan.z, 0, -tan.x);
    if (turnRight.lengthSq() > 1e-9) turnRight.normalize();

    const scratch = scratchRef.current;
    const scratch2 = scratch2Ref.current;
    const scratch3 = scratch3Ref.current;

    const aheadBase = boardMode ? (navActive ? 2.2 : 1.6) : (navActive ? 2.6 : 1.9);
    const ahead = aheadBase + turnAmt * (boardMode ? 0.55 : 0.95);
    scratch.set(p.x, pY, p.z)
      .addScaledVector(tan, ahead)
      .addScaledVector(turnRight, -turnSide * turnAmt * (boardMode ? 0.35 : 0.55));

    const zoom = 1 - turnAmt * 0.12;
    scratch3.set(p.x, pY, p.z)
      .addScaledVector(isoOffset, zoom)
      .addScaledVector(tan, (boardMode ? 0.45 : 0.8) + turnAmt * (boardMode ? 0.10 : 0.18))
      .addScaledVector(turnRight, -turnSide * turnAmt * (boardMode ? 1.05 : 1.65));

    if (occlusionEnabled) {
      // Robot visibility: if something blocks line-of-sight, lift the camera a bit.
      const rayOrigin = rayOriginRef.current;
      rayOrigin.set(p.x, p.y + (boardMode ? 1.05 : 1.25), p.z);

      const rayDir = rayDirRef.current;
      rayDir.copy(scratch3).sub(rayOrigin);
      const dist = rayDir.length();
      let occluded = false;
      let hitDist = Infinity;

      if (dist > 0.001 && occludersRef.current.length) {
        rayDir.multiplyScalar(1 / dist);
        const rc = raycasterRef.current;
        rc.near = 0.05;
        rc.far = Math.max(0.1, dist - 0.15);
        rc.set(rayOrigin, rayDir);

        const hits = rc.intersectObjects(occludersRef.current, true);

        const isPartOfTarget = (obj) => {
          let o = obj;
          while (o) {
            if (o === target) return true;
            o = o.parent;
          }
          return false;
        };

        for (let i = 0; i < hits.length; i += 1) {
          const h = hits[i];
          if (!h?.object) continue;
          if (isPartOfTarget(h.object)) continue;
          // Ignore tiny/near-ground intersections that aren't actually blocking the robot.
          if (h.point && h.point.y < p.y + 0.45) continue;
          occluded = true;
          hitDist = h.distance;
          break;
        }
      }

      // Smoothly adjust an occlusion amount to avoid camera popping.
      const targetOcc = occluded ? 1 : 0;
      const occA = 1 - Math.exp(-(delta || 0.016) * 6.5);
      occlusionAmtRef.current += (targetOcc - occlusionAmtRef.current) * occA;

      // Lift when occluded.
      scratch3.y += occlusionAmtRef.current * (boardMode ? 3.0 : 4.2);

      // If still occluded, also pull the camera closer to the robot.
      if (occluded && hitDist !== Infinity) {
        const safe = Math.max(1.8, hitDist - 0.8);
        scratch3.copy(rayOrigin).addScaledVector(rayDir, safe);
        scratch3.y += 0.35 + occlusionAmtRef.current * 0.35;
      }
    }
    scratch2.copy(scratch3);

    // Smooth follow to avoid jitter (frame-rate independent).
    // Slightly slower than "locked" to feel like a human camera rig.
    const posSpeed = 5.2;
    const posA = 1 - Math.exp(-(delta || 0.016) * posSpeed);
    camera.position.lerp(scratch2, posA);

    const lookAtDesired = lookAtDesiredRef.current;
    lookAtDesired.set(p.x, pY + (boardMode ? 1.05 : 1.25), p.z);
    const lookAtSmoothed = lookAtSmoothedRef.current;
    if (!Number.isFinite(lookAtSmoothed.x)) lookAtSmoothed.copy(lookAtDesired);
    const lookSpeed = 8.5;
    const lookA = 1 - Math.exp(-(delta || 0.016) * lookSpeed);
    lookAtSmoothed.lerp(lookAtDesired, lookA);

    // Apply lookAt, then a tiny roll toward the turn direction.
    camera.lookAt(lookAtSmoothed);

    const desiredRoll = (boardMode ? 0.03 : 0.055) * turnSide * turnAmt;
    camera.userData._rollSmoothed = Number.isFinite(camera.userData._rollSmoothed) ? camera.userData._rollSmoothed : 0;
    const rollA = 1 - Math.exp(-(delta || 0.016) * 8);
    camera.userData._rollSmoothed = THREE.MathUtils.lerp(camera.userData._rollSmoothed, desiredRoll, rollA);
    const fwd = scratch3Ref.current;
    fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const qRoll = new THREE.Quaternion().setFromAxisAngle(fwd, camera.userData._rollSmoothed);
    camera.quaternion.multiply(qRoll);
  });

  return null;
}

function ForestEnvironmentFx({ robotRef, enabled }) {
  const { scene } = useThree();
  const baseBg = useMemo(() => new THREE.Color('#bfe6ff'), []);
  const baseFog = useMemo(() => new THREE.Color('#d9ffe6'), []);
  const tmpA = useMemo(() => new THREE.Color(), []);
  const tmpB = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    if (!enabled) return;
    if (!scene) return;
    // Ensure there is an exponential fog object we can tune.
    if (!(scene.fog instanceof THREE.FogExp2)) {
      scene.fog = new THREE.FogExp2(baseFog.getHex(), 0.02);
    }
  }, [enabled, scene, baseFog]);

  useFrame((_, delta) => {
    if (!enabled) return;
    const robot = robotRef?.current;
    if (!robot || !scene) return;

    const fx = robot.userData?.envFx;
    const amt = Math.max(0, Math.min(1, Number(fx?.amount ?? 0)));
    const kind = String(fx?.scene || '');

    // Targets per path type.
    let targetBg = '#bfe6ff';
    let targetFog = '#d9ffe6';
    let targetDensity = 0.018;

    if (kind === 'privacy') {
      targetBg = '#cbbcff';
      targetFog = '#bca5ff';
      targetDensity = 0.032;
    } else if (kind === 'shop') {
      targetBg = '#ffe1c8';
      targetFog = '#ffe1c8';
      targetDensity = 0.022;
    } else if (kind === 'password') {
      targetBg = '#b7e3cf';
      targetFog = '#b7e3cf';
      targetDensity = 0.026;
    }

    // Smoothly approach the desired blend.
    robot.userData._envBlend = robot.userData._envBlend ?? 0;
    const a = 1 - Math.exp(-(delta || 0.016) * 2.8);
    robot.userData._envBlend += (amt - robot.userData._envBlend) * a;
    const mix = robot.userData._envBlend;

    tmpA.copy(baseBg);
    tmpB.set(targetBg);
    scene.background = tmpA.lerp(tmpB, mix);

    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(baseFog.getHex(), 0.02);
    const fog = scene.fog;
    tmpA.copy(baseFog);
    tmpB.set(targetFog);
    fog.color.copy(tmpA.lerp(tmpB, mix));
    fog.density = 0.018 + (targetDensity - 0.018) * mix;
  });

  return null;
}

ForestEnvironmentFx.propTypes = {
  robotRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  enabled: PropTypes.bool,
};

CandyFollowCamera.propTypes = {
  targetRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  curveData: PropTypes.shape({
    curve: PropTypes.any,
    sampleTs: PropTypes.any,
    samplePts: PropTypes.any,
  }).isRequired,
  navActive: PropTypes.bool,
  boardMode: PropTypes.bool,
  occluderRootRef: PropTypes.shape({ current: PropTypes.any }),
};

function RobotLobbyReturnAnimator({ enabled, robotRef, request, floorY }) {
  const animRef = useRef(null);
  const lastNonceRef = useRef(0);
  const scratchFrom = useRef(new THREE.Vector3());
  const scratchTo = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!enabled) return;
    const robot = robotRef.current;
    if (!robot) return;

    const nonce = request?.nonce || 0;
    if (nonce && nonce !== lastNonceRef.current) {
      lastNonceRef.current = nonce;

      scratchFrom.current.copy(robot.position);

      const fromScene = request?.fromScene;
      const fromNode = fromScene && MAP_NODES[fromScene] ? MAP_NODES[fromScene] : MAP_NODES.hub;
      const hub = MAP_NODES.hub;

      // Nudge the robot away from the destination so "Back" doesn't immediately re-trigger anything.
      const dx = hub[0] - fromNode[0];
      const dz = hub[2] - fromNode[2];
      const len = Math.hypot(dx, dz) || 1;
      const step = 2.2;
      scratchTo.current.set(fromNode[0] + (dx / len) * step, floorY, fromNode[2] + (dz / len) * step);

      animRef.current = {
        start: typeof performance !== 'undefined' ? performance.now() : Date.now(),
        duration: 520,
        from: scratchFrom.current.clone(),
        to: scratchTo.current.clone(),
      };

      robot.userData = robot.userData || {};
      robot.userData.repositioning = true;
      robot.userData.setAction?.('Idle');
    }

    const anim = animRef.current;
    if (!anim) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const t = Math.max(0, Math.min(1, (now - anim.start) / anim.duration));
    const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
    const p = anim.from.clone().lerp(anim.to, ease);
    const jump = Math.sin(Math.PI * t) * 0.55;
    robot.position.set(p.x, floorY + jump, p.z);
    robot.rotation.y = Math.atan2(anim.to.x - p.x, anim.to.z - p.z);

    if (t >= 1) {
      robot.position.y = floorY;
      robot.userData.repositioning = false;
      animRef.current = null;
    }
  });

  return null;
}

function ConfettiField({ floorY }) {
  const instRef = useRef(null);
  const tmpRef = useRef(new THREE.Object3D());
  const stateRef = useRef(null);

  const count = 240;
  const colors = useMemo(
    () => [new THREE.Color(CANDY.roadRed), new THREE.Color(CANDY.mint), new THREE.Color(CANDY.grape), new THREE.Color(CANDY.lemon), new THREE.Color('#ff9bf6'), new THREE.Color('#7afcff')],
    []
  );

  useEffect(() => {
    const pieces = Array.from({ length: count }, (_, i) => {
      const x = (prand(i + 10) - 0.5) * 110;
      const z = (prand(i + 20) - 0.5) * 110;
      const y = floorY + 2 + prand(i + 30) * 18;
      const vy = 0.8 + prand(i + 40) * 1.4;
      const rx = prand(i + 50) * Math.PI * 2;
      const ry = prand(i + 60) * Math.PI * 2;
      const rz = prand(i + 70) * Math.PI * 2;
      const vr = (prand(i + 80) - 0.5) * 4;
      const s = 0.12 + prand(i + 90) * 0.18;
      return { x, y, z, vy, rx, ry, rz, vr, s, c: i % colors.length, wraps: 0 };
    });
    stateRef.current = { pieces };
  }, [colors, floorY]);

  useEffect(() => {
    const inst = instRef.current;
    const st = stateRef.current;
    if (!inst || !st) return;
    for (let i = 0; i < st.pieces.length; i += 1) {
      inst.setColorAt(i, colors[st.pieces[i].c]);
    }
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  }, [colors]);

  useFrame((_, delta) => {
    const inst = instRef.current;
    const st = stateRef.current;
    if (!inst || !st) return;
    const tmp = tmpRef.current;

    for (let i = 0; i < st.pieces.length; i += 1) {
      const p = st.pieces[i];
      p.y -= p.vy * delta;
      p.ry += p.vr * delta;
      p.rx += (p.vr * 0.5) * delta;
      p.rz += (p.vr * 0.35) * delta;
      if (p.y < floorY + 0.25) {
        p.wraps += 1;
        p.x = (prand(i + 10 + p.wraps * 97) - 0.5) * 110;
        p.z = (prand(i + 20 + p.wraps * 97) - 0.5) * 110;
        p.y = floorY + 18 + prand(i + 30 + p.wraps * 97) * 8;
      }

      tmp.position.set(p.x, p.y, p.z);
      tmp.rotation.set(p.rx, p.ry, p.rz);
      tmp.scale.set(p.s, p.s, p.s);
      tmp.updateMatrix();
      inst.setMatrixAt(i, tmp.matrix);
    }

    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instRef} args={[null, null, count]}>
      <planeGeometry args={[1, 0.6]} />
      <meshBasicMaterial transparent opacity={0.9} side={THREE.DoubleSide} vertexColors />
    </instancedMesh>
  );
}

ConfettiField.propTypes = {
  floorY: PropTypes.number.isRequired,
};

function CandyLandscape({ floorY }) {
  const items = useMemo(() => {
    const out = [];
    for (let i = 0; i < 34; i += 1) {
      const a = prand(i + 111) * Math.PI * 2;
      const r = 18 + prand(i + 222) * 40;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 6;
      const s = 1.2 + prand(i + 333) * 3.2;
      const kind = i % 4; // 0: frosting hill, 1: gumdrop rock, 2: lollipop tree, 3: chocolate platform
      out.push({ key: i, x, z, s, kind });
    }
    return out;
  }, []);

  return (
    <group>
      {items.map((it) => (
        <group key={it.key} position={[it.x, floorY, it.z]} scale={it.s}>
          {it.kind === 0 ? (
            <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
              <sphereGeometry args={[1.35, 22, 18]} />
              <meshPhysicalMaterial
                color="#fff7ff"
                roughness={0.08}
                metalness={0}
                transmission={0.18}
                thickness={0.9}
                ior={1.22}
                clearcoat={1}
                clearcoatRoughness={0.04}
              />
            </mesh>
          ) : null}

          {it.kind === 1 ? (
            <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
              <sphereGeometry args={[1.05, 18, 14]} />
              <meshPhysicalMaterial
                color={it.key % 2 ? CANDY.mint : CANDY.grape}
                roughness={0.02}
                metalness={0.04}
                transmission={0.35}
                thickness={1.1}
                clearcoat={1}
                clearcoatRoughness={0.02}
                emissive={it.key % 2 ? CANDY.mint : CANDY.grape}
                emissiveIntensity={0.04}
              />
            </mesh>
          ) : null}

          {it.kind === 2 ? (
            <group>
              <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.12, 0.18, 1.2, 10]} />
                <meshPhysicalMaterial color="#fff7ff" roughness={0.08} metalness={0.02} clearcoat={1} clearcoatRoughness={0.02} />
              </mesh>
              <mesh position={[0, 1.55, 0]} castShadow>
                <sphereGeometry args={[0.78, 20, 18]} />
                <meshPhysicalMaterial
                  color={CANDY.roadRed}
                  roughness={0}
                  metalness={0.03}
                  clearcoat={1}
                  clearcoatRoughness={0}
                  emissive={CANDY.roadRed}
                  emissiveIntensity={0.06}
                />
              </mesh>
              <mesh position={[0, 1.55, 0]} rotation={[0, 0, Math.PI / 4]}>
                <torusGeometry args={[0.58, 0.10, 12, 36]} />
                <meshPhysicalMaterial color={CANDY.lemon} roughness={0} metalness={0.02} clearcoat={1} clearcoatRoughness={0} emissive={CANDY.lemon} emissiveIntensity={0.04} />
              </mesh>
            </group>
          ) : null}

          {it.kind === 3 ? (
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.4, 0.4, 2.4]} />
              <meshPhysicalMaterial color={CANDY.chocolate} roughness={0.12} metalness={0.06} clearcoat={1} clearcoatRoughness={0.12} />
            </mesh>
          ) : null}
        </group>
      ))}
    </group>
  );
}

CandyLandscape.propTypes = {
  floorY: PropTypes.number.isRequired,
};

function CaramelRiver({ floorY, texture }) {
  const geom = useMemo(() => {
    const pts = [];
    const steps = 14;
    for (let i = 0; i < steps; i += 1) {
      const t = i / (steps - 1);
      const x = (t - 0.5) * 90;
      const z = Math.sin(t * Math.PI * 2.2) * 18 - 10;
      pts.push(new THREE.Vector3(x, floorY - 0.01, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.45);
    return new THREE.TubeGeometry(curve, 220, 2.6, 18, false);
  }, [floorY]);

  return (
    <mesh geometry={geom} receiveShadow>
      <meshPhysicalMaterial
        color="#c56a2a"
        map={texture || undefined}
        roughness={0.06}
        metalness={0.05}
        transmission={0.22}
        thickness={1.4}
        ior={1.28}
        clearcoat={1}
        clearcoatRoughness={0.03}
        emissive="#ffbb6e"
        emissiveIntensity={0.04}
      />
    </mesh>
  );
}

CaramelRiver.propTypes = {
  floorY: PropTypes.number.isRequired,
  texture: PropTypes.any,
};

function JellyBridges({ floorY }) {
  const bridges = useMemo(() => {
    const out = [];
    for (let i = 0; i < 3; i += 1) {
      const x = (-20 + i * 22);
      const z = -10;
      out.push({ key: i, x, z, rot: (i - 1) * 0.12 });
    }
    return out;
  }, []);

  return (
    <group>
      {bridges.map((b) => (
        <group key={b.key} position={[b.x, floorY + 0.25, b.z]} rotation={[0, b.rot, 0]}>
          <mesh castShadow receiveShadow>
            <torusGeometry args={[2.2, 0.32, 14, 40, Math.PI]} />
            <meshPhysicalMaterial
              color={CANDY.skyBlue}
              roughness={0.02}
              metalness={0.02}
              transmission={0.55}
              thickness={1.2}
              ior={1.2}
              clearcoat={1}
              clearcoatRoughness={0.02}
              emissive={CANDY.mint}
              emissiveIntensity={0.05}
            />
          </mesh>
          <mesh position={[0, -0.8, 0]}>
            <boxGeometry args={[4.6, 0.2, 1.6]} />
            <meshPhysicalMaterial color="#fff7ff" roughness={0.08} metalness={0.02} clearcoat={1} clearcoatRoughness={0.04} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

JellyBridges.propTypes = {
  floorY: PropTypes.number.isRequired,
};

RobotLobbyReturnAnimator.propTypes = {
  enabled: PropTypes.bool,
  robotRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  request: PropTypes.shape({
    nonce: PropTypes.number,
    fromScene: PropTypes.string,
    at: PropTypes.number,
  }),
  floorY: PropTypes.number.isRequired,
};

export default function ThreeDemo({
  autoWalkTarget,
  onAutoWalkArrived,
  controlsEnabled = true,
  sceneId,
  gestureRef,
  avatarFaceUrl,
  onLobbyPoiNavigate,
  onLobbyPortalEnter,
  lobbyReturnEvent,
  badges,
  shopState,
}) {
  const robotRef = useRef(null);
  const worldRef = useRef(null);
  const sunRef = useRef(null);
  const sunGroupRef = useRef(null);
  const dirLightRef = useRef(null);
  const dirLightTargetRef = useRef(null);
  const floorY = MAP_Y;
  const isLobby = sceneId === SCENES.lobby;
  const isCave = sceneId === SCENES.strength;
  const isShop = sceneId === SCENES.clothing;
  const navActive = Array.isArray(autoWalkTarget) && autoWalkTarget.length >= 3;

  const [laptopCanvas] = useState(null);

  const completion = useMemo(
    () => ({
      password: Boolean(badges?.goldenKey),
      privacy: Boolean(badges?.privacyShield),
      shop: Boolean(shopState?.ownedItems?.length),
    }),
    [badges, shopState]
  );

  useEffect(() => {
    const preventArrowScroll = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    };
    window.addEventListener('keydown', preventArrowScroll);
    return () => window.removeEventListener('keydown', preventArrowScroll);
  }, []);

  const handleAutoWalkArrived = () => {
    if (typeof onAutoWalkArrived === 'function') onAutoWalkArrived();
  };

  const curveData = useMemo(() => buildCurveData(CANDY_PATH_POINTS), []);

  // Preserve the forest path position when temporarily switching into the cave.
  const prevSceneRef = useRef(sceneId);
  useEffect(() => {
    const robot = robotRef.current;
    const prevScene = prevSceneRef.current;
    if (prevScene === sceneId) return;

    if (robot && (sceneId === SCENES.strength || sceneId === SCENES.clothing)) {
      robot.userData._savedForestPathT = robot.userData.pathT;
    }

    if (robot && (prevScene === SCENES.strength || prevScene === SCENES.clothing) && sceneId === SCENES.lobby) {
      const tSaved = robot.userData._savedForestPathT;
      if (typeof tSaved === 'number' && curveData?.curve) {
        const p = curveData.curve.getPointAt(((tSaved % 1) + 1) % 1);
        const terrainY = floorY + forestTerrainHeight(p.x, p.z) + FOREST_PATH_SURFACE_LIFT;
        robot.position.set(p.x, terrainY, p.z);
        robot.userData.pathT = tSaved;
        robot.rotation.z = 0;
      }
    }

    prevSceneRef.current = sceneId;
  }, [sceneId, curveData, floorY]);

  function CaveCameraRig() {
    const { camera } = useThree();
    const tmp = useRef({
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
    });

    useFrame((_, delta) => {
      const targetPos = tmp.current.pos.set(0, floorY + 2.2, 6.2);
      const targetLook = tmp.current.look.set(0, floorY + 1.35, 0);
      const a = 1 - Math.exp(-(delta || 0.016) * 6);
      camera.position.lerp(targetPos, a);
      camera.lookAt(targetLook);
    });
    return null;
  }

  function StrengthCaveWorld() {
    return (
      <group>
        <fog attach="fog" args={['#05060c', 6, 22]} />

        <ambientLight intensity={0.35} color={'#b6c6ff'} />
        <pointLight position={[0, floorY + 3.2, 2.0]} intensity={28} distance={18} color={'#00f2ff'} />
        <pointLight position={[2.8, floorY + 2.0, -2.6]} intensity={18} distance={16} color={'#7000ff'} />

        {/* Cave shell */}
        <mesh position={[0, floorY + 2.4, 0]}>
          <sphereGeometry args={[18, 48, 32]} />
          <meshStandardMaterial color={'#0a0b1e'} roughness={1} metalness={0} side={THREE.BackSide} />
        </mesh>

        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]} receiveShadow>
          <circleGeometry args={[10, 48]} />
          <meshStandardMaterial color={'#05060c'} roughness={1} metalness={0} />
        </mesh>

        {/* Tunnel ring (visual "entrance") */}
        <mesh rotation={[0, 0, 0]} position={[0, floorY + 1.5, -4.2]}>
          <torusGeometry args={[1.9, 0.12, 16, 64]} />
          <meshStandardMaterial color={'#00f2ff'} emissive={'#00f2ff'} emissiveIntensity={0.7} roughness={0.2} metalness={0.2} />
        </mesh>
        <mesh rotation={[0, 0, 0]} position={[0, floorY + 1.5, -4.2]}>
          <torusGeometry args={[2.3, 0.04, 10, 64]} />
          <meshStandardMaterial color={'#7000ff'} emissive={'#7000ff'} emissiveIntensity={0.45} roughness={0.2} metalness={0.2} />
        </mesh>
      </group>
    );
  }

  function ClothingShopWorld() {
    return (
      <group>
        <fog attach="fog" args={['#1a0033', 8, 28]} />

        <ambientLight intensity={0.5} color={'#d4c0ff'} />
        <pointLight position={[0, floorY + 4, 0]} intensity={35} distance={20} color={'#ff00ff'} />
        <pointLight position={[3, floorY + 2.5, -3]} intensity={22} distance={18} color={'#00ffff'} />
        <pointLight position={[-3, floorY + 2.5, 3]} intensity={22} distance={18} color={'#ffb347'} />

        {/* Shop interior shell */}
        <mesh position={[0, floorY + 3, 0]}>
          <sphereGeometry args={[20, 48, 32]} />
          <meshStandardMaterial color={'#2d1b4e'} roughness={0.8} metalness={0.1} side={THREE.BackSide} />
        </mesh>

        {/* Floor with pattern */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]} receiveShadow>
          <circleGeometry args={[12, 64]} />
          <meshStandardMaterial color={'#1a0033'} roughness={0.9} metalness={0.05} />
        </mesh>

        {/* Decorative shop display stands */}
        {[0, 120, 240].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * 5;
          const z = Math.sin(rad) * 5;
          return (
            <group key={i} position={[x, floorY, z]}>
              {/* Stand base */}
              <mesh position={[0, 0.6, 0]}>
                <cylinderGeometry args={[0.4, 0.5, 1.2, 16]} />
                <meshStandardMaterial color={'#8a2be2'} emissive={'#8a2be2'} emissiveIntensity={0.3} roughness={0.3} metalness={0.6} />
              </mesh>
              {/* Display top */}
              <mesh position={[0, 1.3, 0]}>
                <boxGeometry args={[0.8, 0.1, 0.8]} />
                <meshStandardMaterial color={'#ff00ff'} emissive={'#ff00ff'} emissiveIntensity={0.4} roughness={0.2} metalness={0.7} />
              </mesh>
              {/* Floating item icon */}
              <mesh position={[0, 2, 0]} rotation={[0, Date.now() * 0.0001 + i, 0]}>
                <torusGeometry args={[0.3, 0.08, 12, 24]} />
                <meshStandardMaterial color={'#00ffff'} emissive={'#00ffff'} emissiveIntensity={0.6} roughness={0.1} metalness={0.8} />
              </mesh>
            </group>
          );
        })}

        {/* Entrance portal ring */}
        <mesh rotation={[0, 0, 0]} position={[0, floorY + 1.8, -5]}>
          <torusGeometry args={[2.2, 0.15, 16, 64]} />
          <meshStandardMaterial color={'#ff00ff'} emissive={'#ff00ff'} emissiveIntensity={0.8} roughness={0.2} metalness={0.3} />
        </mesh>
        <mesh rotation={[0, 0, 0]} position={[0, floorY + 1.8, -5]}>
          <torusGeometry args={[2.6, 0.06, 10, 64]} />
          <meshStandardMaterial color={'#00ffff'} emissive={'#00ffff'} emissiveIntensity={0.5} roughness={0.2} metalness={0.3} />
        </mesh>
      </group>
    );
  }

  const roomPortals = useMemo(() => {
    const defs = [
      { scene: SCENES.privacy, label: 'Privacy', accent: '#a78bff' },
      { scene: SCENES.shop, label: 'Shop', accent: '#ff6ec7' },
      { scene: SCENES.strength, label: 'Password Meter', accent: '#4cffd7' },
      { scene: SCENES.clothing, label: 'Clothing', accent: '#ffb347' },
    ];

    const base = defs
      .map((d, idx) => {
        const node = MAP_NODES?.[d.scene];
        if (!Array.isArray(node) || node.length < 3) return null;
        const p = new THREE.Vector3(node[0], node[1], node[2]);
        const t = closestTOnSamples(p, curveData.sampleTs, curveData.samplePts);
        return {
          ...d,
          t,
          side: idx % 2 === 0 ? 1 : -1,
        };
      })
      .filter(Boolean);

    // לפחות עוד 4 יציאות לאורך השביל.
    const clamp01 = (v) => Math.max(0.03, Math.min(0.97, v));
    const tooClose = (a, b) => Math.abs(a - b) < 0.06;
    const existingTs = base.map((p) => Number(p.t ?? 0)).filter((v) => Number.isFinite(v));

    const findNonOverlappingT = (preferred) => {
      let t = clamp01(preferred);
      for (let i = 0; i < 8; i += 1) {
        const clash = existingTs.some((et) => tooClose(et, t));
        if (!clash) return t;
        t = clamp01(t + (i % 2 === 0 ? 0.045 : -0.045));
      }
      return t;
    };

    const shopT = base.find((p) => p.scene === SCENES.shop)?.t;

    const extras = [
      { scene: SCENES.entry, label: 'Entry', accent: '#ffe36a', t: findNonOverlappingT(0.08), side: -1 },
      { scene: SCENES.lobby, label: 'Lobby', accent: '#fff44f', t: findNonOverlappingT(0.16), side: 1 },
      { scene: SCENES.tryAgain, label: 'Try Again', accent: '#ffb7d5', t: findNonOverlappingT(0.86), side: -1 },
      { scene: SCENES.shop, label: 'Shop (Back)', accent: '#ff6ec7', t: findNonOverlappingT(clamp01(Number(shopT ?? 0.62) + 0.09)), side: 1 },
    ];

    return [...base, ...extras];
  }, [curveData]);

  function SunRig() {
    const sunFollow = useRef({
      fwd: new THREE.Vector3(),
      right: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
    });

    // Keep the sun + directional light roughly aligned with camera view.
    useFrame(({ camera }, delta) => {
      const g = sunGroupRef.current;
      const light = dirLightRef.current;
      const target = dirLightTargetRef.current;
      if (!g || !light || !camera) return;

      const { fwd, right, tmp } = sunFollow.current;
      camera.getWorldDirection(fwd);
      fwd.normalize();
      right.crossVectors(fwd, camera.up).normalize();

      // Position the sun in front-right of the camera, high up.
      const robot = robotRef.current;
      const base = robot ? robot.position : tmp.set(0, floorY, 0);
      g.position.copy(base)
        .addScaledVector(fwd, 55)
        .addScaledVector(right, 26);
      g.position.y = floorY + 56;

      if (target && robot) target.position.copy(robot.position);
      if (target) light.target = target;

      // Gentle smoothing so it doesn't jitter.
      light.position.lerp(g.position, 1 - Math.exp(-(delta || 0.016) * 2.5));
    });

    return null;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 3.2, 9], fov: 50, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        {isCave ? (
          <>
            <StrengthCaveWorld />
            <CaveCameraRig />
          </>
        ) : isShop ? (
          <>
            <ClothingShopWorld />
            <CaveCameraRig />
          </>
        ) : (
          <>
            <SunRig />
            <SceneAtmosphere mode={'forest'} />
            <ForestEnvironmentFx robotRef={robotRef} enabled />

            {/* Forest lighting */}
            <ambientLight intensity={1.25} color={'#f3fff6'} />
            <hemisphereLight intensity={1.05} skyColor={'#effff7'} groundColor={'#2a6b2f'} />
            <directionalLight
              ref={dirLightRef}
              position={[-14, 18, 8]}
              intensity={1.85}
              color={'#fff3b0'}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <object3D ref={dirLightTargetRef} position={[0, 0, 0]} />

            {/* Sun (visual) */}
            <group ref={sunGroupRef} position={[42, 56, -36]}>
              <mesh ref={sunRef}>
                <sphereGeometry args={[2.6, 24, 16]} />
                <meshBasicMaterial color={'#ffe36a'} toneMapped={false} />
              </mesh>
              {/* soft glow */}
              <mesh>
                <sphereGeometry args={[6.2, 24, 16]} />
                <meshBasicMaterial
                  color={'#ffd54a'}
                  transparent
                  opacity={0.36}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </group>

            <ForestSky />

            <group ref={worldRef}>
              <ForestWorld
                floorY={floorY}
                curveData={curveData}
                robotRef={robotRef}
                gestureRef={gestureRef}
                roomPortals={roomPortals}
                completion={completion}
                onPortalEnter={onLobbyPortalEnter}
              />
            </group>
          </>
        )}

        <RobotModel
          robotRef={robotRef}
          avatarFaceUrl={avatarFaceUrl}
          avatarDominantColor={null}
          equippedItem={shopState?.equippedItem || undefined}
        />

        <RobotController
          robotRef={robotRef}
          controlsEnabled={controlsEnabled}
          gestureRef={gestureRef}
          floorY={floorY}
          curveData={curveData}
          roomPortals={roomPortals}
          autoWalkTarget={autoWalkTarget}
          onAutoWalkArrived={handleAutoWalkArrived}
          idlePatrolEnabled={false}
          equippedItem={shopState?.equippedItem || undefined}
          laptopCanvas={laptopCanvas}
          mode={isCave || isShop ? 'cave' : 'forest'}
        />

        {!isCave ? (
          <CandyFollowCamera
            targetRef={robotRef}
            curveData={curveData}
            navActive={navActive}
            occluderRootRef={worldRef}
          />
        ) : null}

        {/* Postprocessing */}
        <EffectComposer>
          <Bloom
            intensity={isCave ? 0.9 : 1.05}
            luminanceThreshold={isCave ? 0.25 : 0.42}
            luminanceSmoothing={0.14}
            mipmapBlur
          />
          {!isCave && sunRef.current ? (
            <GodRays
              sun={sunRef}
              samples={70}
              density={1.0}
              decay={0.96}
              weight={0.85}
              exposure={0.48}
              clampMax={1}
              blur
            />
          ) : null}
        </EffectComposer>

        {/* Follow camera controls the camera; disable OrbitControls to avoid it overriding lookAt each frame. */}
        <OrbitControls enabled={false} />
      </Canvas>
    </div>
  );
}

ThreeDemo.propTypes = {
  autoWalkTarget: PropTypes.arrayOf(PropTypes.number),
  onAutoWalkArrived: PropTypes.func,
  controlsEnabled: PropTypes.bool,
  neonMode: PropTypes.bool,
  sceneId: PropTypes.string,
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
  avatarFaceUrl: PropTypes.string,
  onLobbyPoiNavigate: PropTypes.func,
  onLobbyPortalEnter: PropTypes.func,
  lobbyReturnEvent: PropTypes.shape({
    nonce: PropTypes.number,
    fromScene: PropTypes.string,
    at: PropTypes.number,
  }),
  badges: PropTypes.shape({
    goldenKey: PropTypes.bool,
    privacyShield: PropTypes.bool,
  }),
  shopState: PropTypes.shape({
    ownedItems: PropTypes.arrayOf(PropTypes.string),
    equippedItem: PropTypes.string,
  }),
};
