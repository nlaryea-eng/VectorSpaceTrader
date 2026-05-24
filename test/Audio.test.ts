import { afterEach, describe, expect, it, vi } from "vitest";
import { ModernAudio } from "../src/game/Audio";

afterEach(() => {
  vi.useRealTimers();
  delete (globalThis as { window?: unknown }).window;
});

describe("ModernAudio state management", () => {
  it("starts unmuted", () => {
    const audio = new ModernAudio();
    expect(audio.isMuted()).toBe(false);
  });

  it("mutes and unmutes", () => {
    const audio = new ModernAudio();
    audio.setMuted(true);
    expect(audio.isMuted()).toBe(true);
    audio.setMuted(false);
    expect(audio.isMuted()).toBe(false);
  });

  it("setMuted is idempotent", () => {
    const audio = new ModernAudio();
    audio.setMuted(true);
    audio.setMuted(true);
    expect(audio.isMuted()).toBe(true);
  });
});

describe("ModernAudio volume", () => {
  it("starts at default volumes", () => {
    const audio = new ModernAudio();
    expect(audio.getSfxVolume()).toBe(1.0);
    expect(audio.getMusicVolume()).toBe(0.6);
  });

  it("clamps volume above 1 to 1", () => {
    const audio = new ModernAudio();
    audio.setSfxVolume(2.5);
    expect(audio.getSfxVolume()).toBe(1.0);
  });

  it("clamps volume below 0 to 0", () => {
    const audio = new ModernAudio();
    audio.setSfxVolume(-0.5);
    expect(audio.getSfxVolume()).toBe(0.0);
  });

  it("stores valid fractional volumes", () => {
    const audio = new ModernAudio();
    audio.setSfxVolume(0.6);
    expect(audio.getSfxVolume()).toBeCloseTo(0.6);
    audio.setMusicVolume(0.3);
    expect(audio.getMusicVolume()).toBeCloseTo(0.3);
  });
});

describe("ModernAudio graceful degradation", () => {
  it("unlock does not throw when AudioContext is unavailable", () => {
    const audio = new ModernAudio();
    expect(() => audio.unlock()).not.toThrow();
  });
});

describe("ModernAudio ambient cleanup", () => {
  it("cleans up all faded ambient layers", () => {
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

    const audio = new ModernAudio();
    audio.unlock();
    audio.setAmbient("docked");
    audio.setAmbient("none");

    vi.advanceTimersByTime(1100);
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
