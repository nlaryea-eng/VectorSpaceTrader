import type { Vector3 } from "./types";

export type BodyKind = "sun" | "planet";

export interface SystemBody {
  kind: BodyKind;
  position: Vector3;
  vertices: Vector3[];
  edges: Array<[number, number]>;
  rotationRate: number;
}

// Seeded pseudo-random — no external dependency.
function seededRng(seed: number): () => number {
  let s = seed | 0;
  return (): number => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return ((s >>> 0) / 0xffff_ffff);
  };
}

function buildOctahedronLike(r: number, jitter: number, rng: () => number): { vertices: Vector3[]; edges: Array<[number, number]> } {
  // 6-vertex octahedron base, jittered for organic look
  const verts: Vector3[] = [
    { x: 0, y: r, z: 0 },
    { x: r, y: 0, z: 0 },
    { x: 0, y: 0, z: r },
    { x: -r, y: 0, z: 0 },
    { x: 0, y: 0, z: -r },
    { x: 0, y: -r, z: 0 },
  ].map(v => ({
    x: v.x + (rng() - 0.5) * jitter,
    y: v.y + (rng() - 0.5) * jitter,
    z: v.z + (rng() - 0.5) * jitter,
  }));

  const edges: Array<[number, number]> = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [5, 1], [5, 2], [5, 3], [5, 4],
    [1, 2], [2, 3], [3, 4], [4, 1],
  ];
  return { vertices: verts, edges };
}

function buildSunBody(r: number, rng: () => number): { vertices: Vector3[]; edges: Array<[number, number]> } {
  // 14-vertex approximation: octahedron + 8 equatorial belt points
  const verts: Vector3[] = [];
  const edges: Array<[number, number]> = [];

  // Top and bottom poles
  verts.push({ x: 0, y: r, z: 0 });   // 0 top
  verts.push({ x: 0, y: -r, z: 0 });  // 1 bottom

  // Upper ring at y = r * 0.4 (4 verts)
  const yUpper = r * 0.4;
  const rUpper = r * Math.sqrt(1 - 0.16);
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 2 * i) / 4 + rng() * 0.15;
    verts.push({
      x: Math.cos(angle) * rUpper + (rng() - 0.5) * r * 0.08,
      y: yUpper + (rng() - 0.5) * r * 0.06,
      z: Math.sin(angle) * rUpper + (rng() - 0.5) * r * 0.08,
    });
  }
  // Lower ring at y = -r * 0.4 (4 verts)
  const yLower = -r * 0.4;
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 2 * i) / 4 + 0.4 + rng() * 0.15;
    verts.push({
      x: Math.cos(angle) * rUpper + (rng() - 0.5) * r * 0.08,
      y: yLower + (rng() - 0.5) * r * 0.06,
      z: Math.sin(angle) * rUpper + (rng() - 0.5) * r * 0.08,
    });
  }
  // Equatorial ring (4 verts)
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 2 * i) / 4 + 0.2 + rng() * 0.15;
    verts.push({
      x: Math.cos(angle) * r + (rng() - 0.5) * r * 0.06,
      y: (rng() - 0.5) * r * 0.06,
      z: Math.sin(angle) * r + (rng() - 0.5) * r * 0.06,
    });
  }
  // verts: 0=top, 1=bottom, 2-5=upper ring, 6-9=lower ring, 10-13=equatorial

  // Pole to upper ring
  for (let i = 0; i < 4; i++) edges.push([0, 2 + i]);
  // Pole to lower ring
  for (let i = 0; i < 4; i++) edges.push([1, 6 + i]);
  // Upper ring loop
  for (let i = 0; i < 4; i++) edges.push([2 + i, 2 + ((i + 1) % 4)]);
  // Lower ring loop
  for (let i = 0; i < 4; i++) edges.push([6 + i, 6 + ((i + 1) % 4)]);
  // Equatorial loop
  for (let i = 0; i < 4; i++) edges.push([10 + i, 10 + ((i + 1) % 4)]);
  // Cross-connect rings to equatorial
  for (let i = 0; i < 4; i++) {
    edges.push([2 + i, 10 + i]);
    edges.push([6 + i, 10 + i]);
  }

  return { vertices: verts, edges };
}

export function computeBodies(systemId: number, seed: number): SystemBody[] {
  const rng = seededRng(seed ^ (systemId * 2654435761));
  const bodies: SystemBody[] = [];

  // Primary sun — far behind, off to one side
  const sunDist = 280 + rng() * 80;
  const sunAngle = rng() * Math.PI * 2;
  const sunPos: Vector3 = {
    x: Math.cos(sunAngle) * sunDist * 0.35,
    y: (rng() - 0.5) * 40,
    z: -sunDist,
  };
  const sunR = 28 + rng() * 18;
  const sunBody = buildSunBody(sunR, rng);
  bodies.push({
    kind: "sun",
    position: sunPos,
    vertices: sunBody.vertices,
    edges: sunBody.edges,
    rotationRate: 0.00004 + rng() * 0.00003,
  });

  // 1–3 planet bodies at varying distances
  const planetCount = 1 + Math.floor(rng() * 3);
  for (let p = 0; p < planetCount; p++) {
    const side = rng() > 0.5 ? 1 : -1;
    const dist = 100 + rng() * 160;
    const planetPos: Vector3 = {
      x: side * (50 + rng() * 120),
      y: (rng() - 0.5) * 60,
      z: -(dist + p * 40),
    };
    const planetR = 10 + rng() * 14;
    const jitter = planetR * 0.22;
    const { vertices, edges } = buildOctahedronLike(planetR, jitter, rng);
    bodies.push({
      kind: "planet",
      position: planetPos,
      vertices,
      edges,
      rotationRate: 0.00008 + rng() * 0.00012,
    });
  }

  return bodies;
}
