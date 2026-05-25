// Original wireframe; do not adjust toward any third-party station silhouette.
import type { Vector3 } from "./types";

// Central torus/ring frame — 12 points on a ring at r=8
const RING_R = 8;
const RING_COUNT = 12;
const RING_START = 0;
const ringVerts: Vector3[] = [];
for (let i = 0; i < RING_COUNT; i++) {
  const angle = (Math.PI * 2 * i) / RING_COUNT;
  ringVerts.push({ x: Math.cos(angle) * RING_R, y: 0, z: Math.sin(angle) * RING_R });
}

// Docking spire — 5 points along +Y axis
const SPIRE_START = RING_COUNT;
const spireVerts: Vector3[] = [
  { x: 0, y: 0, z: 0 },     // spire base at ring centre
  { x: 0, y: 4, z: 0 },     // lower spire
  { x: 0, y: 8, z: 0 },     // mid spire
  { x: 0, y: 11, z: 0 },    // upper spire
  { x: 0, y: 13, z: 0 },    // spire tip
];

// Radial truss 1 — 3 nodes along +X from ring edge
const TRUSS1_START = SPIRE_START + spireVerts.length;
const truss1Verts: Vector3[] = [
  { x: 10, y: -1, z: 0 },   // truss inner node
  { x: 14, y: -1.5, z: 0 }, // truss mid
  { x: 17, y: -2, z: 0 },   // truss tip
];

// Radial truss 2 — 3 nodes along -X from ring edge (opposite side)
const TRUSS2_START = TRUSS1_START + truss1Verts.length;
const truss2Verts: Vector3[] = [
  { x: -10, y: -1, z: 0 },
  { x: -14, y: -1.5, z: 0 },
  { x: -17, y: -2, z: 0 },
];

// Beacon array — 4 nodes on the ring underside
const BEACON_START = TRUSS2_START + truss2Verts.length;
const beaconVerts: Vector3[] = [
  { x: 4, y: -4, z: 0 },
  { x: -4, y: -4, z: 0 },
  { x: 0, y: -4, z: 4 },
  { x: 0, y: -4, z: -4 },
];

export const STATION_VERTICES: Vector3[] = [
  ...ringVerts,
  ...spireVerts,
  ...truss1Verts,
  ...truss2Verts,
  ...beaconVerts,
];

// Ring edges (closed loop)
const ringEdges: Array<[number, number]> = [];
for (let i = 0; i < RING_COUNT; i++) {
  ringEdges.push([RING_START + i, RING_START + (i + 1) % RING_COUNT]);
}

// Spire edges (chain up the axis)
const spireEdges: Array<[number, number]> = [];
for (let i = 0; i < spireVerts.length - 1; i++) {
  spireEdges.push([SPIRE_START + i, SPIRE_START + i + 1]);
}
// Connect spire base to four ring points for bracing
spireEdges.push([SPIRE_START + 1, RING_START + 0]);
spireEdges.push([SPIRE_START + 1, RING_START + 3]);
spireEdges.push([SPIRE_START + 1, RING_START + 6]);
spireEdges.push([SPIRE_START + 1, RING_START + 9]);

// Truss 1 edges (connect from a ring node outward)
const truss1Edges: Array<[number, number]> = [
  [RING_START + 0, TRUSS1_START + 0],      // ring to truss inner
  [TRUSS1_START + 0, TRUSS1_START + 1],    // inner to mid
  [TRUSS1_START + 1, TRUSS1_START + 2],    // mid to tip
  [RING_START + 3, TRUSS1_START + 0],      // brace from another ring point
];

// Truss 2 edges (mirror of truss 1)
const truss2Edges: Array<[number, number]> = [
  [RING_START + 6, TRUSS2_START + 0],
  [TRUSS2_START + 0, TRUSS2_START + 1],
  [TRUSS2_START + 1, TRUSS2_START + 2],
  [RING_START + 9, TRUSS2_START + 0],
];

// Beacon edges (connect beacons to ring underside and to each other)
const beaconEdges: Array<[number, number]> = [
  [RING_START + 1, BEACON_START + 0],
  [RING_START + 7, BEACON_START + 1],
  [RING_START + 4, BEACON_START + 2],
  [RING_START + 10, BEACON_START + 3],
  [BEACON_START + 0, BEACON_START + 1],    // beacon cross
  [BEACON_START + 2, BEACON_START + 3],
];

export const STATION_EDGES: Array<[number, number]> = [
  ...ringEdges,
  ...spireEdges,
  ...truss1Edges,
  ...truss2Edges,
  ...beaconEdges,
];
