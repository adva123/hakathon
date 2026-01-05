import React, { useEffect, useRef } from 'react';
import styles from './LaptopMap.module.css';

export default function LaptopMap({ t }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, w, h);

    // Simple "street" map: vertical route with side streets
    ctx.save();
    ctx.translate(w * 0.5, h * 0.12);

    // Route line
    ctx.strokeStyle = 'rgba(0,229,255,0.85)';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00E5FF';

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, h * 0.76);
    ctx.stroke();

    // Cross streets
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i += 1) {
      const yy = (h * 0.76) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(-w * 0.22, yy);
      ctx.lineTo(w * 0.22, yy);
      ctx.stroke();
    }

    // Progress dot
    const clamped = Math.max(0, Math.min(1, t));
    const py = (h * 0.76) * (1 - clamped);

    // Dot glow
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#FFB84D';
    ctx.fillStyle = '#FFB84D';
    ctx.beginPath();
    ctx.arc(0, py, 5, 0, Math.PI * 2);
    ctx.fill();

    // Inner dot
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00E5FF';
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(0, py, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Mini label
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '10px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('YOU', 8, py + 3);

    ctx.restore();
  }, [t]);

  return (
    <div className={styles.wrap}>
      <canvas className={styles.canvas} ref={canvasRef} width={108} height={72} />
    </div>
  );
}
