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

export class ModernAudio {
  private context: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  private muted = false;
  private sfxVolume = 1.0;
  private musicVolume = 0.6;
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
      this.masterGain.connect(this.context.destination);

      this.sfxGain = this.context.createGain();
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.context.createGain();
      this.musicGain.connect(this.masterGain);

      this.updateGains();
      void this.context.resume();
      } catch {
      this.unavailable = true;
      }
      }
  private updateGains(): void {
    if (!this.context || !this.masterGain || !this.sfxGain || !this.musicGain) return;
    const now = this.context.currentTime;

    const m = this.muted ? 0 : 1;
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume * m, now, 0.05);
    this.musicGain.gain.setTargetAtTime(this.musicVolume * m, now, 0.05);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateGains();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateGains();
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateGains();
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  getVolume(): number {
    return this.sfxVolume;
  }

  setAmbient(mode: AmbientMode): void {
    if (mode === this.ambientMode) return;
    this.ambientMode = mode;
    if (!this.context || !this.musicGain) return;
    this.stopAmbientLayer();
    if (mode !== "none") {
      this.startAmbientLayer(mode);
    }
  }

  play(event: SoundEvent): void {
    if (this.muted || !this.context || !this.sfxGain) return;

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
    if (!this.context || !this.sfxGain) return;
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
    gainNode.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  private startAmbientLayer(mode: AmbientMode): void {
    if (!this.context || !this.musicGain) return;
    const now = this.context.currentTime;

    const ambGain = this.context.createGain();
    ambGain.gain.setValueAtTime(0, now);
    ambGain.connect(this.musicGain);

    const filter = this.context.createBiquadFilter();
    filter.connect(ambGain);

    const oscillators: OscillatorNode[] = [];

    if (mode === "docked") {
      // Atmospheric synth drone
      filter.type = "lowpass";
      filter.frequency.value = 400;
      filter.Q.value = 1.0;

      const freqs = [55, 110, 164.81]; // A1, A2, E3
      freqs.forEach(f => {
        const osc = this.context!.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        osc.connect(filter);
        osc.start(now);
        oscillators.push(osc);
      });

      ambGain.gain.linearRampToValueAtTime(0.04, now + 2.0);
    } else if (mode === "flight") {
      // Cinematic engine hum
      filter.type = "lowpass";
      filter.frequency.value = 600;

      const osc1 = this.context.createOscillator();
      osc1.type = "sawtooth";
      osc1.frequency.value = 41.20; // E1
      osc1.connect(filter);
      osc1.start(now);
      oscillators.push(osc1);

      ambGain.gain.linearRampToValueAtTime(0.03, now + 1.5);
    } else if (mode === "combat") {
      // Intense pulse
      filter.type = "bandpass";
      filter.frequency.value = 220;
      filter.Q.value = 2.0;

      const osc1 = this.context.createOscillator();
      osc1.type = "square";
      osc1.frequency.value = 82.41; // E2
      osc1.connect(filter);
      osc1.start(now);
      oscillators.push(osc1);

      ambGain.gain.linearRampToValueAtTime(0.02, now + 1.0);
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
    gain.gain.linearRampToValueAtTime(0, now + 1.0);

    let cleanupTimer: ReturnType<typeof setTimeout>;
    cleanupTimer = setTimeout(() => {
      oscillators.forEach(osc => { try { osc.stop(); } catch { /* already stopped */ } });
      gain.disconnect();
      this.ambientCleanupTimers.delete(cleanupTimer);
    }, 1100);
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
      return { type: "sawtooth", startFrequency: 660, endFrequency: 110, duration: 0.15, gain: 0.04 };
    case "hit":
      return { type: "square", startFrequency: 110, endFrequency: 55, duration: 0.12, gain: 0.05 };
    case "damage":
      return { type: "square", startFrequency: 164, endFrequency: 41, duration: 0.2, gain: 0.06 };
    case "destroyed":
      return { type: "triangle", startFrequency: 55, endFrequency: 20, duration: 0.8, gain: 0.1 };
    case "jump":
      return { type: "sine", startFrequency: 110, endFrequency: 1760, duration: 0.6, gain: 0.04 };
    case "dock":
      return { type: "triangle", startFrequency: 220, endFrequency: 110, duration: 0.4, gain: 0.03 };
    case "tradeOk":
      return { type: "sine", startFrequency: 523, endFrequency: 1046, duration: 0.1, gain: 0.03 };
    case "tradeFail":
      return { type: "square", startFrequency: 110, endFrequency: 82, duration: 0.2, gain: 0.04 };
    case "warning":
      return { type: "square", startFrequency: 440, endFrequency: 220, duration: 0.25, gain: 0.04 };
    case "ui":
      return { type: "sine", startFrequency: 880, endFrequency: 1760, duration: 0.05, gain: 0.02 };
    case "missionAccepted":
      return { type: "sine", startFrequency: 440, endFrequency: 880, duration: 0.3, gain: 0.04, chords: [440, 554, 659] };
    case "missionComplete":
      return { type: "sine", startFrequency: 523, endFrequency: 1046, duration: 0.4, gain: 0.04, chords: [523, 659, 784, 1046] };
    case "missionFailed":
      return { type: "triangle", startFrequency: 220, endFrequency: 110, duration: 0.5, gain: 0.04 };
  }
}
