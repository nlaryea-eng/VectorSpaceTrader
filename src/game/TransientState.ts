import type { ExplosionEffect } from "./Renderer";

export interface GameTransientState {
  respawnCountdown: number | null;
  explosionEffect: ExplosionEffect | null;
  playerHitFlash: number;
  dockingProgress: number;
}

export function createInitialTransientState(): GameTransientState {
  return {
    respawnCountdown: null,
    explosionEffect: null,
    playerHitFlash: 0,
    dockingProgress: 0,
  };
}
