import { SCENES } from '../context/GameContext.jsx';

export const MAP_Y = -1.05;

function prand(n) {
  // Deterministic pseudo-random in [0,1). Avoids Math.random().
  const x = Math.sin(n * 999.123 + n * n * 0.17) * 43758.5453123;
  return x - Math.floor(x);
}

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

// Periodic 1D value-noise in [-1,1] that wraps cleanly at t=1.
function periodicNoise(t01, seed, knots = 16) {
  const t = ((t01 % 1) + 1) % 1;
  const u = t * knots;
  const i0 = Math.floor(u);
  const i1 = (i0 + 1) % knots;
  const f = u - i0;

  const v0 = prand(seed + i0 * 1013) * 2 - 1;
  const v1 = prand(seed + i1 * 1013) * 2 - 1;
  const a = smoothstep(f);
  return v0 + (v1 - v0) * a;
}

// A looped route (closed curve) so the robot can keep moving without a "back-and-forth" feel.
// More "serious" trail: less symmetric, smoother, slightly more complex shape.
// NOTE: Destination nodes below intentionally reuse points from this list so they lie on the path.
const LOOP_POINTS = 96;
const LOOP_RX = 24;
const LOOP_RZ = 34;

export const CANDY_PATH_POINTS = Object.freeze(
  Array.from({ length: LOOP_POINTS }, (_, i) => {
    const t = i / LOOP_POINTS;
    const a = t * Math.PI * 2;

    // Multi-scale periodic noise for radius + lateral meander.
    const nR1 = periodicNoise(t, 12001, 14);
    const nR2 = periodicNoise(t, 12007, 9);
    const nLat = periodicNoise(t, 12011, 11);

    const rx = LOOP_RX + nR1 * 6.0 + nR2 * 3.0;
    const rz = LOOP_RZ + nR1 * 5.0 - nR2 * 3.5;

    // Start from an ellipse.
    let x = Math.sin(a) * rx;
    let z = Math.cos(a) * rz;

    // Tangential meander (adds complexity without blowing up bounds).
    const meander = nLat * 3.2;
    x += Math.cos(a) * meander;
    z -= Math.sin(a) * meander;

    // Small extra bend to avoid obvious repeating patterns.
    const bend = periodicNoise(t, 12019, 7) * 1.6;
    x += Math.sin(a * 2) * bend;
    z += Math.cos(a * 2) * bend;

    return [x, MAP_Y, z];
  })
);

export const MAP_NODES = Object.freeze({
  // Starting point / home.
  hub: CANDY_PATH_POINTS[0],
  // Candy houses (levels) on the road.
  [SCENES.password]: CANDY_PATH_POINTS[16],
  [SCENES.privacy]: CANDY_PATH_POINTS[32],
  [SCENES.shop]: CANDY_PATH_POINTS[48],
  [SCENES.strength]: CANDY_PATH_POINTS[64],
  [SCENES.clothing]: CANDY_PATH_POINTS[80],
});

// Legacy exports kept for compatibility with earlier cyber-map code.
// (No longer used by the candy path implementation.)
export const MAP_ROADS = Object.freeze({});
export const NODE_TO_ROAD = Object.freeze({});
