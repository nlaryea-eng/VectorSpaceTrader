import type { ExplosionEffect } from "./Renderer";

export type MessageKind = "info" | "success" | "warning" | "danger";

export interface MessageEntry {
  seq: number;
  text: string;
  kind: MessageKind;
  t: number;
}

const LOG_CAPACITY = 20;

export interface MessageLog {
  entries: MessageEntry[];
  nextSeq: number;
}

export function createEmptyMessageLog(): MessageLog {
  return { entries: [], nextSeq: 0 };
}

export function pushMessage(log: MessageLog, text: string, kind: MessageKind, t: number): MessageLog {
  const entry: MessageEntry = { seq: log.nextSeq, text, kind, t };
  const entries = [...log.entries, entry].slice(-LOG_CAPACITY);
  return { entries, nextSeq: log.nextSeq + 1 };
}

export interface GameTransientState {
  respawnCountdown: number | null;
  explosionEffect: ExplosionEffect | null;
  playerHitFlash: number;
  dockingProgress: number;
  messageLog: MessageLog;
}

export function createInitialTransientState(): GameTransientState {
  return {
    respawnCountdown: null,
    explosionEffect: null,
    playerHitFlash: 0,
    dockingProgress: 0,
    messageLog: createEmptyMessageLog(),
  };
}
