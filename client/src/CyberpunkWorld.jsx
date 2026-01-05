/* eslint-disable react/no-unknown-property */
import { useLayoutEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const EXACT_COLORS = Object.freeze({
  skyTop: '#4A3B6B',
  skyMid: '#6B5B95',
  skyLight: '#8B7BA8',
  skyBottom: '#FF8C69',
  buildingDark: '#2D2541',
  buildingDarker: '#1E1831',
  buildingLight: '#3D3554',
  windowCyan: '#00E5FF',
  windowOrange: '#FF9B54',
  windowYellow: '#FFB84D',
  padlockCyan: '#00E5FF',
  groundDark: '#2D2541',
  groundLight: '#3D3554',
  outlineDark: '#1A1A2E',
});

function prand(n) {
  const x = Math.sin(n * 913.17 + n * n * 0.137) * 43758.5453123;
  return x - Math.floor(x);
}

export function CyberpunkAtmosphere() {
  // Scene background/fog are controlled by ThreeDemo.
  return null;
}

function makeReferenceBackgroundResources() {
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;

  return { canvas, ctx, tex };
}

export function CyberpunkWorld({ floorY = 0 }) {
  const bg = useMemo(() => (typeof document === 'undefined' ? null : makeReferenceBackgroundResources()), []);

  const particles2D = useMemo(() => {
    const out = [];
    const count = 30;
    for (let i = 0; i < count; i += 1) {
      const x = prand(1000 + i);
      const y = prand(2000 + i);
      const size = 1 + prand(3000 + i) * 3;
      const color = prand(4000 + i) > 0.5 ? EXACT_COLORS.windowCyan : EXACT_COLORS.windowYellow;
      out.push({ x, y, size, color });
    }
    return out;
  }, []);

  const drawBackground = (timeMs) => {
    if (!bg) return;
    const { canvas, ctx } = bg;
    const w = canvas.width;
    const h = canvas.height;

    const roundRect = (x, y, rw, rh, rr) => {
      const r = Math.max(0, Math.min(rr, Math.min(rw, rh) / 2));
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + rw, y, x + rw, y + rh, r);
      ctx.arcTo(x + rw, y + rh, x, y + rh, r);
      ctx.arcTo(x, y + rh, x, y, r);
      ctx.arcTo(x, y, x + rw, y, r);
      ctx.closePath();
    };

    const drawSky = () => {
      const skyGradient = ctx.createLinearGradient(0, 0, 0, h * 0.3);
      skyGradient.addColorStop(0, EXACT_COLORS.skyTop);
      skyGradient.addColorStop(0.4, EXACT_COLORS.skyMid);
      skyGradient.addColorStop(0.7, EXACT_COLORS.skyLight);
      skyGradient.addColorStop(1, EXACT_COLORS.skyBottom);
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, w, h * 0.3);

      const glow = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.3, w * 0.55);
      glow.addColorStop(0, 'rgba(255,140,105,0.55)');
      glow.addColorStop(1, 'rgba(255,140,105,0.0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h * 0.55);
    };

    const buildingColors = {
      main: EXACT_COLORS.buildingDark,
      highlight: EXACT_COLORS.buildingLight,
    };

    const drawBuilding = (b, seed) => {
      const { x, y, width, height } = b;
      ctx.fillStyle = buildingColors.main;
      ctx.fillRect(x, y, width, height);

      ctx.fillStyle = buildingColors.highlight;
      ctx.fillRect(x, y, 3, height);

      const windowRows = Math.floor(height / 25);
      const windowCols = Math.floor(width / 20);
      const windowColors = [EXACT_COLORS.windowCyan, EXACT_COLORS.windowOrange, '#00FFFF', EXACT_COLORS.windowYellow];

      for (let row = 0; row < windowRows; row += 1) {
        for (let col = 0; col < windowCols; col += 1) {
          const wx = x + col * 20 + 5;
          const wy = y + row * 25 + 5;
          const r = prand(seed * 10000 + row * 101 + col * 37);

          if (r > 0.3) {
            const c = windowColors[Math.floor(prand(seed * 5000 + row * 17 + col * 19) * windowColors.length)];
            ctx.fillStyle = c;
            ctx.shadowBlur = 8;
            ctx.shadowColor = c;
            ctx.fillRect(wx, wy, 10, 15);
            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = EXACT_COLORS.outlineDark;
            ctx.fillRect(wx, wy, 10, 15);
          }
        }
      }
    };

    const leftBuildings = [
      { x: 0, y: h * 0.25, width: w * 0.15, height: h * 0.75 },
      { x: w * 0.12, y: h * 0.2, width: w * 0.12, height: h * 0.8 },
      { x: w * 0.22, y: h * 0.3, width: w * 0.1, height: h * 0.7 },
    ];
    const rightBuildings = [
      { x: w * 0.85, y: h * 0.25, width: w * 0.15, height: h * 0.75 },
      { x: w * 0.76, y: h * 0.2, width: w * 0.12, height: h * 0.8 },
      { x: w * 0.68, y: h * 0.3, width: w * 0.1, height: h * 0.7 },
    ];
    const centerBuildings = [
      { x: w * 0.35, y: h * 0.35, width: w * 0.08, height: h * 0.55 },
      { x: w * 0.45, y: h * 0.32, width: w * 0.1, height: h * 0.58 },
      { x: w * 0.57, y: h * 0.38, width: w * 0.08, height: h * 0.52 },
    ];

    const drawLightRays = () => {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const rayLeft = ctx.createLinearGradient(w * 0.15, h * 0.4, w * 0.5, h * 0.6);
      rayLeft.addColorStop(0, 'rgba(0, 229, 255, 0.15)');
      rayLeft.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = rayLeft;
      ctx.fillRect(w * 0.12, h * 0.33, w * 0.45, h * 0.35);

      const rayRight = ctx.createLinearGradient(w * 0.85, h * 0.38, w * 0.5, h * 0.6);
      rayRight.addColorStop(0, 'rgba(255, 155, 84, 0.14)');
      rayRight.addColorStop(1, 'rgba(255, 155, 84, 0)');
      ctx.fillStyle = rayRight;
      ctx.fillRect(w * 0.45, h * 0.34, w * 0.43, h * 0.34);

      ctx.restore();
    };

    const drawHoloScreen = (x, y, ww, hh, color) => {
      ctx.save();
      ctx.fillStyle = `${color}33`;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 30;
      ctx.shadowColor = color;
      ctx.fillRect(x, y, ww, hh);
      ctx.strokeRect(x, y, ww, hh);

      ctx.shadowBlur = 0;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 15 + i * 12);
        ctx.lineTo(x + ww - 10, y + 15 + i * 12);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawPadlock = (x, y, size) => {
      ctx.save();
      const floatY = y + Math.sin(timeMs * 0.002) * 5;
      ctx.shadowBlur = 25;
      ctx.shadowColor = EXACT_COLORS.padlockCyan;

      ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
      ctx.strokeStyle = EXACT_COLORS.padlockCyan;
      ctx.lineWidth = 3;

      const bodyWidth = size;
      const bodyHeight = size * 0.8;
      roundRect(x - bodyWidth / 2, floatY, bodyWidth, bodyHeight, size * 0.15);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, floatY, size * 0.35, Math.PI, 0, false);
      ctx.lineWidth = size * 0.15;
      ctx.stroke();

      ctx.fillStyle = EXACT_COLORS.padlockCyan;
      ctx.shadowBlur = 0;
      ctx.fillRect(x - size * 0.1, floatY + bodyHeight * 0.3, size * 0.2, bodyHeight * 0.3);
      ctx.restore();
    };

    const drawGround = () => {
      const groundGradient = ctx.createLinearGradient(0, h * 0.75, 0, h);
      groundGradient.addColorStop(0, EXACT_COLORS.groundDark);
      groundGradient.addColorStop(1, EXACT_COLORS.groundLight);
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, h * 0.75, w, h * 0.25);

      ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i += 1) {
        const yy = h * 0.75 + i * h * 0.05;
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.lineTo(w, yy);
        ctx.stroke();
      }
    };

    const drawParticles = () => {
      for (const p of particles2D) {
        const px = p.x * w;
        const py = p.y * h * 0.8;
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    // --- Exact render order ---
    ctx.clearRect(0, 0, w, h);
    drawSky();
    for (let i = 0; i < centerBuildings.length; i += 1) drawBuilding(centerBuildings[i], 700 + i);
    drawLightRays();
    for (let i = 0; i < leftBuildings.length; i += 1) drawBuilding(leftBuildings[i], 100 + i);
    for (let i = 0; i < rightBuildings.length; i += 1) drawBuilding(rightBuildings[i], 300 + i);

    const scale = w / 800;
    drawHoloScreen(w * 0.05, h * 0.4, 100 * scale, 80 * scale, EXACT_COLORS.windowCyan);
    drawHoloScreen(w * 0.88, h * 0.35, 80 * scale, 60 * scale, EXACT_COLORS.windowOrange);

    const padlocks = [
      { x: w * 0.1, y: h * 0.15, size: 40 * scale },
      { x: w * 0.25, y: h * 0.12, size: 35 * scale },
      { x: w * 0.75, y: h * 0.18, size: 38 * scale },
      { x: w * 0.08, y: h * 0.5, size: 45 * scale },
      { x: w * 0.5, y: h * 0.25, size: 30 * scale },
    ];
    for (const pl of padlocks) drawPadlock(pl.x, pl.y, pl.size);

    drawGround();
    drawParticles();
  };

  useLayoutEffect(() => {
    if (!bg) return;
    drawBackground(0);
    bg.tex.needsUpdate = true;
  }, [bg]);

  useFrame(({ clock }) => {
    if (!bg) return;
    drawBackground(clock.getElapsedTime() * 1000);
    bg.tex.needsUpdate = true;
  });

  const planeW = 44;
  const planeH = 25;
  const planeZ = -30;
  const planeY = floorY + 7.5;

  return (
    <group>
      <mesh position={[0, planeY, planeZ]} renderOrder={0}>
        <planeGeometry args={[planeW, planeH]} />
        <meshBasicMaterial map={bg?.tex || undefined} toneMapped={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <shadowMaterial opacity={0.25} />
      </mesh>
    </group>
  );
}

CyberpunkWorld.propTypes = {
  floorY: PropTypes.number,
};
