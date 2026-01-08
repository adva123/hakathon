import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

const COLORS = {
  skyTop: '#2D1B4E',
  skyMid1: '#4A3B6B',
  skyMid2: '#6B5B95',
  skyMid3: '#8B7BA8',
  skyBottom: '#FF8C69',

  buildingDark: '#2D2541',
  buildingDarker: '#1E1831',
  buildingLight: '#3D3554',
  windowDark: '#1A1A2E',

  windowCyan: '#00E5FF',
  windowOrange: '#FF9B54',
  windowYellow: '#FFB84D',
  windowBrightCyan: '#00FFFF',
  windowPurple: '#B8A5D6',

  padlockCyan: '#00E5FF',

  ground1: '#3D3554',
  ground2: '#2D2541',
  ground3: '#1E1831',
};

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSky(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h * 0.35);
  grad.addColorStop(0, COLORS.skyTop);
  grad.addColorStop(0.3, COLORS.skyMid1);
  grad.addColorStop(0.6, COLORS.skyMid2);
  grad.addColorStop(0.85, COLORS.skyMid3);
  grad.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h * 0.35);

  // Horizon glow
  const rg = ctx.createRadialGradient(w / 2, h * 0.35, 10, w / 2, h * 0.35, w * 0.65);
  rg.addColorStop(0, 'rgba(255,140,105,0.55)');
  rg.addColorStop(0.35, 'rgba(255,140,105,0.22)');
  rg.addColorStop(1, 'rgba(255,140,105,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h * 0.6);
}

function drawLightRays(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const rayCount = 8;
  for (let i = 0; i < rayCount; i += 1) {
    const angle = (i / rayCount) * Math.PI;
    const length = h * 0.6;
    const g = ctx.createLinearGradient(
      w / 2,
      h * 0.35,
      w / 2 + Math.cos(angle) * length,
      h * 0.35 + Math.sin(angle) * length
    );
    g.addColorStop(0, 'rgba(255, 140, 105, 0.15)');
    g.addColorStop(1, 'rgba(255, 140, 105, 0)');

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.35);
    ctx.lineTo(w / 2 + Math.cos(angle - 0.1) * length, h * 0.35 + Math.sin(angle - 0.1) * length);
    ctx.lineTo(w / 2 + Math.cos(angle + 0.1) * length, h * 0.35 + Math.sin(angle + 0.1) * length);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawDetailedBuilding(ctx, b, seed) {
  const { x, y, width, height, color } = b;

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);

  // Shadow/edge lighting from sunset
  const edge = ctx.createLinearGradient(x, y, x + width, y);
  edge.addColorStop(0, 'rgba(255, 140, 105, 0.28)');
  edge.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = edge;
  ctx.fillRect(x, y, width, height);

  // Thin highlight edge (left)
  ctx.fillStyle = COLORS.buildingLight;
  ctx.fillRect(x, y, 3, height);

  // Windows (deterministic)
  const rand = mulberry32(seed);
  const windowWidth = 8;
  const windowHeight = 12;
  const windowSpacingX = 15;
  const windowSpacingY = 18;
  const cols = Math.max(1, Math.floor(width / windowSpacingX));
  const rows = Math.max(1, Math.floor(height / windowSpacingY));

  const palette = [
    COLORS.windowCyan,
    COLORS.windowOrange,
    COLORS.windowBrightCyan,
    COLORS.windowYellow,
    COLORS.windowPurple,
  ];

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const wx = x + col * windowSpacingX;
      const wy = y + row * windowSpacingY;
      if (wx + windowWidth > x + width - 4 || wy + windowHeight > y + height - 4) continue;

      if (rand() > 0.3) {
        const windowColor = palette[Math.floor(rand() * palette.length)];
        ctx.save();
        ctx.fillStyle = windowColor;
        ctx.shadowBlur = 6;
        ctx.shadowColor = windowColor;
        ctx.fillRect(wx, wy, windowWidth, windowHeight);
        ctx.restore();
      } else {
        ctx.fillStyle = COLORS.windowDark;
        ctx.fillRect(wx, wy, windowWidth, windowHeight);
      }
    }
  }
}

function drawPadlock(ctx, x, y, size, tMs) {
  ctx.save();

  const floatOffset = Math.sin(tMs * 0.001 + x) * 8;
  const currentY = y + floatOffset;
  const pulseGlow = 20 + Math.sin(tMs * 0.002) * 10;

  ctx.shadowBlur = pulseGlow;
  ctx.shadowColor = COLORS.padlockCyan;

  const bodyWidth = size;
  const bodyHeight = size * 0.7;
  const cornerRadius = size * 0.12;

  ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
  roundRect(ctx, x - bodyWidth / 2, currentY, bodyWidth, bodyHeight, cornerRadius);
  ctx.fill();

  ctx.strokeStyle = COLORS.padlockCyan;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Shackle
  ctx.beginPath();
  ctx.arc(x, currentY, size * 0.35, Math.PI, 0, false);
  ctx.lineWidth = size * 0.14;
  ctx.strokeStyle = COLORS.padlockCyan;
  ctx.stroke();

  // Keyhole
  ctx.shadowBlur = 15;
  ctx.fillStyle = COLORS.windowBrightCyan;
  const keyholeWidth = size * 0.15;
  const keyholeHeight = bodyHeight * 0.35;
  ctx.fillRect(x - keyholeWidth / 2, currentY + bodyHeight * 0.25, keyholeWidth, keyholeHeight);

  ctx.beginPath();
  ctx.arc(x, currentY + bodyHeight * 0.5, size * 0.25, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawHoloScreen(ctx, screen, tMs) {
  ctx.save();
  ctx.shadowBlur = 35;
  ctx.shadowColor = screen.color;

  ctx.fillStyle = `${screen.color}22`;
  ctx.fillRect(screen.x, screen.y, screen.width, screen.height);

  ctx.strokeStyle = screen.color;
  ctx.lineWidth = 3;
  ctx.strokeRect(screen.x, screen.y, screen.width, screen.height);

  if (screen.content === 'padlock') {
    drawPadlock(ctx, screen.x + screen.width / 2, screen.y + screen.height / 2 - screen.height * 0.1, screen.width * 0.4, tMs);
  } else {
    ctx.strokeStyle = screen.color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(screen.x + 15, screen.y + 15 + i * 12);
      ctx.lineTo(screen.x + screen.width - 15, screen.y + 15 + i * 12);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawGround(ctx, w, h) {
  const groundStart = h * 0.65;

  const grad = ctx.createLinearGradient(0, groundStart, 0, h);
  grad.addColorStop(0, COLORS.ground1);
  grad.addColorStop(0.5, COLORS.ground2);
  grad.addColorStop(1, COLORS.ground3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, groundStart, w, h - groundStart);

  // Perspective grid lines
  ctx.strokeStyle = 'rgba(107, 91, 149, 0.3)';
  ctx.lineWidth = 1;

  for (let i = 0; i < 8; i += 1) {
    const yy = groundStart + (h - groundStart) * (i / 8);
    const lineWidth = w * (0.3 + (i / 8) * 0.7);
    const lineX = (w - lineWidth) / 2;
    ctx.beginPath();
    ctx.moveTo(lineX, yy);
    ctx.lineTo(lineX + lineWidth, yy);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(107, 91, 149, 0.2)';
  ctx.beginPath();
  ctx.moveTo(w / 2, groundStart);
  ctx.lineTo(w / 2, h);
  ctx.stroke();

  // Robot shadow
  const shadowWidth = 80;
  const shadowHeight = 20;
  const shadowY = h * 0.85;
  const sGrad = ctx.createRadialGradient(w / 2, shadowY, 0, w / 2, shadowY, shadowWidth);
  sGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
  sGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sGrad;
  ctx.beginPath();
  ctx.ellipse(w / 2, shadowY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRobot(ctx, x, y, walkCycle) {
  const baseSize = 80;

  ctx.save();
  ctx.translate(x, y);

  // Head
  const headWidth = baseSize * 0.75;
  const headHeight = baseSize * 0.85;
  const headGrad = ctx.createLinearGradient(-headWidth / 2, -headHeight, headWidth / 2, 0);
  headGrad.addColorStop(0, '#FF8C42');
  headGrad.addColorStop(1, '#FF6B35');
  ctx.fillStyle = headGrad;
  roundRect(ctx, -headWidth / 2, -headHeight, headWidth, headHeight, 15);
  ctx.fill();

  ctx.strokeStyle = COLORS.windowDark;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Eyes
  const eyeRadius = 14;
  const eyeSpacing = headWidth * 0.3;
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLORS.windowCyan;
  const eyeGrad = ctx.createRadialGradient(-eyeSpacing, -headHeight * 0.5, 0, -eyeSpacing, -headHeight * 0.5, eyeRadius);
  eyeGrad.addColorStop(0, '#FFFFFF');
  eyeGrad.addColorStop(0.4, COLORS.windowBrightCyan);
  eyeGrad.addColorStop(1, COLORS.windowCyan);

  ctx.fillStyle = eyeGrad;
  ctx.beginPath();
  ctx.arc(-eyeSpacing, -headHeight * 0.5, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(eyeSpacing, -headHeight * 0.5, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-eyeSpacing, -headHeight * 0.5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(eyeSpacing, -headHeight * 0.5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Antenna
  ctx.strokeStyle = '#FF6B35';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -headHeight);
  ctx.lineTo(0, -headHeight - 15);
  ctx.stroke();

  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = COLORS.windowCyan;
  ctx.fillStyle = COLORS.windowCyan;
  ctx.beginPath();
  ctx.arc(0, -headHeight - 15, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body
  const bodyWidth = baseSize;
  const bodyHeight = baseSize * 1.1;
  const bodyGrad = ctx.createLinearGradient(-bodyWidth / 2, 0, bodyWidth / 2, bodyHeight);
  bodyGrad.addColorStop(0, '#FF8C42');
  bodyGrad.addColorStop(1, '#E55A2B');
  ctx.fillStyle = bodyGrad;
  roundRect(ctx, -bodyWidth / 2, 0, bodyWidth, bodyHeight, 12);
  ctx.fill();
  ctx.strokeStyle = COLORS.windowDark;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Chest panel
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLORS.windowCyan;
  ctx.fillStyle = COLORS.windowCyan;
  roundRect(ctx, -15, bodyHeight * 0.3, 30, 20, 4);
  ctx.fill();
  ctx.restore();

  // Arms
  const armWidth = 18;
  const armLength = 50;

  // Left arm + tablet
  ctx.save();
  ctx.translate(-bodyWidth / 2 - 5, bodyHeight * 0.3);
  ctx.rotate(-0.3);
  ctx.fillStyle = '#FF6B35';
  roundRect(ctx, -armWidth / 2, 0, armWidth, armLength, 8);
  ctx.fill();
  ctx.strokeStyle = COLORS.windowDark;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.translate(0, armLength + 10);
  ctx.shadowBlur = 30;
  ctx.shadowColor = COLORS.windowCyan;

  ctx.fillStyle = COLORS.buildingDark;
  roundRect(ctx, -20, -15, 40, 30, 4);
  ctx.fill();

  ctx.fillStyle = COLORS.windowCyan;
  roundRect(ctx, -17, -12, 34, 24, 2);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-14, -8 + i * 5);
    ctx.lineTo(14, -8 + i * 5);
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();

  // Right arm swing
  ctx.save();
  ctx.translate(bodyWidth / 2 + 5, bodyHeight * 0.3);
  const swingAngle = Math.sin(walkCycle) * 0.2;
  ctx.rotate(swingAngle);
  ctx.fillStyle = '#FF6B35';
  roundRect(ctx, -armWidth / 2, 0, armWidth, armLength, 8);
  ctx.fill();
  ctx.strokeStyle = COLORS.windowDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Legs
  const legWidth = 22;
  const legHeight = 45;
  const legSpacing = bodyWidth * 0.25;
  const leftLegY = Math.sin(walkCycle) * 5;
  const rightLegY = -Math.sin(walkCycle) * 5;

  ctx.fillStyle = '#FF6B35';
  roundRect(ctx, -legSpacing - legWidth / 2, bodyHeight + leftLegY, legWidth, legHeight, 8);
  ctx.fill();
  ctx.strokeStyle = COLORS.windowDark;
  ctx.lineWidth = 2;
  ctx.stroke();

  roundRect(ctx, legSpacing - legWidth / 2, bodyHeight + rightLegY, legWidth, legHeight, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#E55A2B';
  roundRect(ctx, -legSpacing - legWidth / 2, bodyHeight + legHeight + leftLegY, legWidth, 12, 6);
  ctx.fill();
  roundRect(ctx, legSpacing - legWidth / 2, bodyHeight + legHeight + rightLegY, legWidth, 12, 6);
  ctx.fill();

  ctx.restore();
}

function makeParticles(w, h) {
  const rand = mulberry32(1337);
  const particles = [];
  for (let i = 0; i < 50; i += 1) {
    particles.push({
      x: rand() * w,
      y: rand() * h * 0.8,
      size: rand() * 3 + 1,
      speedX: (rand() - 0.5) * 0.5,
      speedY: -rand() * 0.5 - 0.2,
      color: rand() > 0.5 ? COLORS.windowCyan : COLORS.windowYellow,
      opacity: rand() * 0.8 + 0.2,
    });
  }
  return particles;
}

export default function CyberpunkCanvasBackdrop({ enableParticles = true }) {
  const meshRef = useRef(null);
  const texRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const robotStateRef = useRef({ xN: 0.5, walking: false, walkCycle: 0 });
  const keysRef = useRef({});

  const particlesRef = useRef([]);

  const { size, viewport, gl } = useThree();

  // Canvas + texture
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    canvasRef.current = c;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    texRef.current = t;
    return t;
  }, []);

  // Resize canvas on viewport changes
  useEffect(() => {
    const dpr = Math.min(2, gl.getPixelRatio ? gl.getPixelRatio() : window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(size.width * dpr));
    const h = Math.max(1, Math.floor(size.height * dpr));
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;
    particlesRef.current = makeParticles(w, h);
  }, [size.width, size.height, gl]);

  // Keyboard input (for robot only)
  useEffect(() => {
    const onDown = (e) => {
      keysRef.current[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    };
    const onUp = (e) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', onDown, { passive: false });
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useFrame((_state, delta) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const tex = texRef.current;
    if (!canvas || !ctx || !tex) return;

    const w = canvas.width;
    const h = canvas.height;
    const tMs = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Movement input -> robot walk only
    const k = keysRef.current;
    const forward = (k.KeyW || k.ArrowUp) ? 1 : 0;
    const back = (k.KeyS || k.ArrowDown) ? 1 : 0;
    const left = (k.KeyA || k.ArrowLeft) ? 1 : 0;
    const right = (k.KeyD || k.ArrowRight) ? 1 : 0;
    const move = (right - left) * 0.35 + (forward - back) * 0.65;

    const robot = robotStateRef.current;
    robot.walking = Math.abs(move) > 0.001;
    if (robot.walking) {
      robot.walkCycle += delta * 8;
      robot.xN = Math.max(0.42, Math.min(0.58, robot.xN + move * delta * 0.25));
    }

    // Clear
    ctx.clearRect(0, 0, w, h);

    // 1. Sky
    drawSky(ctx, w, h);

    // 2. Rays
    drawLightRays(ctx, w, h);

    // Building layout (side view / open center)
    const leftBuildings = [
      { x: 0, y: h * 0.2, width: w * 0.2, height: h * 0.8, color: COLORS.buildingDark },
      { x: w * 0.12, y: h * 0.18, width: w * 0.14, height: h * 0.82, color: COLORS.buildingLight },
      { x: w * 0.23, y: h * 0.28, width: w * 0.11, height: h * 0.72, color: COLORS.buildingDark },
    ];

    const rightBuildings = [
      { x: w * 0.8, y: h * 0.2, width: w * 0.2, height: h * 0.8, color: COLORS.buildingDark },
      { x: w * 0.74, y: h * 0.18, width: w * 0.14, height: h * 0.82, color: COLORS.buildingLight },
      { x: w * 0.66, y: h * 0.28, width: w * 0.12, height: h * 0.72, color: COLORS.buildingDark },
    ];

    const farBuildings = [
      { x: w * 0.08, y: h * 0.32, width: 60, height: 200, color: COLORS.buildingDark },
      { x: w * 0.18, y: h * 0.3, width: 70, height: 220, color: COLORS.buildingDark },
      { x: w * 0.32, y: h * 0.34, width: 55, height: 180, color: COLORS.buildingDark },
      { x: w * 0.45, y: h * 0.33, width: 62, height: 195, color: COLORS.buildingDark },
      { x: w * 0.58, y: h * 0.35, width: 52, height: 175, color: COLORS.buildingDark },
      { x: w * 0.7, y: h * 0.31, width: 68, height: 210, color: COLORS.buildingDark },
    ];

    const midBuildings = [
      { x: w * 0.15, y: h * 0.26, width: 80, height: 280, color: COLORS.buildingLight },
      { x: w * 0.38, y: h * 0.24, width: 92, height: 300, color: COLORS.buildingLight },
      { x: w * 0.55, y: h * 0.27, width: 84, height: 290, color: COLORS.buildingLight },
    ];

    // Padlocks (layers)
    const padlocks = [
      { x: w * 0.12, y: h * 0.15, size: 50, layer: 'front' },
      { x: w * 0.42, y: h * 0.12, size: 40, layer: 'mid' },
      { x: w * 0.78, y: h * 0.18, size: 45, layer: 'front' },
      { x: w * 0.08, y: h * 0.45, size: 55, layer: 'front' },
      { x: w * 0.85, y: h * 0.42, size: 50, layer: 'front' },
      { x: w * 0.5, y: h * 0.25, size: 30, layer: 'back' },
    ];

    const holoScreens = [
      {
        x: w * 0.06,
        y: h * 0.35,
        width: 120,
        height: 90,
        color: COLORS.windowCyan,
        content: 'padlock',
      },
      {
        x: w * 0.83,
        y: h * 0.3,
        width: 100,
        height: 75,
        color: COLORS.windowOrange,
        content: 'data',
      },
    ];

    // 3. Far buildings
    farBuildings.forEach((b, i) => drawDetailedBuilding(ctx, b, 2000 + i));

    // 4. Background padlocks
    padlocks.filter((p) => p.layer === 'back').forEach((p) => drawPadlock(ctx, p.x, p.y, p.size, tMs));

    // 5. Mid buildings
    midBuildings.forEach((b, i) => drawDetailedBuilding(ctx, b, 3000 + i));

    // 6. Holo screens
    holoScreens.forEach((s) => drawHoloScreen(ctx, s, tMs));

    // 7. Foreground left/right buildings
    leftBuildings.forEach((b, i) => drawDetailedBuilding(ctx, b, 4000 + i));
    rightBuildings.forEach((b, i) => drawDetailedBuilding(ctx, b, 5000 + i));

    // 8. Ground
    drawGround(ctx, w, h);

    // 9. Mid padlocks
    padlocks.filter((p) => p.layer === 'mid').forEach((p) => drawPadlock(ctx, p.x, p.y, p.size, tMs));

    // 10. Robot (center)
    drawRobot(ctx, w * robot.xN, h * 0.7, robot.walkCycle);

    // 11. Front padlocks
    padlocks.filter((p) => p.layer === 'front').forEach((p) => drawPadlock(ctx, p.x, p.y, p.size, tMs));

    // 12. Particles
    if (enableParticles) {
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.y < 0) p.y = h * 0.8;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 13. Atmospheric overlay
    ctx.fillStyle = 'rgba(107, 91, 149, 0.08)';
    ctx.fillRect(0, 0, w, h);

    tex.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -1]} frustumCulled={false}>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <meshBasicMaterial map={texture} transparent={false} toneMapped={false} />
    </mesh>
  );
}
