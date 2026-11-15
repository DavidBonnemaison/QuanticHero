import { useGameStore } from '../store';
import { gameEvents } from '../tools/gameEvents';
import type { ParticleType } from '../types';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private isMuted = false;
  private isBgmPlaying = false;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private currentStep = 0;
  private nextNoteTime = 0;
  private clonesCount = 1;
  private isInitialized = false;

  private unsubStore: (() => void) | null = null;
  private unsubEvents: Array<() => void> = [];

  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen for mute state changes from zustand store
    this.isMuted = useGameStore.getState().isMuted;
    this.unsubStore = useGameStore.subscribe((state) => {
      this.setMuted(state.isMuted);
    });

    // Subscribe to gameEvents
    this.unsubEvents.push(
      gameEvents.on('hero:jump', () => this.playJump()),
      gameEvents.on('hero:duplicate', ({ count }) => {
        this.setClonesCount(count);
        this.playDuplicate();
      }),
      gameEvents.on('particle:collect', ({ type }) => {
        this.playParticleCollect(type);
      }),
      gameEvents.on('hero:death', ({ remaining }) => {
        this.setClonesCount(remaining);
        this.playDeath();
      }),
      gameEvents.on('level:complete', () => {
        this.playVictory();
      }),
      gameEvents.on('phase:shift', () => {
        this.playPhaseShiftSound();
      }),
      gameEvents.on('tunnel:use', () => {
        this.playTunnelSound();
      }),
      gameEvents.on('pauli:blast', () => {
        this.playPauliBlastSound();
      }),
      gameEvents.on('time:dilation', () => {
        this.playTimeDilationSound();
      }),
      gameEvents.on('platform:decay', () => {
        this.playDecaySound();
      }),
      gameEvents.on('hero:wall_bounce', () => {
        this.playBounceSound();
      }),
      gameEvents.on('plate:trigger', () => {
        this.playMechanicalClick();
      })
    );

    // Setup user gesture unlock in browser environments
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.ensureContext();
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    }
  }

  public ensureContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        try {
          this.ctx = new AudioCtxClass();
          this.setupAudioGraph();
        } catch {
          this.ctx = null;
        }
      }
    }
    return this.ctx;
  }

  public setContext(ctx: AudioContext | null): void {
    this.ctx = ctx;
    if (ctx) {
      this.setupAudioGraph();
    }
  }

  private setupAudioGraph(): void {
    if (!this.ctx) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(1, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    this.createNoiseBuffer();
  }

  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.5; // 0.5s noise
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    } catch {
      this.noiseBuffer = null;
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.4, now, 0.02);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setClonesCount(count: number): void {
    this.clonesCount = Math.max(1, count);
  }

  public getClonesCount(): number {
    return this.clonesCount;
  }

  /**
   * SFX: Jump
   * Balayage de fréquence ascendant en onde carrée (triangle/square, 150 Hz -> 450 Hz en 120 ms)
   */
  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.12);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Quantum Duplicate
   * Balayage en dents de scie stéréo déphasé (créant un effet d'interférence binaurale)
   */
  public playDuplicate(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.22;

      // Channel 1: Left panned
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(220, now);
      osc1.frequency.exponentialRampToValueAtTime(550, now + duration);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Channel 2: Right panned + slightly detuned (binaural beating)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(226, now); // ~6Hz detune for phase beating
      osc2.frequency.exponentialRampToValueAtTime(562, now + duration);

      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Stereo panning if supported, otherwise direct connection
      if (typeof ctx.createStereoPanner === 'function') {
        const panLeft = ctx.createStereoPanner();
        panLeft.pan.setValueAtTime(-0.7, now);
        osc1.connect(gain1);
        gain1.connect(panLeft);
        panLeft.connect(this.sfxGain);

        const panRight = ctx.createStereoPanner();
        panRight.pan.setValueAtTime(0.7, now);
        osc2.connect(gain2);
        gain2.connect(panRight);
        panRight.connect(this.sfxGain);
      } else {
        osc1.connect(gain1);
        gain1.connect(this.sfxGain);
        osc2.connect(gain2);
        gain2.connect(this.sfxGain);
      }

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.01);
      osc2.stop(now + duration + 0.01);
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Particle Collect (Speed, Low Gravity, Anti-Gravity, Duplicate)
   * Arpège montant cristallin éclatant en ondes harmoniques (200 ms audible et gratifiant)
   */
  public playParticleCollect(type?: ParticleType): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      // Bright musical chords with distinct character per power-up
      let freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Default / Duplicate)
      if (type === 'speed') {
        freqs = [659.25, 830.61, 987.77, 1318.51, 1567.98]; // E5, G#5, B5, E6, G6
      } else if (type === 'antiGravity') {
        freqs = [587.33, 739.99, 880.0, 1174.66, 1479.98]; // D5, F#5, A5, D6, F#6
      } else if (type === 'lowGravity') {
        freqs = [440.0, 554.37, 659.25, 880.0, 1108.73]; // A4, C#5, E5, A5, C#6
      } else if (type === 'tunnel') {
        freqs = [329.63, 440.0, 659.25, 880.0]; // E4, A4, E5, A5
      } else if (type === 'pauli') {
        freqs = [392.0, 587.33, 783.99, 1174.66]; // G4, D5, G5, D6
      } else if (type === 'timeDilation') {
        freqs = [783.99, 659.25, 523.25, 392.0]; // G5, E5, C5, G4 descending
      }

      const noteDuration = 0.045;
      freqs.forEach((freq, idx) => {
        const noteStart = now + idx * noteDuration;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.32, noteStart + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration + 0.06);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(noteStart);
        osc.stop(noteStart + noteDuration + 0.07);
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Portal Teleport (Victory)
   * Cascade harmonique ascendante avec filtre passe-bas résonant
   */
  public playVictory(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.45;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(5, now);
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(4500, now + duration);
      filter.connect(this.sfxGain);

      // Cascade of harmonic notes
      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760];
      const step = duration / notes.length;

      notes.forEach((freq, i) => {
        const noteStart = now + i * step;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.2, noteStart + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + step * 1.5);

        osc.connect(gain);
        gain.connect(filter);

        osc.start(noteStart);
        osc.stop(noteStart + step * 1.6);
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Death (Collision)
   * Bruit blanc filtré (white noise burst) avec modulation d'amplitude descendante
   */
  public playDeath(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.28;

      // 1. Noise burst with sweeping lowpass filter
      if (this.noiseBuffer) {
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(60, now + duration);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.001, now);
        noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.005);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noiseSource.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noiseSource.start(now);
        noiseSource.stop(now + duration + 0.01);
      }

      // 2. Sub-bass punch (pitch drop 130 -> 30 Hz)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(130, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + duration);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);

      subOsc.start(now);
      subOsc.stop(now + duration + 0.01);
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Quantum Tunneling
   * Balayage FM sinusoïdal montant (300 Hz -> 900 Hz)
   */
  public playTunnelSound(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.24;

      const carrier = ctx.createOscillator();
      const carrierGain = ctx.createGain();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(300, now);
      carrier.frequency.exponentialRampToValueAtTime(900, now + duration);

      // FM modulator
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(75, now);
      modulator.frequency.exponentialRampToValueAtTime(150, now + duration);
      modGain.gain.setValueAtTime(120, now);
      modGain.gain.linearRampToValueAtTime(10, now + duration);

      modulator.connect(carrier.frequency);

      carrierGain.gain.setValueAtTime(0.001, now);
      carrierGain.gain.linearRampToValueAtTime(0.28, now + 0.01);
      carrierGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      carrier.connect(carrierGain);
      carrierGain.connect(this.sfxGain);

      modulator.start(now);
      carrier.start(now);
      modulator.stop(now + duration + 0.01);
      carrier.stop(now + duration + 0.01);
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Phase Shift
   * Clic résonant percutant stéréo
   */
  public playPhaseShiftSound(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.06;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.Q.setValueAtTime(8, now);
      filter.connect(this.sfxGain);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(2800, now + duration);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Pauli Blast
   * Onde carrée surchargée avec filtre résonant passe-bas percutant
   */
  public playPauliBlastSound(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.3;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(10, now);
      filter.frequency.setValueAtTime(2800, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + duration);
      filter.connect(this.sfxGain);

      // Overdriven square wave
      const sqOsc = ctx.createOscillator();
      const sqGain = ctx.createGain();
      sqOsc.type = 'square';
      sqOsc.frequency.setValueAtTime(220, now);
      sqOsc.frequency.exponentialRampToValueAtTime(60, now + duration);

      sqGain.gain.setValueAtTime(0.001, now);
      sqGain.gain.linearRampToValueAtTime(0.35, now + 0.005);
      sqGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      sqOsc.connect(sqGain);
      sqGain.connect(filter);

      // Kinetic sub-bass kick
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(150, now);
      subOsc.frequency.exponentialRampToValueAtTime(35, now + duration);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.3, now + 0.006);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);

      sqOsc.start(now);
      subOsc.start(now);
      sqOsc.stop(now + duration + 0.01);
      subOsc.stop(now + duration + 0.01);
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Time Dilation
   * Balayage descendant avec résonance spatiale
   */
  public playTimeDilationSound(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.52;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      // Pitch sweep downward
      osc1.frequency.setValueAtTime(780, now);
      osc1.frequency.exponentialRampToValueAtTime(170, now + duration);

      // Detuned pair for spatial beating
      osc2.frequency.setValueAtTime(784, now);
      osc2.frequency.exponentialRampToValueAtTime(172, now + duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + duration);
      filter.Q.setValueAtTime(4, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.01);
      osc2.stop(now + duration + 0.01);
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Half-life decay
   * Grésillement de désintégration Geiger / court-circuit
   */
  public playDecaySound(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.25;

      // Noise crackle bursts
      if (this.noiseBuffer) {
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(2500, now);
        bandpass.Q.setValueAtTime(6, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.001, now);
        noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.008);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noiseSource.connect(bandpass);
        bandpass.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noiseSource.start(now);
        noiseSource.stop(now + duration + 0.01);
      }

      // Decaying discharge tone
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + duration);

      oscGain.gain.setValueAtTime(0.001, now);
      oscGain.gain.linearRampToValueAtTime(0.18, now + 0.01);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Wall Rebound
   * Springy dynamic bounce on neon walls
   */
  public playBounceSound(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.1;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(360, now + 0.03);
      osc.frequency.exponentialRampToValueAtTime(130, now + duration);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Mechanical Pressure Plate & Gate Click
   * Crisp, metallic contact latch click
   */
  public playMechanicalClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // safe fallback
    }
  }

  /**
   * Procedural Ambient Chiptune BGM
   * Bassline + Arpeggiator with dynamic clone modulation
   */
  public startBgm(): void {
    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    this.nextNoteTime = ctx.currentTime + 0.05;
    this.currentStep = 0;

    // Scheduler tick every 35ms
    this.bgmTimer = setInterval(() => {
      this.scheduleBgmTick();
    }, 35);
  }

  public stopBgm(): void {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  public getIsBgmPlaying(): boolean {
    return this.isBgmPlaying;
  }

  private scheduleBgmTick(): void {
    if (!this.ctx || !this.bgmGain || !this.isBgmPlaying) return;

    const scheduleAheadTime = 0.12;
    // Tempo scales slightly when clones are present
    const bpm = this.clonesCount >= 3 ? 134 : this.clonesCount >= 2 ? 126 : 118;
    const stepDuration = 60 / (bpm * 4); // 16th note duration

    while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleStep(this.nextNoteTime, this.currentStep, stepDuration);
      this.nextNoteTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 16;
    }
  }

  private scheduleStep(time: number, step: number, stepDuration: number): void {
    if (!this.ctx || !this.bgmGain) return;

    // 1. Bassline (plays on beats 0, 4, 8, 12, with occasional syncopations)
    // A minor progression: A -> F -> D -> E
    const bassScale = [55, 43.65, 73.42, 82.41]; // A1, F1, D2, E2
    const bassNote = bassScale[Math.floor(step / 4) % bassScale.length];

    if (step % 4 === 0 || (this.clonesCount >= 2 && step % 4 === 2)) {
      try {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassNote, time);

        const bassDur = stepDuration * 1.6;
        bassGain.gain.setValueAtTime(0.001, time);
        bassGain.gain.linearRampToValueAtTime(0.18, time + 0.01);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + bassDur);

        bassOsc.connect(bassGain);
        bassGain.connect(this.bgmGain);

        bassOsc.start(time);
        bassOsc.stop(time + bassDur + 0.01);
      } catch {
        // safe
      }
    }

    // 2. Arpeggiator (retro synth pattern)
    // Scale: A minor / Pentatonic [A3, C4, E4, G4, A4, C5, E5, G5]
    const arpNotes = [220, 261.63, 329.63, 392.0, 440, 523.25, 659.25, 783.99];

    // With 1 clone: plays on even steps (8th notes).
    // With 2+ clones: plays on all 16th steps.
    const shouldPlayArp = this.clonesCount > 1 ? true : step % 2 === 0;

    if (shouldPlayArp) {
      try {
        // Select note based on step & clone intensity
        let noteIndex = (step * 2 + (this.clonesCount - 1)) % arpNotes.length;
        if (this.clonesCount >= 3 && step % 4 === 3) {
          noteIndex = (noteIndex + 3) % arpNotes.length;
        }
        const freq = arpNotes[noteIndex];

        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();

        // More aggressive chiptune wave if multiple clones
        arpOsc.type = this.clonesCount >= 2 ? 'square' : 'sine';
        arpOsc.frequency.setValueAtTime(freq, time);

        // Lowpass filter on square to give sweet retro 8-bit aesthetic
        const arpFilter = this.ctx.createBiquadFilter();
        arpFilter.type = 'lowpass';
        arpFilter.frequency.setValueAtTime(this.clonesCount >= 2 ? 1800 : 1200, time);

        const arpDur = stepDuration * 0.85;
        const peakGain = this.clonesCount >= 2 ? 0.08 : 0.06;

        arpGain.gain.setValueAtTime(0.001, time);
        arpGain.gain.linearRampToValueAtTime(peakGain, time + 0.005);
        arpGain.gain.exponentialRampToValueAtTime(0.001, time + arpDur);

        arpOsc.connect(arpFilter);
        arpFilter.connect(arpGain);
        arpGain.connect(this.bgmGain);

        arpOsc.start(time);
        arpOsc.stop(time + arpDur + 0.01);
      } catch {
        // safe
      }
    }
  }

  public destroy(): void {
    this.stopBgm();
    if (this.unsubStore) {
      this.unsubStore();
      this.unsubStore = null;
    }
    this.unsubEvents.forEach((unsub) => unsub());
    this.unsubEvents = [];
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close().catch(() => {});
      } catch {
        // safe
      }
    }
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.isInitialized = false;
  }
}

export const soundManager = new SoundManager();
export default soundManager;
