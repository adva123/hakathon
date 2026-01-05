import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import styles from './GestureManager.module.css';

const GESTURES = Object.freeze({
  none: 'none',
  openPalm: 'openPalm',
  fist: 'fist',
  thumbUp: 'thumbUp',
  thumbDown: 'thumbDown',
  peace: 'peace',
  iLoveYou: 'iLoveYou',
});

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function fingerExtended(lm, tip, pip) {
  // y is inverted (0 top). Extended if tip is significantly above pip.
  return lm[tip].y + 0.015 < lm[pip].y;
}

function thumbExtendedUp(lm) {
  // thumb tip above IP and above MCP-ish region
  return lm[4].y + 0.02 < lm[3].y && lm[4].y + 0.02 < lm[2].y;
}

function thumbExtendedDown(lm) {
  return lm[4].y > lm[3].y + 0.02 && lm[4].y > lm[2].y + 0.02;
}

function isILoveYou(lm) {
  // ILY: thumb + index + pinky extended, middle + ring folded.
  const indexExt = fingerExtended(lm, 8, 6);
  const middleExt = fingerExtended(lm, 12, 10);
  const ringExt = fingerExtended(lm, 16, 14);
  const pinkyExt = fingerExtended(lm, 20, 18);
  const thumbUp = thumbExtendedUp(lm);
  const thumbDown = thumbExtendedDown(lm);
  const thumbExt = thumbUp || thumbDown;

  return thumbExt && indexExt && pinkyExt && !middleExt && !ringExt;
}

function isFist(lm) {
  // All fingertips below their PIP (folded)
  const index = lm[8].y > lm[6].y - 0.005;
  const middle = lm[12].y > lm[10].y - 0.005;
  const ring = lm[16].y > lm[14].y - 0.005;
  const pinky = lm[20].y > lm[18].y - 0.005;
  return index && middle && ring && pinky;
}

function classifyGesture(lm) {
  if (!lm || lm.length < 21) return GESTURES.none;

  const indexExt = fingerExtended(lm, 8, 6);
  const middleExt = fingerExtended(lm, 12, 10);
  const ringExt = fingerExtended(lm, 16, 14);
  const pinkyExt = fingerExtended(lm, 20, 18);

  const fist = isFist(lm);
  if (fist) return GESTURES.fist;

  // I love you sign should win before other partial gestures.
  if (isILoveYou(lm)) return GESTURES.iLoveYou;

  const openPalm = indexExt && middleExt && ringExt && pinkyExt;
  if (openPalm) return GESTURES.openPalm;

  // Peace sign: index+middle extended, ring+pinky folded.
  const peace = indexExt && middleExt && !ringExt && !pinkyExt;
  if (peace) return GESTURES.peace;

  // Thumb up/down: thumb extended, other fingers mostly folded.
  const othersFolded = !indexExt && !middleExt && !ringExt && !pinkyExt;
  if (othersFolded && thumbExtendedUp(lm)) return GESTURES.thumbUp;
  if (othersFolded && thumbExtendedDown(lm)) return GESTURES.thumbDown;

  return GESTURES.none;
}

function velocityForGesture(gesture) {
  // Coordinate system in scene: W moves z-, D moves x+
  switch (gesture) {
    case GESTURES.openPalm:
      return { x: 0, z: -1 };
    case GESTURES.iLoveYou:
      return { x: 0, z: 1 };
    case GESTURES.thumbUp:
      return { x: 1, z: 0 };
    case GESTURES.thumbDown:
      return { x: -1, z: 0 };
    case GESTURES.fist:
      return { x: 0, z: 0 };
    default:
      return { x: 0, z: 0 };
  }
}

export default function GestureManager({
  enabled,
  showCalibration,
  onCalibrated,
  onGesture,
  variant = 'overlay',
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const streamRef = useRef(null);
  const handsRef = useRef(null);
  const runningRef = useRef(false);

  const [status, setStatus] = useState('idle'); // idle | starting | running | denied | error
  const [gestureLabel, setGestureLabel] = useState(GESTURES.none);
  const [calibProgress, setCalibProgress] = useState(0);

  const config = useMemo(
    () => ({
      overlayStroke: 'rgba(0, 242, 255, 0.85)',
      overlayFill: 'rgba(0, 242, 255, 0.35)',
    }),
    []
  );

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    const start = async () => {
      try {
        setStatus('starting');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) return;

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        hands.onResults((results) => {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          const v = videoRef.current;
          if (!canvas || !ctx || !v) return;

          const w = v.videoWidth || 640;
          const h = v.videoHeight || 480;
          if (canvas.width !== w) canvas.width = w;
          if (canvas.height !== h) canvas.height = h;

          ctx.clearRect(0, 0, w, h);

          const landmarks = results.multiHandLandmarks?.[0];
          if (landmarks) {
            // Glowing effect
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowColor = 'rgba(0, 242, 255, 0.85)';
            ctx.shadowBlur = 14;
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: config.overlayStroke, lineWidth: 3 });
            drawLandmarks(ctx, landmarks, { color: config.overlayFill, radius: 3 });
            ctx.restore();

            const g = classifyGesture(landmarks);
            setGestureLabel(g);

            // Calibration: require stable tracking for a moment.
            if (showCalibration) {
              setCalibProgress((p) => clamp01(p + 0.03));
            }

            const vel = velocityForGesture(g);
            if (typeof onGesture === 'function') {
              onGesture({
                gesture: g,
                velocity: vel,
                hasHand: true,
              });
            }
          } else {
            setGestureLabel(GESTURES.none);
            if (showCalibration) setCalibProgress((p) => clamp01(p - 0.02));
            if (typeof onGesture === 'function') {
              onGesture({
                gesture: GESTURES.none,
                velocity: { x: 0, z: 0 },
                hasHand: false,
              });
            }
          }

          runningRef.current = false;
        });

        handsRef.current = hands;
        setStatus('running');

        const loop = async () => {
          const v = videoRef.current;
          const h = handsRef.current;
          if (!v || !h) return;
          if (cancelled) return;

          if (!runningRef.current) {
            runningRef.current = true;
            try {
              // Avoid blocking the render loop; mediapipe work runs async.
              await h.send({ image: v });
            } catch {
              runningRef.current = false;
            }
          }

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        if (cancelled) return;
        if (e?.name === 'NotAllowedError' || e?.name === 'NotFoundError') setStatus('denied');
        else setStatus('error');
      }
    };

    start();

    return () => {
      cancelled = true;
      try {
        cancelAnimationFrame(rafRef.current);
      } catch {
        // ignore
      }
      try {
        handsRef.current?.close();
      } catch {
        // ignore
      }
      handsRef.current = null;
      const s = streamRef.current;
      streamRef.current = null;
      if (s) {
        for (const t of s.getTracks()) {
          try {
            t.stop();
          } catch {
            // ignore
          }
        }
      }
    };
  }, [enabled, config.overlayFill, config.overlayStroke, onGesture, showCalibration]);

  useEffect(() => {
    if (!showCalibration) return;
    if (calibProgress >= 1 && typeof onCalibrated === 'function') {
      onCalibrated();
    }
  }, [calibProgress, onCalibrated, showCalibration]);

  if (!enabled) return null;

  const labelText =
    status === 'denied'
      ? 'Camera blocked'
      : status === 'error'
        ? 'Hand tracking error'
        : `Hand Tracking: ${gestureLabel === 'none' ? '…' : gestureLabel}`;

  const isSidebar = variant === 'sidebar';
  const showLegend = variant === 'overlay';

  return (
    <>
      {!isSidebar && showCalibration ? (
        <div className={styles.calibration}>
          <div className={styles.panel}>
            <div className={styles.title}>Calibration</div>
            <div className={styles.sub}>
              Show one hand to sync with your robot. Keep it in frame until the bar fills.
            </div>
            <div className={styles.row}>
              <div className={styles.miniPreview}>
                <video ref={videoRef} className={styles.video} playsInline muted />
                <canvas ref={canvasRef} className={styles.canvas} />
              </div>
              <div style={{ flex: 1 }}>
                <div className={styles.badge} style={{ position: 'relative', top: 0, left: 0 }}>
                  {labelText}
                </div>
                <div className={styles.progress}>
                  <div className={styles.bar} style={{ width: `${Math.round(calibProgress * 100)}%` }} />
                </div>
                <div className={styles.hint}>
                  Gestures: Fist = Stop + block room entry, Thumb Up = Right, Thumb Down = Left, I Love You = Back, Palm = Forward.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={isSidebar ? styles.sidebarRoot : styles.root}>
          <div className={isSidebar ? styles.sidebarPreview : styles.preview}>
            <video ref={videoRef} className={styles.video} playsInline muted />
            <canvas ref={canvasRef} className={styles.canvas} />
            <div className={styles.badge}>{labelText}</div>
            {showLegend && (
              <div className={styles.legend}>
                <div className={styles.legendTitle}>Gestures</div>
                <div className={styles.legendRow}>
                  <div className={styles.legendKey}>Fist</div>
                  <div className={styles.legendVal}>Stop + block rooms</div>
                </div>
                <div className={styles.legendRow}>
                  <div className={styles.legendKey}>Thumb Up</div>
                  <div className={styles.legendVal}>Right</div>
                </div>
                <div className={styles.legendRow}>
                  <div className={styles.legendKey}>Thumb Down</div>
                  <div className={styles.legendVal}>Left</div>
                </div>
                <div className={styles.legendRow}>
                  <div className={styles.legendKey}>I Love You</div>
                  <div className={styles.legendVal}>Back</div>
                </div>
                <div className={styles.legendRow}>
                  <div className={styles.legendKey}>Open Palm</div>
                  <div className={styles.legendVal}>Forward</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

GestureManager.propTypes = {
  enabled: PropTypes.bool,
  showCalibration: PropTypes.bool,
  onCalibrated: PropTypes.func,
  onGesture: PropTypes.func,
  variant: PropTypes.oneOf(['overlay', 'sidebar', 'minimap']),
};
