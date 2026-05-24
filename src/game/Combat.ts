import type { Orientation, PlayerState, Projectile, Ship, Vector3 } from "./types";
import { add, clamp, collides, forwardVector, normalize, scale, subtract, updateProjectile, vec3 } from "./Physics";

export const COMBAT_CONSTANTS = {
  playerLaserDamage: 28,
  enemyLaserDamage: 8,
  laserEnergyCost: 6,
  projectileRadius: 1.8,
  laserTtl: 1.2,
  enemyFireCooldown: 2.4,
  enemyTurnSpeed: 0.8
} as const;

interface EnemyClass {
  classId: string;
  name: string;
  behavior: Ship["behavior"];
  hull: number;
  shield: number;
  radius: number;
  speed: number;
  damage: number;
  fireCooldown: number;
  turnSpeed: number;
  thrust: number;
  wireframe: Vector3[];
  edges: Array<[number, number]>;
}

export const ENEMY_CLASSES: EnemyClass[] = [
  {
    classId: "needleWisp",
    name: "Needle Wisp",
    behavior: "direct",
    hull: 54,
    shield: 12,
    radius: 5,
    speed: 7,
    damage: 7,
    fireCooldown: 1.7,
    turnSpeed: 1.35,
    thrust: 11,
    wireframe: [vec3(0, 0, -8), vec3(-2, -1, 5), vec3(2, -1, 5), vec3(0, 2, 3), vec3(0, -2, 5)],
    edges: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 4], [2, 4], [3, 1], [3, 2]]
  },
  {
    classId: "kiteFrigate",
    name: "Kite Frigate",
    behavior: "strafe",
    hull: 92,
    shield: 24,
    radius: 8,
    speed: 5,
    damage: 10,
    fireCooldown: 2.3,
    turnSpeed: 0.95,
    thrust: 8,
    wireframe: [
      vec3(0, 0, -7),
      vec3(-6, -2, 3),
      vec3(6, -2, 3),
      vec3(0, 5, 2),
      vec3(0, -4, 6),
      vec3(-3, 0, 7),
      vec3(3, 0, 7)
    ],
    edges: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 4], [2, 4], [3, 1], [3, 2], [5, 6], [5, 1], [6, 2]]
  },
  {
    classId: "prismCutter",
    name: "Prism Cutter",
    behavior: "sniper",
    hull: 76,
    shield: 18,
    radius: 7,
    speed: 4,
    damage: 16,
    fireCooldown: 3.1,
    turnSpeed: 0.75,
    thrust: 6,
    wireframe: [vec3(0, 3, -6), vec3(-4, -3, -2), vec3(4, -3, -2), vec3(0, 0, 7), vec3(-5, 2, 4), vec3(5, 2, 4)],
    edges: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3], [4, 0], [4, 3], [5, 0], [5, 3]]
  },
  {
    classId: "anvilSkiff",
    name: "Anvil Skiff",
    behavior: "guard",
    hull: 130,
    shield: 34,
    radius: 10,
    speed: 3,
    damage: 12,
    fireCooldown: 2.7,
    turnSpeed: 0.55,
    thrust: 5,
    wireframe: [
      vec3(-5, 2, -5),
      vec3(5, 2, -5),
      vec3(7, -2, 2),
      vec3(-7, -2, 2),
      vec3(-4, 1, 7),
      vec3(4, 1, 7),
      vec3(0, -4, 4)
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 5], [2, 5], [3, 4], [4, 5], [3, 6], [2, 6]]
  }
];

export function createEnemyShip(id = "raider-1", position = vec3(0, 0, 85), classIndex = 0): Ship {
  const enemyClass = ENEMY_CLASSES[((classIndex % ENEMY_CLASSES.length) + ENEMY_CLASSES.length) % ENEMY_CLASSES.length];
  return {
    id,
    classId: enemyClass.classId,
    name: enemyClass.name,
    behavior: enemyClass.behavior,
    position,
    velocity: vec3(0, 0, -enemyClass.speed),
    orientation: { pitch: 0, yaw: Math.PI, roll: 0 },
    radius: enemyClass.radius,
    hull: enemyClass.hull,
    maxHull: enemyClass.hull,
    shield: enemyClass.shield,
    maxShield: enemyClass.shield,
    damage: enemyClass.damage,
    fireCooldown: enemyClass.fireCooldown,
    turnSpeed: enemyClass.turnSpeed,
    thrust: enemyClass.thrust,
    alive: true,
    wireframe: enemyClass.wireframe,
    edges: enemyClass.edges
  };
}

export function fireLaser(
  owner: "player" | "enemy",
  position: Vector3,
  orientation: Orientation,
  inheritedVelocity = vec3(),
  damage?: number
): Projectile {
  const direction = forwardVector(orientation);
  return {
    id: `${owner}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    owner,
    position: add(position, scale(direction, 5)),
    velocity: add(inheritedVelocity, scale(direction, owner === "player" ? 96 : 70)),
    damage: damage ?? (owner === "player" ? COMBAT_CONSTANTS.playerLaserDamage : COMBAT_CONSTANTS.enemyLaserDamage),
    ttl: COMBAT_CONSTANTS.laserTtl
  };
}

export function fireEnemyLaser(enemy: Ship): Projectile {
  return fireLaser("enemy", enemy.position, enemy.orientation, enemy.velocity, enemy.damage);
}

export function applyDamage(ship: Ship, damage: number): Ship {
  if (!ship.alive) return ship;

  const shieldDamage = Math.min(ship.shield, damage);
  const hullDamage = damage - shieldDamage;
  const shield = clamp(ship.shield - shieldDamage, 0, ship.maxShield);
  const hull = clamp(ship.hull - hullDamage, 0, ship.maxHull);

  return {
    ...ship,
    shield,
    hull,
    alive: hull > 0
  };
}

export function updateEnemy(enemy: Ship, player: PlayerState, dt: number): Ship {
  if (!enemy.alive) return enemy;

  const toPlayer = normalize(subtract(player.position, enemy.position));
  const yaw = Math.atan2(toPlayer.x, toPlayer.z);
  const pitch = Math.asin(clamp(-toPlayer.y, -1, 1));
  const strafe =
    enemy.behavior === "strafe"
      ? vec3(Math.cos(enemy.orientation.roll) * 0.45, Math.sin(enemy.orientation.roll) * 0.2, 0)
      : vec3();
  const desired = normalize(add(toPlayer, strafe));
  const velocity = add(scale(enemy.velocity, 0.98), scale(desired, dt * enemy.thrust));

  return {
    ...enemy,
    orientation: {
      pitch: lerpAngle(enemy.orientation.pitch, pitch, enemy.turnSpeed * dt),
      yaw: lerpAngle(enemy.orientation.yaw, yaw, enemy.turnSpeed * dt),
      roll: enemy.orientation.roll + dt * (enemy.behavior === "guard" ? 0.22 : 0.6)
    },
    position: add(enemy.position, scale(velocity, dt)),
    velocity
  };
}

export function applyPlayerDamage(player: PlayerState, damage: number): PlayerState {
  const shieldDamage = Math.min(player.shield, damage);
  const hullDamage = clamp(damage - shieldDamage, 0, player.hull);
  return {
    ...player,
    shield: clamp(player.shield - shieldDamage, 0, player.maxShield),
    hull: clamp(player.hull - hullDamage, 0, player.maxHull)
  };
}

export function selectEnemyClass(reputation: number, legalRisk: number): number {
  const repTier = Math.floor(Math.max(0, reputation) / 10);
  const riskBump = legalRisk > 2 ? 1 : 0;
  return (repTier + riskBump) % ENEMY_CLASSES.length;
}

export function resolveProjectileHits(
  projectiles: Projectile[],
  enemy: Ship,
  player: PlayerState,
  dt: number
): { projectiles: Projectile[]; enemy: Ship; player: PlayerState } {
  let nextEnemy = enemy;
  let nextPlayer = player;
  const remaining: Projectile[] = [];

  for (const projectile of projectiles.map((item) => updateProjectile(item, dt))) {
    if (projectile.ttl <= 0) continue;

    if (projectile.owner === "player" && collides(projectile.position, COMBAT_CONSTANTS.projectileRadius, nextEnemy)) {
      nextEnemy = applyDamage(nextEnemy, projectile.damage);
      continue;
    }

    if (projectile.owner === "enemy") {
      const playerDistance = Math.hypot(
        projectile.position.x - nextPlayer.position.x,
        projectile.position.y - nextPlayer.position.y,
        projectile.position.z - nextPlayer.position.z
      );

      if (playerDistance < 5) {
        nextPlayer = applyPlayerDamage(nextPlayer, projectile.damage);
        continue;
      }
    }

    remaining.push(projectile);
  }

  return { projectiles: remaining, enemy: nextEnemy, player: nextPlayer };
}

function lerpAngle(current: number, target: number, amount: number): number {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * Math.min(1, amount);
}
