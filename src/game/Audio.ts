export type SoundEvent =
  | "laser"
  | "hit"
  | "destroyed"
  | "jump"
  | "dock"
  | "tradeOk"
  | "tradeFail"
  | "ui"
  | "warning"
  | "missionAccepted"
  | "missionComplete"
  | "missionFailed"
  | "damage";

export type AmbientMode = "none" | "docked" | "flight" | "combat";

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

export class ProceduralAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private volume = 1.0;
  private unavailable = false;
  private ambientMode: AmbientMode = "none";
  private ambientGain: GainNode | null = null;
  private ambientOscillators: OscillatorNode[] = [];
  private ambientCleanupTimers = new Set<ReturnType<typeof setTimeout>>();

  unlock(): void {
    if (this.unavailable || this.context) return;
    try {
      const audioWindow = window as AudioWindow;
      const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
      if (!AudioContextCtor) {
        this.unavailable = true;
        return;
      }
      this.context = new AudioContextCtor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.context.currentTime);
      this.masterGain.connect(this.context.destination);
      void this.context.resume();
    } catch {
      this.unavailable = true;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.context) {
      const now = this.context.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, now);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (!this.muted && this.masterGain && this.context) {
      const now = this.context.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.volume, now);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  setAmbient(mode: AmbientMode): void {
    if (mode === this.ambientMode) return;
    this.ambientMode = mode;
    if (!this.context || !this.masterGain) return;
    this.stopAmbientLayer();
    if (mode !== "none") {
      this.startAmbientLayer(mode);
    }
  }

  play(event: SoundEvent): void {
    if (this.muted || !this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const profile = soundProfile(event);

    if (profile.chords) {
      for (const freq of profile.chords) {
        this.playTone(now, profile.type, freq, freq * 0.98, profile.duration, profile.gain / profile.chords.length);
      }
    } else {
      this.playTone(now, profile.type, profile.startFrequency, profile.endFrequency, profile.duration, profile.gain);
    }
  }

  private playTone(
    now: number,
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    duration: number,
    gain: number
  ): void {
    if (!this.context || !this.masterGain) return;
    const osc = this.context.createOscillator();
    const gainNode = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    if (endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }
    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gainNode);
    gainNode.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  private startAmbientLayer(mode: AmbientMode): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;

    const ambGain = this.context.createGain();
    ambGain.gain.setValueAtTime(0, now);
    ambGain.connect(this.masterGain);

    const filter = this.context.createBiquadFilter();
    filter.connect(ambGain);

    const oscillators: OscillatorNode[] = [];

    if (mode === "docked") {
      filter.type = "lowpass";
      filter.frequency.value = 380;
      filter.Q.value = 0.7;

      const osc1 = this.context.createOscillator();
      osc1.type = "sine";
      osc1.frequency.value = 55;
      osc1.connect(filter);
      osc1.start(now);
      oscillators.push(osc1);

      const osc2 = this.context.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 110;
      osc2.detune.value = 8;
      osc2.connect(filter);
      osc2.start(now);
      oscillators.push(osc2);

      ambGain.gain.linearRampToValueAtTime(0.028, now + 0.6);
    } else if (mode === "flight") {
      filter.type = "lowpass";
      filter.frequency.value = 550;
      filter.Q.value = 0.5;

      const osc1 = this.context.createOscillator();
      osc1.type = "sawtooth";
      osc1.frequency.value = 112;
      osc1.detune.value = 5;
      osc1.connect(filter);
      osc1.start(now);
      oscillators.push(osc1);

      ambGain.gain.linearRampToValueAtTime(0.02, now + 0.4);
    } else if (mode === "combat") {
      filter.type = "bandpass";
      filter.frequency.value = 180;
      filter.Q.value = 1.4;

      const osc1 = this.context.createOscillator();
      osc1.type = "triangle";
      osc1.frequency.value = 80;
      osc1.connect(filter);
      osc1.start(now);
      oscillators.push(osc1);

      const osc2 = this.context.createOscillator();
      osc2.type = "square";
      osc2.frequency.value = 163;
      osc2.detune.value = -14;
      osc2.connect(filter);
      osc2.start(now);
      oscillators.push(osc2);

      ambGain.gain.linearRampToValueAtTime(0.016, now + 0.35);
    }

    this.ambientGain = ambGain;
    this.ambientOscillators = oscillators;
  }

  private stopAmbientLayer(): void {
    if (!this.ambientGain || !this.context) return;

    const now = this.context.currentTime;
    const gain = this.ambientGain;
    const oscillators = [...this.ambientOscillators];

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);

    let cleanupTimer: ReturnType<typeof setTimeout>;
    cleanupTimer = setTimeout(() => {
      oscillators.forEach(osc => { try { osc.stop(); } catch { /* already stopped */ } });
      gain.disconnect();
      this.ambientCleanupTimers.delete(cleanupTimer);
    }, 350);
    this.ambientCleanupTimers.add(cleanupTimer);

    this.ambientGain = null;
    this.ambientOscillators = [];
  }
}

interface SoundProfile {
  type: OscillatorType;
  startFrequency: number;
  endFrequency: number;
  duration: number;
  gain: number;
  chords?: number[];
}

function soundProfile(event: SoundEvent): SoundProfile {
  switch (event) {
    case "laser":
      return { type: "sawtooth", startFrequency: 720, endFrequency: 180, duration: 0.12, gain: 0.05 };
    case "hit":
      return { type: "square", startFrequency: 180, endFrequency: 90, duration: 0.10, gain: 0.06 };
    case "damage":
      return { type: "square", startFrequency: 220, endFrequency: 80, duration: 0.18, gain: 0.07 };
    case "destroyed":
      return { type: "triangle", startFrequency: 80, endFrequency: 30, duration: 0.5, gain: 0.08 };
    case "jump":
      return { type: "sine", startFrequency: 140, endFrequency: 880, duration: 0.45, gain: 0.05 };
    case "dock":
      return { type: "triangle", startFrequency: 260, endFrequency: 120, duration: 0.35, gain: 0.04 };
    case "tradeOk":
      return { type: "sine", startFrequency: 440, endFrequency: 660, duration: 0.09, gain: 0.04 };
    case "tradeFail":
      return { type: "square", startFrequency: 150, endFrequency: 120, duration: 0.16, gain: 0.04 };
    case "warning":
      return { type: "square", startFrequency: 330, endFrequency: 220, duration: 0.2, gain: 0.05 };
    case "ui":
      return { type: "sine", startFrequency: 360, endFrequency: 420, duration: 0.06, gain: 0.03 };
    case "missionAccepted":
      return { type: "sine", startFrequency: 440, endFrequency: 660, duration: 0.18, gain: 0.05, chords: [440, 550, 660] };
    case "missionComplete":
      return { type: "sine", startFrequency: 523, endFrequency: 784, duration: 0.28, gain: 0.05, chords: [523, 659, 784] };
    case "missionFailed":
      return { type: "triangle", startFrequency: 330, endFrequency: 165, duration: 0.32, gain: 0.05 };
  }
}
