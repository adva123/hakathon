import { SCENES } from '../context/gameState.js';

// Candy-Cyber Journey map layout.
// Coordinates are [x, y, z] in Three.js world space.
// The robot is constrained to the spline built from CANDY_PATH_POINTS.
export const MAP_Y = -1.05;

// A looped route (closed curve) so the robot can keep moving without a "back-and-forth" feel.
// NOTE: Destination nodes below intentionally reuse points from this list so they lie on the path.
const LOOP_POINTS = 72;
const LOOP_RX = 19;
const LOOP_RZ = 29;

export const CANDY_PATH_POINTS = Object.freeze(
  Array.from({ length: LOOP_POINTS }, (_, i) => {
    const a = (i / LOOP_POINTS) * Math.PI * 2;
    // More twisty shape variation so it feels like a winding forest trail.
    const wobble =
      2.2 * Math.sin(a * 3) +
      1.6 * Math.sin(a * 5 + 0.7) +
      1.1 * Math.sin(a * 7 + 1.3) +
      0.7 * Math.sin(a * 11);
    const rx = LOOP_RX + 2.0 * Math.sin(a * 2 + 0.4) + 1.2 * Math.sin(a * 6 + 1.1);
    const rz = LOOP_RZ + 1.6 * Math.cos(a * 2 - 0.2) + 1.0 * Math.cos(a * 6 + 0.9);
    const x = Math.sin(a) * (rx + wobble) + 1.2 * Math.sin(a * 4 + 0.6);
    const z = Math.cos(a) * (rz + wobble) + 1.0 * Math.cos(a * 4 - 0.2);
    return [x, MAP_Y, z];
  })
);

export const MAP_NODES = Object.freeze({
  // Starting point / home.
  hub: CANDY_PATH_POINTS[0],
  // Candy houses (levels) on the road.
  [SCENES.password]: CANDY_PATH_POINTS[12],
  [SCENES.privacy]: CANDY_PATH_POINTS[24],
  [SCENES.shop]: CANDY_PATH_POINTS[36],
});

// Legacy exports kept for compatibility with earlier cyber-map code.
// (No longer used by the candy path implementation.)
export const MAP_ROADS = Object.freeze({});
export const NODE_TO_ROAD = Object.freeze({});
