import type { Orientation, Projectile, Ship, Vector3 } from "./types";

export const PHYSICS_CONSTANTS = {
  maxSpeed: 42,
  acceleration: 18,
  drag: 0.985,
  turnRate: 1.8,
  projectileSpeed: 92
} as const;

export const vec3 = (x = 0, y = 0, z = 0): Vector3 => ({ x, y, z });

export function add(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtract(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(v: Vector3, scalar: number): Vector3 {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
}

export function length(v: Vector3): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function normalize(v: Vector3): Vector3 {
  const len = length(v);
  return len === 0 ? vec3() : scale(v, 1 / len);
}

export function distance(a: Vector3, b: Vector3): number {
  return length(subtract(a, b));
}

export function forwardVector(orientation: Orientation): Vector3 {
  const cosPitch = Math.cos(orientation.pitch);
  return normalize({
    x: Math.sin(orientation.yaw) * cosPitch,
    y: -Math.sin(orientation.pitch),
    z: Math.cos(orientation.yaw) * cosPitch
  });
}

export function rightVector(orientation: Orientation): Vector3 {
  return normalize({
    x: Math.cos(orientation.yaw),
    y: Math.sin(orientation.roll) * 0.18,
    z: -Math.sin(orientation.yaw)
  });
}

export function updateOrientation(
  orientation: Orientation,
  input: { pitch: number; yaw: number; roll: number },
  dt: number
): Orientation {
  return {
    pitch: clampAngle(orientation.pitch + input.pitch * PHYSICS_CONSTANTS.turnRate * dt),
    yaw: clampAngle(orientation.yaw + input.yaw * PHYSICS_CONSTANTS.turnRate * dt),
    roll: clampAngle(orientation.roll + input.roll * PHYSICS_CONSTANTS.turnRate * dt)
  };
}

export function updateVelocity(
  velocity: Vector3,
  orientation: Orientation,
  throttleInput: number,
  dt: number
): Vector3 {
  const thrust = scale(forwardVector(orientation), throttleInput * PHYSICS_CONSTANTS.acceleration * dt);
  const next = scale(add(velocity, thrust), Math.pow(PHYSICS_CONSTANTS.drag, dt * 60));
  const speed = length(next);
  return speed > PHYSICS_CONSTANTS.maxSpeed ? scale(normalize(next), PHYSICS_CONSTANTS.maxSpeed) : next;
}

export function updatePosition(position: Vector3, velocity: Vector3, dt: number): Vector3 {
  return add(position, scale(velocity, dt));
}

export function updateProjectile(projectile: Projectile, dt: number): Projectile {
  return {
    ...projectile,
    position: updatePosition(projectile.position, projectile.velocity, dt),
    ttl: projectile.ttl - dt
  };
}

export function collides(position: Vector3, radius: number, ship: Ship): boolean {
  return ship.alive && distance(position, ship.position) <= radius + ship.radius;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampAngle(value: number): number {
  const twoPi = Math.PI * 2;
  if (value > Math.PI) return value - twoPi;
  if (value < -Math.PI) return value + twoPi;
  return value;
}
