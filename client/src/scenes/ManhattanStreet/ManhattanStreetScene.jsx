import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ManhattanStreetScene.module.css';
import Robot from './components/Robot.jsx';
import Laptop from './components/Laptop.jsx';
import LaptopMap from './components/LaptopMap.jsx';

function useAnimationFrame(callback) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      callbackRef.current?.(dt, now);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}

export default function ManhattanStreetScene() {
  const [robotT, setRobotT] = useState(0);
  const [isWalking, setIsWalking] = useState(true);

  // Smooth forward motion along the street (background is static; robot stays centered)
  useAnimationFrame((dt) => {
    if (!isWalking) return;
    setRobotT((t) => {
      const next = t + dt * 0.06; // speed
      return next > 1 ? next - 1 : next;
    });
  });

  // Optional: allow toggling walk with Space
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsWalking((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const mapPosition = useMemo(() => {
    // Map coordinate in [0..1] along the route
    return robotT;
  }, [robotT]);

  return (
    <div className={styles.stage}>
      <div className={styles.robotLayer}>
        <Robot walking={isWalking} />

        <div className={styles.laptopLayer}>
          <Laptop>
            <div className={styles.mapLayer}>
              <LaptopMap t={mapPosition} />
            </div>
          </Laptop>
        </div>
      </div>

      <div className={styles.hudHint}>
        <div className={styles.hudCard}>
          <div className={styles.hudTitle}>Robot Navigation</div>
          <div className={styles.hudText}>Map dot updates as the robot moves.</div>
          <div className={styles.hudText}>Press Space to pause/resume walking.</div>
        </div>
      </div>
    </div>
  );
}
