import type { CommodityId, EconomyType, GovernmentType, MarketItem, StarSystem } from "./types";
import { COMMODITIES } from "./Trading";

export const UNIVERSE_CONSTANTS = {
  systemCount: 40,
  width: 96,
  height: 72,
  maxJumpRange: 24,
  fuelPerDistance: 0.22
} as const;

const ECONOMIES: EconomyType[] = [
  "Agricultural",
  "Industrial",
  "Research",
  "Mining",
  "Periphery",
  "Trade Hub"
];

const GOVERNMENTS: GovernmentType[] = [
  "Cooperative",
  "Council",
  "Syndicate",
  "Corporate",
  "Collective",
  "Independent"
];

const PREFIXES = ["Ara", "Bel", "Cen", "Daro", "Eli", "Forn", "Gala", "Hes", "Ivo", "Juno", "Kera", "Luma"];
const MIDDLES = ["mar", "tor", "ven", "lis", "cor", "nex", "phi", "ran", "sil", "qua", "dor", "zen"];
const SUFFIXES = ["a", "on", "is", "um", "ea", "or", "ix", "ara", "os", "eth", "ion", " Prime"];

export class SeededPrng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: T[]): T {
    return items[this.int(0, items.length - 1)];
  }
}

export function generateSystemName(prng: SeededPrng, used: Set<string>): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const name = `${prng.pick(PREFIXES)}${prng.pick(MIDDLES)}${prng.pick(SUFFIXES)}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }

  const fallback = `${prng.pick(PREFIXES)}${prng.pick(MIDDLES)}-${used.size + 1}`;
  used.add(fallback);
  return fallback;
}

export function generateUniverse(seed: number, count = UNIVERSE_CONSTANTS.systemCount): StarSystem[] {
  const prng = new SeededPrng(seed);
  const usedNames = new Set<string>();
  const systems: StarSystem[] = [];

  for (let id = 0; id < count; id += 1) {
    const economy = prng.pick(ECONOMIES);
    const techLevel = prng.int(1, 12);
    const populationBase = economy === "Periphery" ? 1 : economy === "Trade Hub" ? 6 : 3;
    const marketModifiers = createMarketModifiers(prng, economy, techLevel);

    systems.push({
      id,
      name: generateSystemName(prng, usedNames),
      x: Number((prng.next() * UNIVERSE_CONSTANTS.width).toFixed(2)),
      y: Number((prng.next() * UNIVERSE_CONSTANTS.height).toFixed(2)),
      economy,
      government: prng.pick(GOVERNMENTS),
      techLevel,
      population: Number((populationBase + prng.next() * 7).toFixed(1)),
      marketModifiers
    });
  }

  return systems;
}

function createMarketModifiers(
  prng: SeededPrng,
  economy: EconomyType,
  techLevel: number
): Record<CommodityId, number> {
  const modifiers = {} as Record<CommodityId, number>;

  for (const commodity of COMMODITIES) {
    let value = 1 + (prng.next() - 0.5) * 0.38;

    if (economy === "Agricultural" && commodity.id === "grain") value *= 0.65;
    if (economy === "Mining" && (commodity.id === "minerals" || commodity.id === "alloys")) value *= 0.72;
    if (economy === "Industrial" && commodity.id === "machinery") value *= 0.78;
    if (economy === "Research" && (commodity.id === "computers" || commodity.id === "medicine")) value *= 0.82;
    if (economy === "Periphery" && (commodity.id === "computers" || commodity.id === "luxuries")) value *= 1.42;
    if (economy === "Trade Hub") value *= 0.92;
    if (techLevel > 8 && commodity.id === "computers") value *= 0.86;
    if (techLevel < 4 && commodity.id === "medicine") value *= 1.22;

    modifiers[commodity.id] = Number(Math.max(0.45, Math.min(1.9, value)).toFixed(2));
  }

  return modifiers;
}

export function getJumpDistance(from: StarSystem, to: StarSystem): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function getFuelRequired(from: StarSystem, to: StarSystem): number {
  return Number((getJumpDistance(from, to) * UNIVERSE_CONSTANTS.fuelPerDistance).toFixed(1));
}

export function canJump(from: StarSystem, to: StarSystem, fuel: number): boolean {
  const distance = getJumpDistance(from, to);
  return distance <= UNIVERSE_CONSTANTS.maxJumpRange && fuel >= getFuelRequired(from, to);
}

export function getSystemAtMapPoint(
  systems: StarSystem[],
  clickX: number,
  clickY: number,
  mapX: number,
  mapY: number,
  mapW: number,
  mapH: number,
  hitRadius: number = 8
): StarSystem | null {
  let closest: StarSystem | null = null;
  let minDist = hitRadius;

  for (const system of systems) {
    const sx = mapX + (system.x / 96) * mapW;
    const sy = mapY + (system.y / 72) * mapH;
    const dist = Math.hypot(clickX - sx, clickY - sy);
    if (dist < minDist) {
      minDist = dist;
      closest = system;
    }
  }

  return closest;
}

export function generateMarket(system: StarSystem): MarketItem[] {
  return COMMODITIES.map((commodity) => {
    const modifier = system.marketModifiers[commodity.id];
    const techSupply = commodity.id === "computers" || commodity.id === "medicine" ? system.techLevel : 13 - system.techLevel;
    const price = Math.max(1, Math.round(commodity.basePrice * modifier));
    const quantity = Math.max(0, Math.round(commodity.baseQuantity * modifier + techSupply));

    return {
      ...commodity,
      price,
      quantity
    };
  });
}
