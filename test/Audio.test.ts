import { afterEach, describe, expect, it, vi } from "vitest";
import { ProceduralAudio } from "../src/game/Audio";
import type { SoundEvent, AmbientMode } from "../src/game/Audio";

afterEach(() => {
  vi.useRealTimers();
  delete (globalThis as { window?: unknown }).window;
});

describe("ProceduralAudio state management", () => {
  it("starts unmuted", () => {
    const audio = new ProceduralAudio();
    expect(audio.isMuted()).toBe(false);
  });

  it("mutes and unmutes", () => {
    const audio = new ProceduralAudio();
    audio.setMuted(true);
    expect(audio.isMuted()).toBe(true);
    audio.setMuted(false);
    expect(audio.isMuted()).toBe(false);
  });

  it("setMuted is idempotent", () => {
    const audio = new ProceduralAudio();
    audio.setMuted(true);
    audio.setMuted(true);
    expect(audio.isMuted()).toBe(true);
  });
});

describe("ProceduralAudio volume", () => {
  it("starts at full volume", () => {
    const audio = new ProceduralAudio();
    expect(audio.getVolume()).toBe(1.0);
  });

  it("clamps volume above 1 to 1", () => {
    const audio = new ProceduralAudio();
    audio.setVolume(2.5);
    expect(audio.getVolume()).toBe(1.0);
  });

  it("clamps volume below 0 to 0", () => {
    const audio = new ProceduralAudio();
    audio.setVolume(-0.5);
    expect(audio.getVolume()).toBe(0.0);
  });

  it("stores a valid fractional volume", () => {
    const audio = new ProceduralAudio();
    audio.setVolume(0.6);
    expect(audio.getVolume()).toBeCloseTo(0.6);
  });
});

describe("ProceduralAudio graceful degradation (no AudioContext in node env)", () => {
  it("unlock does not throw when AudioContext is unavailable", () => {
    const audio = new ProceduralAudio();
    expect(() => audio.unlock()).not.toThrow();
  });

  it("unlock can be called multiple times without throwing", () => {
    const audio = new ProceduralAudio();
    expect(() => {
      audio.unlock();
      audio.unlock();
      audio.unlock();
    }).not.toThrow();
  });

  it("mute state is preserved after failed unlock", () => {
    const audio = new ProceduralAudio();
    audio.setMuted(true);
    audio.unlock();
    expect(audio.isMuted()).toBe(true);
  });
});

describe("ProceduralAudio event routing (no AudioContext)", () => {
  const allEvents: SoundEvent[] = [
    "laser", "hit", "destroyed", "jump", "dock",
    "tradeOk", "tradeFail", "ui", "warning",
    "missionAccepted", "missionComplete", "missionFailed", "damage",
  ];

  it("play does not throw for any event when audio context is unavailable", () => {
    const audio = new ProceduralAudio();
    for (const event of allEvents) {
      expect(() => audio.play(event)).not.toThrow();
    }
  });

  it("play does not throw when muted and context is unavailable", () => {
    const audio = new ProceduralAudio();
    audio.setMuted(true);
    for (const event of allEvents) {
      expect(() => audio.play(event)).not.toThrow();
    }
  });
});

describe("ProceduralAudio ambient mode (no AudioContext)", () => {
  const modes: AmbientMode[] = ["none", "docked", "flight", "combat"];

  it("setAmbient does not throw for any mode", () => {
    const audio = new ProceduralAudio();
    for (const mode of modes) {
      expect(() => audio.setAmbient(mode)).not.toThrow();
    }
  });

  it("setAmbient can cycle through modes without throwing", () => {
    const audio = new ProceduralAudio();
    expect(() => {
      audio.setAmbient("docked");
      audio.setAmbient("flight");
      audio.setAmbient("combat");
      audio.setAmbient("none");
      audio.setAmbient("docked");
    }).not.toThrow();
  });

  it("repeated same mode calls are no-ops and do not throw", () => {
    const audio = new ProceduralAudio();
    expect(() => {
      audio.setAmbient("flight");
      audio.setAmbient("flight");
      audio.setAmbient("flight");
    }).not.toThrow();
  });
});

describe("ProceduralAudio ambient cleanup", () => {
  it("cleans up all faded ambient layers after rapid mode changes", () => {
    vi.useFakeTimers();
    const createdOscillators: FakeOscillatorNode[] = [];
    (globalThis as { window?: unknown }).window = {
      AudioContext: class extends FakeAudioContext {
        createOscillator(): OscillatorNode {
          const oscillator = new FakeOscillatorNode() as unknown as OscillatorNode;
          createdOscillators.push(oscillator as unknown as FakeOscillatorNode);
          return oscillator;
        }
      }
    };

    const audio = new ProceduralAudio();
    audio.unlock();
    audio.setAmbient("docked");
    audio.setAmbient("flight");
    audio.setAmbient("combat");
    audio.setAmbient("none");

    expect(createdOscillators).toHaveLength(5);
    vi.advanceTimersByTime(350);
    expect(createdOscillators.every((oscillator) => oscillator.stopped)).toBe(true);
  });
});

class FakeAudioParam {
  value = 0;

  setValueAtTime(value: number): void {
    this.value = value;
  }

  linearRampToValueAtTime(value: number): void {
    this.value = value;
  }

  exponentialRampToValueAtTime(value: number): void {
    this.value = value;
  }

  cancelScheduledValues(): void {
    // no-op test double
  }
}

class FakeGainNode {
  gain = new FakeAudioParam();

  connect(): void {
    // no-op test double
  }

  disconnect(): void {
    // no-op test double
  }
}

class FakeOscillatorNode {
  type: OscillatorType = "sine";
  frequency = new FakeAudioParam();
  detune = new FakeAudioParam();
  stopped = false;

  connect(): void {
    // no-op test double
  }

  start(): void {
    // no-op test double
  }

  stop(): void {
    this.stopped = true;
  }
}

class FakeBiquadFilterNode {
  type: BiquadFilterType = "lowpass";
  frequency = new FakeAudioParam();
  Q = new FakeAudioParam();

  connect(): void {
    // no-op test double
  }
}

class FakeAudioContext {
  currentTime = 0;
  destination = {};

  createGain(): GainNode {
    return new FakeGainNode() as unknown as GainNode;
  }

  createOscillator(): OscillatorNode {
    return new FakeOscillatorNode() as unknown as OscillatorNode;
  }

  createBiquadFilter(): BiquadFilterNode {
    return new FakeBiquadFilterNode() as unknown as BiquadFilterNode;
  }

  resume(): Promise<void> {
    return Promise.resolve();
  }
}
