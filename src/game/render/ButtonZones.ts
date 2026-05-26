import type { ButtonZone } from "../types";

export interface ButtonZoneCollector {
  readonly zones: ButtonZone[];
  add(zone: ButtonZone): ButtonZone;
  reset(): void;
}

export function createButtonZoneCollector(): ButtonZoneCollector {
  const zones: ButtonZone[] = [];
  return {
    zones,
    add(zone: ButtonZone): ButtonZone {
      zones.push(zone);
      return zone;
    },
    reset(): void {
      zones.length = 0;
    }
  };
}

export function addButtonZone(collector: ButtonZoneCollector, zone: ButtonZone): ButtonZone {
  return collector.add(zone);
}
