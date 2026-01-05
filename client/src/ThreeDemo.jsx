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
import { CANDY_PATH_POINTS, MAP_Y } from './game/mapTargets.js';
import { useKeyboard } from './useKeyboard';
import { CyberpunkWorld } from './CyberpunkWorld.jsx';
import { ForestSky, ForestWorld } from './ForestWorld.jsx';

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
  autoWalkTarget,
  onAutoWalkArrived,
  idlePatrolEnabled,
  faceTextureUrl,
  equippedItem,
  laptopCanvas,
  mode,
}) {
  const keys = useKeyboard();
  const scratch2 = useRef(new THREE.Vector3());
  const scratch3 = useRef(new THREE.Vector3());
  const prevP = useRef(new THREE.Vector3());
  const hasPrev = useRef(false);
  const prevYaw = useRef(0);

  useFrame(({ clock, camera }, delta) => {
    if (!robotRef.current) return;

    const robot = robotRef.current;
    robot.userData = robot.userData || {};

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

        // Sync leg cadence with input magnitude.
        const speedScale = Math.max(0.2, Math.min(2.2, Math.abs(moveInput) * 1.2));
        robot.userData.setSpeedScale?.(speedScale);
      } else {
        robot.userData.setAction?.('Idle');
        robot.userData.setSpeedScale?.(1);
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
    const dt = (baseSpeed / length) * delta;

    // Continuous forward motion (game-like progress). Keep keyboard/gesture reads to avoid dead code,
    // but the default experience is always moving.
    void keys;
    void gestureRef;
    void controlsEnabled;
    void autoWalkTarget;
    void onAutoWalkArrived;
    void idlePatrolEnabled;

    robot.userData.setAction?.('Walking');
    robot.userData.pathT = robot.userData.pathT + dt;
    if (robot.userData.pathT > 1) robot.userData.pathT -= 1;

    // Keep robot centered; use path tangent for facing direction.
    const t = robot.userData.pathT;
    const p = curveData.curve.getPointAt(t);
    const tan = curveData.curve.getTangentAt(t);
    tan.y = 0;
    if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
    tan.normalize();

    scratch2.current.copy(tan);
    const yaw = Math.atan2(scratch2.current.x, scratch2.current.z);
    robot.rotation.y = yaw;

    const bob = Math.sin(time * 7.2) * 0.045;

    // Place the robot on the route (Google-Maps-ish).
    robot.position.set(p.x, floorY + bob, p.z);

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
    if (delta > 1e-6) {
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
        const speedScale = Math.max(0.25, Math.min(2.75, (speed / baseSpeed) * (1 + Math.min(0.35, turnRate * 0.10))));
        robot.userData.setSpeedScale?.(speedScale);

        prevP.current.copy(p);
        prevYaw.current = yaw;
      }
    }

    // Subtle squash & stretch while walking.
    const targetSX = 1.0 + 0.025 * Math.sin(time * 10.0);
    const targetSY = 1.0 - 0.02 * Math.sin(time * 10.0);
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
      faceTextureUrl={faceTextureUrl || undefined}
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
  autoWalkTarget: PropTypes.arrayOf(PropTypes.number),
  onAutoWalkArrived: PropTypes.func,
  idlePatrolEnabled: PropTypes.bool,
  faceTextureUrl: PropTypes.string,
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
      // No fog in forest: user wants foliage colors not to depend on distance.
      fogColor = '#d9ffe6';
      fogNear = 9999;
      fogFar = 10000;
    }

    scene.background = new THREE.Color(bg);
    scene.fog = mode === 'forest' ? null : new THREE.Fog(fogColor, fogNear, fogFar);
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
    const hue = (t * 0.22) % 1;
    mat.emissive.setHSL(hue, 0.9, 0.58);
    mat.emissiveIntensity = 0.35 + 0.18 * Math.sin(t * 10.0);
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

function CandyFollowCamera({ targetRef, curveData, navActive, boardMode = false }) {
  const isoOffset = useMemo(
    () => (boardMode ? new THREE.Vector3(6.2, 16.5, 12.8) : new THREE.Vector3(10.5, 10.0, 10.5)),
    [boardMode]
  );
  const scratchRef = useRef(new THREE.Vector3());
  const scratch2Ref = useRef(new THREE.Vector3());
  const scratch3Ref = useRef(new THREE.Vector3());
  const shakeScratchRef = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    if (!targetRef.current) return;
    if (!curveData?.curve) return;
    const target = targetRef.current;
    const p = target.position;

    const t = typeof target.userData?.pathT === 'number'
      ? target.userData.pathT
      : closestTOnSamples(p, curveData.sampleTs, curveData.samplePts);

    const tan = curveData.curve.getTangentAt(t);
    tan.y = 0;
    if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
    tan.normalize();

    const scratch = scratchRef.current;
    const scratch2 = scratch2Ref.current;
    const scratch3 = scratch3Ref.current;

    const ahead = boardMode ? (navActive ? 2.2 : 1.6) : (navActive ? 2.6 : 1.9);
    scratch.copy(p).addScaledVector(tan, ahead);
    scratch3.copy(p).add(isoOffset).addScaledVector(tan, boardMode ? 0.45 : 0.8);
    scratch2.copy(scratch3);

    camera.position.lerp(scratch2, 0.08);

    // Subtle candy shake (triggered externally).
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const shake = target.userData?.cameraShake;
    if (shake && nowMs < shake.untilMs) {
      const t01 = 1 - Math.max(0, Math.min(1, (shake.untilMs - nowMs) / shake.durationMs));
      const falloff = 1 - t01;
      const amp = shake.amp * (falloff ** 2);
      const sx = Math.sin(nowMs * 0.03) * amp;
      const sy = Math.sin(nowMs * 0.041) * amp * 0.6;
      const sz = Math.cos(nowMs * 0.028) * amp;
      shakeScratchRef.current.set(sx, sy, sz);
      camera.position.add(shakeScratchRef.current);
    }

    camera.lookAt(scratch.x, p.y + (boardMode ? 1.05 : 1.25), scratch.z);
  });

  return null;
}

CandyFollowCamera.propTypes = {
  targetRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  curveData: PropTypes.shape({
    curve: PropTypes.any,
    sampleTs: PropTypes.any,
    samplePts: PropTypes.any,
  }).isRequired,
  navActive: PropTypes.bool,
  boardMode: PropTypes.bool,
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
  lobbyReturnEvent,
  badges,
  shopState,
}) {
  const robotRef = useRef(null);
  const worldRef = useRef(null);
  const sunRef = useRef(null);
  const floorY = MAP_Y;
  const isLobby = sceneId === SCENES.lobby;
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
    const robot = robotRef.current;
    if (robot) {
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      robot.userData = robot.userData || {};
      robot.userData.cameraShake = { untilMs: nowMs + 380, durationMs: 380, amp: 0.22 };
    }
    if (typeof onAutoWalkArrived === 'function') onAutoWalkArrived();
  };

  const curveData = useMemo(() => buildCurveData(CANDY_PATH_POINTS), []);

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [10, 10, 10], fov: 50, near: 0.05, far: 420 }}
        shadows
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <SceneAtmosphere mode={'forest'} />

        {/* Forest lighting */}
        <ambientLight intensity={1.25} color={'#f3fff6'} />
        <hemisphereLight intensity={1.05} skyColor={'#effff7'} groundColor={'#2a6b2f'} />
        <directionalLight
          position={[-14, 18, 8]}
          intensity={1.65}
          color={'#ffffff'}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* Sun (visual) */}
        <group position={[42, 56, -36]}>
          <mesh ref={sunRef}>
            <sphereGeometry args={[2.2, 24, 16]} />
            <meshBasicMaterial color={'#fff6d6'} toneMapped={false} />
          </mesh>
          {/* soft glow */}
          <mesh>
            <sphereGeometry args={[4.6, 24, 16]} />
            <meshBasicMaterial
              color={'#ffe7a8'}
              transparent
              opacity={0.22}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>

        <ForestSky />

        <group ref={worldRef}>
          <ForestWorld floorY={floorY} curveData={curveData} />
        </group>

        <RobotController
          robotRef={robotRef}
          controlsEnabled={controlsEnabled}
          gestureRef={gestureRef}
          floorY={floorY}
          curveData={curveData}
          autoWalkTarget={autoWalkTarget}
          onAutoWalkArrived={handleAutoWalkArrived}
          idlePatrolEnabled={false}
          faceTextureUrl={avatarFaceUrl || undefined}
          equippedItem={shopState?.equippedItem || undefined}
          laptopCanvas={laptopCanvas}
          mode={'forest'}
        />

        <CandyFollowCamera targetRef={robotRef} curveData={curveData} navActive={navActive} />

        {/* Postprocessing candy bloom */}
        <EffectComposer>
          <Bloom intensity={0.85} luminanceThreshold={0.55} luminanceSmoothing={0.12} mipmapBlur />
          {sunRef.current ? (
            <GodRays
              sun={sunRef}
              samples={45}
              density={0.9}
              decay={0.92}
              weight={0.7}
              exposure={0.28}
              clampMax={1}
              blur
            />
          ) : null}
        </EffectComposer>

        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} enableKeys={false} />
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
