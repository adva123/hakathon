import { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import styles from './RouteLaptopOverlay.module.css';

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function computeBoundsXZ(points) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    const x = Number(p?.[0] ?? 0);
    const z = Number(p?.[1] ?? 0);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  if (!Number.isFinite(minX)) return { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };
  const padX = Math.max(1, (maxX - minX) * 0.12);
  const padZ = Math.max(1, (maxZ - minZ) * 0.12);
  return { minX: minX - padX, maxX: maxX + padX, minZ: minZ - padZ, maxZ: maxZ + padZ };
}

function makeProjector({ w, h, pad, bounds }) {
  const innerW = Math.max(1, w - pad * 2);
  const innerH = Math.max(1, h - pad * 2);
  const spanX = Math.max(1e-6, bounds.maxX - bounds.minX);
  const spanZ = Math.max(1e-6, bounds.maxZ - bounds.minZ);

  // Keep aspect ratio: fit XZ bounds into the inner rect.
  const scale = Math.min(innerW / spanX, innerH / spanZ);
  const ox = pad + (innerW - spanX * scale) * 0.5;
  const oy = pad + (innerH - spanZ * scale) * 0.5;

  return {
    toPx: (x, z) => {
      const nx = (x - bounds.minX) * scale;
      const nz = (z - bounds.minZ) * scale;
      // Canvas Y goes downward; we map +Z downward to make it read like a typical minimap.
      return { x: ox + nx, y: oy + nz };
    },
  };
}

function drawRouteMap(ctx, { w, h, routeXZ, t, title, markers }) {
  ctx.clearRect(0, 0, w, h);

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, 'rgba(7,12,20,0.98)');
  bg.addColorStop(1, 'rgba(4,7,13,0.98)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle grid
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = 'rgba(0,242,255,0.55)';
  ctx.lineWidth = 1;
  const grid = 18;
  for (let x = 0; x <= w; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();

  const pad = Math.max(16, Math.floor(Math.min(w, h) * 0.08));
  const bounds = computeBoundsXZ(routeXZ);
  const { toPx } = makeProjector({ w, h, pad, bounds });

  // Route path
  if (routeXZ.length >= 2) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Outer glow
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = 'rgba(0,242,255,0.30)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    for (let i = 0; i < routeXZ.length; i += 1) {
      const p = routeXZ[i];
      const { x, y } = toPx(p[0], p[1]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Core line
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,242,255,0.92)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    for (let i = 0; i < routeXZ.length; i += 1) {
      const p = routeXZ[i];
      const { x, y } = toPx(p[0], p[1]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  // Marker (interpolate by t along polyline segments)
  const tt = clamp01(t);
  if (routeXZ.length >= 2) {
    const segCount = routeXZ.length - 1;
    const f = tt * segCount;
    const i0 = Math.max(0, Math.min(segCount - 1, Math.floor(f)));
    const u = f - i0;
    const a = routeXZ[i0];
    const b = routeXZ[i0 + 1];
    const x = a[0] + (b[0] - a[0]) * u;
    const z = a[1] + (b[1] - a[1]) * u;
    const p = toPx(x, z);

    ctx.save();
    // Outer pulse
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.006);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = 'rgba(112,0,255,0.75)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();

    // Inner dot
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Neon ring
    ctx.strokeStyle = 'rgba(0,242,255,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Destination markers
  if (Array.isArray(markers) && markers.length) {
    ctx.save();
    ctx.font = '600 10px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textBaseline = 'middle';

    for (const m of markers) {
      const mt = clamp01(Number(m?.t ?? 0));
      const segCount = routeXZ.length - 1;
      const f = mt * segCount;
      const i0 = Math.max(0, Math.min(segCount - 1, Math.floor(f)));
      const u = f - i0;
      const a = routeXZ[i0];
      const b = routeXZ[i0 + 1];
      const x = a[0] + (b[0] - a[0]) * u;
      const z = a[1] + (b[1] - a[1]) * u;
      const p = toPx(x, z);

      ctx.globalAlpha = 0.95;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = 'rgba(0,242,255,0.95)';
      ctx.lineWidth = 1.6;

      ctx.beginPath();
      ctx.rect(p.x - 4.8, p.y - 4.8, 9.6, 9.6);
      ctx.fill();
      ctx.stroke();

      const label = String(m?.label || '').slice(0, 6);
      if (label) {
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = 'rgba(0,242,255,0.9)';
        ctx.fillText(label, p.x + 7, p.y);
      }
    }
    ctx.restore();
  }

  // Title
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '600 14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText(String(title || 'Manhattan Route'), 14, 22);

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = 'rgba(0,242,255,0.85)';
  ctx.font = '500 12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText('live position • moving on-route', 14, 40);
  ctx.restore();
}

export default function RouteLaptopOverlay({ routeXZ, progressT, onCanvasReady, visible = true, markers = [] }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const markersRef = useRef(markers);

  const title = useMemo(() => 'Manhattan Route', []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && typeof onCanvasReady === 'function') onCanvasReady(canvas);
  }, [onCanvasReady]);

  useEffect(() => {
    markersRef.current = Array.isArray(markers) ? markers : [];
  }, [markers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      drawRouteMap(ctx, { w, h, routeXZ, t: progressT, title, markers: markersRef.current });
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [routeXZ, progressT, title]);

  if (!visible) {
    return (
      <div aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <canvas ref={canvasRef} width={320} height={220} />
      </div>
    );
  }

  return (
    <div className={styles.root} aria-label="Laptop Route Map">
      <div className={styles.frame}>
        <div className={styles.glow} />
        <canvas ref={canvasRef} className={styles.canvas} width={320} height={220} />
        <div className={styles.base} />
      </div>
    </div>
  );
}

RouteLaptopOverlay.propTypes = {
  routeXZ: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  progressT: PropTypes.number.isRequired,
  onCanvasReady: PropTypes.func,
  visible: PropTypes.bool,
  markers: PropTypes.arrayOf(
    PropTypes.shape({
      t: PropTypes.number.isRequired,
      label: PropTypes.string,
    })
  ),
};
