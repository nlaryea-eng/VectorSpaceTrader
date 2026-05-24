import { getPlayerShipStats } from "./Ships";
import type { CommodityId, EconomyType, GovernmentType, HazardTag, MarketItem, OpportunityTag, PlayerState, StarSystem } from "./types";
import { COMMODITIES } from "./Trading";

export const UNIVERSE_CONSTANTS = {
  systemCount: 128,
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

const CULTURES = [
  "charter councils",
  "dock cooperatives",
  "survey guilds",
  "freehold crews",
  "harbor syndics",
  "ledger houses",
  "workshop circles",
  "route assemblies"
];
const HAZARDS: HazardTag[] = ["calm", "ionWeather", "debris", "patrolGap", "signalNoise", "raiderTrace"];
const OPPORTUNITIES: OpportunityTag[] = [
  "steadyDemand",
  "shortHaul",
  "surveyData",
  "repairQueue",
  "contractFlow",
  "salvageTrace"
];
const STATION_HINTS = [
  "compact berth",
  "open truss port",
  "cold storage ring",
  "survey mast",
  "repair gantry",
  "contract quay",
  "freight lock",
  "instrument pier"
];

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

export function generateUniverse(seed: number, count: number = UNIVERSE_CONSTANTS.systemCount): StarSystem[] {
  const prng = new SeededPrng(seed);
  const usedNames = new Set<string>();
  const systems: StarSystem[] = [];

  for (let id = 0; id < count; id += 1) {
    const economy = prng.pick(ECONOMIES);
    const techLevel = prng.int(1, 12);
    const populationBase = economy === "Periphery" ? 1 : economy === "Trade Hub" ? 6 : 3;
    const marketModifiers = createMarketModifiers(prng, economy, techLevel);

    const name = generateSystemName(prng, usedNames);
    const x = Number((prng.next() * UNIVERSE_CONSTANTS.width).toFixed(2));
    const y = Number((prng.next() * UNIVERSE_CONSTANTS.height).toFixed(2));
    const government = prng.pick(GOVERNMENTS);
    const population = Number((populationBase + prng.next() * 7).toFixed(1));
    const metadata = createSystemMetadata(seed, id, economy, government, techLevel, marketModifiers);

    systems.push({
      id,
      name,
      x,
      y,
      economy,
      government: metadata.government,
      techLevel,
      population,
      marketModifiers,
      description: metadata.description,
      culture: metadata.culture,
      hazardTag: metadata.hazardTag,
      hazardLevel: metadata.hazardLevel,
      opportunityTag: metadata.opportunityTag,
      importHint: metadata.importHint,
      exportHint: metadata.exportHint,
      stationHint: metadata.stationHint
    });
  }

  return systems;
}

function createSystemMetadata(
  seed: number,
  id: number,
  economy: EconomyType,
  government: GovernmentType,
  techLevel: number,
  marketModifiers: Record<CommodityId, number>
): Pick<
  StarSystem,
  "description" | "culture" | "government" | "hazardTag" | "hazardLevel" | "opportunityTag" | "importHint" | "exportHint" | "stationHint"
> {
  const prng = new SeededPrng((seed + id * 1013 + techLevel * 97) >>> 0);
  const hazardTag = prng.pick(HAZARDS);
  const hazardLevel = hazardTag === "calm" ? 0 : prng.int(1, 5);
  const opportunityTag = prng.pick(OPPORTUNITIES);
  const stationHint = prng.pick(STATION_HINTS);
  const culture = `${prng.pick(CULTURES)} under ${government.toLowerCase()} rule`;
  const commodities = [...COMMODITIES].sort((a, b) => marketModifiers[a.id] - marketModifiers[b.id]);
  const exportHint = commodities[0].id;
  const importHint = commodities[commodities.length - 1].id;
  const description = `${economy} lanes around a ${stationHint}, known for ${formatTag(opportunityTag)} and ${formatTag(hazardTag)}.`;

  return {
    description,
    culture,
    government,
    hazardTag,
    hazardLevel,
    opportunityTag,
    importHint,
    exportHint,
    stationHint
  };
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

export function getFuelRequired(from: StarSystem, to: StarSystem, player?: Pick<PlayerState, "shipId" | "equipment">): number {
  const modifier = player ? getPlayerShipStats(player).fuelUseModifier : 1;
  return Number((getJumpDistance(from, to) * UNIVERSE_CONSTANTS.fuelPerDistance * modifier).toFixed(1));
}

export function canJump(from: StarSystem, to: StarSystem, fuel: number, player?: Pick<PlayerState, "shipId" | "equipment">): boolean {
  const distance = getJumpDistance(from, to);
  const maxRange = player ? getPlayerShipStats(player).maxJumpRange : UNIVERSE_CONSTANTS.maxJumpRange;
  return distance <= maxRange && fuel >= getFuelRequired(from, to, player);
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

function formatTag(tag: HazardTag | OpportunityTag): string {
  return tag.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}
