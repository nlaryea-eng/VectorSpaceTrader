import type { StarSystem, StationService } from "./types";
import { getWorldMissionDensityModifier, getWorldServiceDensityModifier } from "./WorldClasses";

export type StationProfileId =
  | "startPort"
  | "marketHub"
  | "limitedPort"
  | "shipwright"
  | "instrumentBay"
  | "repairCoop"
  | "contractOffice"
  | "unstablePort"
  | "surveyOutpost";

export interface StationProfile {
  id: StationProfileId;
  label: string;
  services: Record<StationService, boolean>;
  marketScale: number;
  marketPriceModifier: number;
  repairCostModifier: number;
  missionDensity: number;
}

export const STATION_SERVICE_LABELS: Record<StationService, string> = {
  market: "Market",
  fuel: "Fuel",
  repair: "Repair",
  missions: "Missions",
  equipment: "Equipment",
  advancedEquipment: "Advanced Equipment",
  shipyard: "Shipyard",
  survey: "Survey",
  salvage: "Salvage",
  restrictedContracts: "Risk Contracts"
};

const BASE_SERVICES: Record<StationService, boolean> = {
  market: true,
  fuel: true,
  repair: true,
  missions: false,
  equipment: false,
  advancedEquipment: false,
  shipyard: false,
  survey: false,
  salvage: false,
  restrictedContracts: false
};

export function getStationProfile(system: StarSystem): StationProfile {
  if (system.id === 0) {
    return buildProfile("startPort", "First Berth", {
      missions: true,
      equipment: true,
      shipyard: true,
      survey: true
    }, 1, 1, 1, 1);
  }

  const selector = Math.abs(
    Math.floor(system.x * 11 + system.y * 17 + system.techLevel * 23 + system.population * 19 + system.id * 29)
  ) % 8;

  if (system.economy === "Trade Hub" || selector === 0) {
    return applyWorldServiceBias(system, buildProfile("marketHub", "Market Hub", {
      missions: true,
      equipment: true,
      advancedEquipment: system.techLevel >= 7,
      shipyard: system.techLevel >= 6
    }, 1.18, 1, 1, 0.98));
  }

  if (system.economy === "Research" || selector === 1) {
    return applyWorldServiceBias(system, buildProfile("instrumentBay", "Instrument Bay", {
      missions: true,
      equipment: true,
      advancedEquipment: true,
      survey: true
    }, 0.95, 1, 1, 1.02));
  }

  if (system.economy === "Mining" || selector === 2) {
    return applyWorldServiceBias(system, buildProfile("surveyOutpost", "Survey Outpost", {
      missions: true,
      equipment: true,
      survey: true,
      salvage: true
    }, 0.9, 0.95, 1, 1.03));
  }

  if (selector === 3 || system.techLevel >= 9) {
    return applyWorldServiceBias(system, buildProfile("shipwright", "Shipwright", {
      missions: true,
      equipment: true,
      advancedEquipment: true,
      shipyard: true
    }, 1, 1, 1, 1));
  }

  if (selector === 4) {
    return applyWorldServiceBias(system, buildProfile("repairCoop", "Repair Cooperative", {
      missions: true,
      equipment: true
    }, 0.92, 0.72, 0.9, 1.01));
  }

  if (selector === 5 || system.opportunityTag === "contractFlow") {
    return applyWorldServiceBias(system, buildProfile("contractOffice", "Contract Office", {
      missions: true,
      equipment: true,
      restrictedContracts: system.hazardLevel >= 3
    }, 1, 1, 1.3, 1.01));
  }

  if (selector === 6 || system.hazardLevel >= 4) {
    return applyWorldServiceBias(system, buildProfile("unstablePort", "Unstable Port", {
      missions: true,
      salvage: true,
      restrictedContracts: true
    }, 0.82, 1.15, 1.05, 1.06));
  }

  return applyWorldServiceBias(system, buildProfile("limitedPort", "Limited Port", {
    missions: system.population >= 3 || system.techLevel >= 4,
    equipment: system.techLevel >= 5
  }, 0.78, 1, 0.75, 1.04));
}

export function hasStationService(system: StarSystem, service: StationService): boolean {
  return getStationProfile(system).services[service];
}

export function getAvailableServices(system: StarSystem): StationService[] {
  const profile = getStationProfile(system);
  return (Object.keys(profile.services) as StationService[]).filter((service) => profile.services[service]);
}

function buildProfile(
  id: StationProfileId,
  label: string,
  services: Partial<Record<StationService, boolean>>,
  marketScale: number,
  repairCostModifier: number,
  missionDensity: number,
  marketPriceModifier = 1
): StationProfile {
  return {
    id,
    label,
    services: { ...BASE_SERVICES, ...services },
    marketScale,
    marketPriceModifier,
    repairCostModifier,
    missionDensity
  };
}

function applyWorldServiceBias(system: StarSystem, profile: StationProfile): StationProfile {
  const services = { ...profile.services };
  const classId = system.profile.classId;

  if (classId === "observatory" || classId === "archive" || classId === "reserve") {
    services.survey = true;
  }
  if (classId === "quarry" || classId === "crucible") {
    services.salvage = true;
  }
  if (classId === "forge" || classId === "harbor" || classId === "relay" || classId === "bastion") {
    services.equipment = true;
  }
  if ((classId === "harbor" || classId === "relay") && system.techLevel >= 5) {
    services.shipyard = true;
  }
  if ((classId === "freehold" || classId === "veil" || classId === "bastion") && system.hazardLevel >= 2) {
    services.restrictedContracts = true;
  }

  services.market = true;
  services.fuel = true;
  services.repair = true;

  return {
    ...profile,
    services,
    marketScale: clamp(profile.marketScale * getWorldServiceDensityModifier(system), 0.72, 1.25),
    marketPriceModifier: clamp(profile.marketPriceModifier, 0.94, 1.08),
    missionDensity: clamp(profile.missionDensity * getWorldMissionDensityModifier(system), 0.7, 1.35)
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
