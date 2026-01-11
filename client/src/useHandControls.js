import { useEffect, useRef } from "react";

// Hook: useHandControls
// - Uses MediaPipe Hands (via dynamic import) to read webcam and produce
//   an input-ref compatible with `useKeyboard()` (same keys shape).
// - Returns a ref object whose `.current` has the same boolean keys as
//   `useKeyboard` plus `.active` indicating a detected hand.
// Notes: install the packages before running:
// npm install @mediapipe/hands @mediapipe/camera_utils

export function useHandControls() {
  const ctrl = useRef({
    active: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
  });

  useEffect(() => {
    let hands = null;
    let camera = null;
    let videoEl = null;
    let mounted = true;

    function onResults(results) {
      if (!mounted) return;
      const cur = ctrl.current;
      if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        cur.active = false;
        cur.ArrowUp = cur.ArrowDown = cur.ArrowLeft = cur.ArrowRight = false;
        cur.KeyW = cur.KeyS = cur.KeyA = cur.KeyD = false;
        return;
      }

      cur.active = true;
      const lm = results.multiHandLandmarks[0];
      // compute normalized centroid
      let cx = 0,
        cy = 0;
      for (const p of lm) {
        cx += p.x;
        cy += p.y;
      }
      cx /= lm.length;
      cy /= lm.length;

      // convert to -0.5..0.5 space (centered)
      const dx = cx - 0.5; // left negative, right positive
      const dy = 0.5 - cy; // up positive, down negative

      // thresholds tuned for comfortable control
      const deadX = 0.08;
      const deadY = 0.12;

      cur.ArrowLeft = dx < -deadX;
      cur.ArrowRight = dx > deadX;
      cur.ArrowUp = dy > deadY;
      cur.ArrowDown = dy < -deadY;

      cur.KeyW = cur.ArrowUp;
      cur.KeyS = cur.ArrowDown;
      cur.KeyA = cur.ArrowLeft;
      cur.KeyD = cur.ArrowRight;

      // pinch detection (index tip=8, thumb tip=4): when pinched, treat as "stop" (all false)
      try {
        const d = Math.hypot(lm[8].x - lm[4].x, lm[8].y - lm[4].y);
        if (d < 0.05) {
          cur.ArrowUp = cur.ArrowDown = cur.ArrowLeft = cur.ArrowRight = false;
          cur.KeyW = cur.KeyS = cur.KeyA = cur.KeyD = false;
        }
      } catch (e) {
        // ignore
      }
    }

    (async () => {
      try {
        const [{ Hands }, cameraUtils] = await Promise.all([
          import("@mediapipe/hands"),
          import("@mediapipe/camera_utils"),
        ]);
        const { Camera } = cameraUtils;

        if (!mounted) return;

        const mpHandsVersion = "0.4.1675469240"; // pin version so CDN files resolve
        hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHandsVersion}/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
          modelComplexity: 1,
          selfieMode: true,
          modelAssetPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHandsVersion}/hand_landmark_full.tflite`,
        });

        hands.onResults(onResults);

        // hidden video element for the camera capture
        videoEl = document.createElement("video");
        videoEl.style.position = "fixed";
        videoEl.style.right = "10px";
        videoEl.style.bottom = "10px";
        videoEl.style.width = "180px";
        videoEl.style.maxWidth = "30vw";
        videoEl.style.border = "1px solid rgba(255,255,255,0.45)";
        videoEl.style.borderRadius = "10px";
        videoEl.style.boxShadow = "0 6px 20px rgba(0,0,0,0.35)";
        videoEl.style.opacity = "0.92";
        videoEl.style.zIndex = "9999";
        videoEl.style.pointerEvents = "none"; // let clicks pass through
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = true;
        document.body.appendChild(videoEl);

        camera = new Camera(videoEl, {
          onFrame: async () => {
            await hands.send({ image: videoEl });
          },
          width: 640,
          height: 480,
        });

        camera.start();
      } catch (err) {
        console.warn("useHandControls: failed to initialize hands", err);
      }
    })();

    return () => {
      mounted = false;
      try {
        if (camera && camera.stop) camera.stop();
      } catch (e) {}
      try {
        if (hands && hands.close) hands.close();
      } catch (e) {}
      try {
        if (videoEl && videoEl.remove) videoEl.remove();
      } catch (e) {}
    };
  }, []);

  return ctrl;
}
