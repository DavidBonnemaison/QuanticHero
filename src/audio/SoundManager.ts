import { type ChemicalFamily, getChemicalFamily } from '../data/spectroscopy';
import { useGameStore } from '../store';
import { gameEvents } from '../tools/gameEvents';
import type { CoherenceTier, ParticleType } from '../types';

export interface FamilyMusicalProfile {
  family: ChemicalFamily;
  label: string;
  mode:
    | 'lydian'
    | 'acid_minor'
    | 'dorian'
    | 'mixolydian'
    | 'phrygian'
    | 'aeolian'
    | 'pentatonic_syncopated';
  baseBpm: number;
  rootHz: number;
  /** Semitone offsets for scale degrees */
  scaleSemitones: readonly number[];
  /** Chord progression root offsets in semitones (4 bars / 4 beats per 16-step bar) */
  progressionSemitones: readonly [number, number, number, number];
  /** Intervals (in semitones from chord root) for 1st, 3rd, 5th, 7th, 9th */
  chordIntervals: readonly [number, number, number, number, number];
  bassOscType: OscillatorType;
  arpOscType: OscillatorType;
  bassFilterCutoff: number;
  bassFilterQ: number;
  useFmArp: boolean;
  syncopated: boolean;
  geigerPulse: boolean;
}

export const FAMILY_MUSICAL_PROFILES: Record<ChemicalFamily, FamilyMusicalProfile> = {
  noble_gas: {
    family: 'noble_gas',
    label: 'Gaz Nobles (Lydien Maj7)',
    mode: 'lydian',
    baseBpm: 108,
    rootHz: 130.81, // C3
    scaleSemitones: [0, 2, 4, 6, 7, 9, 11],
    progressionSemitones: [0, 7, 5, 2], // I - V - IV - II
    chordIntervals: [0, 4, 7, 11, 14], // Maj7(9)
    bassOscType: 'sine',
    arpOscType: 'triangle',
    bassFilterCutoff: 900,
    bassFilterQ: 1.5,
    useFmArp: false,
    syncopated: false,
    geigerPulse: false
  },
  alkali_alkaline_earth: {
    family: 'alkali_alkaline_earth',
    label: 'Métaux Alcalins & Alcalino-Terreux (Acid 128 BPM)',
    mode: 'acid_minor',
    baseBpm: 128,
    rootHz: 110.0, // A2
    scaleSemitones: [0, 2, 3, 5, 7, 8, 10],
    progressionSemitones: [0, 0, 5, 7], // i - i - iv - v
    chordIntervals: [0, 3, 7, 10, 14], // m7(9)
    bassOscType: 'sawtooth',
    arpOscType: 'sawtooth',
    bassFilterCutoff: 1400,
    bassFilterQ: 8,
    useFmArp: false,
    syncopated: false,
    geigerPulse: false
  },
  transition_metal: {
    family: 'transition_metal',
    label: 'Métaux de Transition (Dorien Synthwave)',
    mode: 'dorian',
    baseBpm: 120,
    rootHz: 146.83, // D3
    scaleSemitones: [0, 2, 3, 5, 7, 9, 10],
    progressionSemitones: [0, 5, 7, 10], // i - IV - v - bVII
    chordIntervals: [0, 3, 7, 10, 14], // m7(9)
    bassOscType: 'triangle',
    arpOscType: 'sawtooth',
    bassFilterCutoff: 1200,
    bassFilterQ: 2.5,
    useFmArp: false,
    syncopated: false,
    geigerPulse: false
  },
  nonmetal_halogen: {
    family: 'nonmetal_halogen',
    label: 'Non-Métaux & Halogènes (FM Syncopé)',
    mode: 'pentatonic_syncopated',
    baseBpm: 124,
    rootHz: 164.81, // E3
    scaleSemitones: [0, 3, 5, 7, 10, 12],
    progressionSemitones: [0, 3, 7, 5],
    chordIntervals: [0, 3, 7, 10, 14],
    bassOscType: 'square',
    arpOscType: 'sine',
    bassFilterCutoff: 1100,
    bassFilterQ: 2,
    useFmArp: true,
    syncopated: true,
    geigerPulse: false
  },
  lanthanide_actinide: {
    family: 'lanthanide_actinide',
    label: 'Lanthanides & Actinides (Phrygien & Geiger)',
    mode: 'phrygian',
    baseBpm: 112,
    rootHz: 87.31, // F2
    scaleSemitones: [0, 1, 3, 5, 7, 8, 10],
    progressionSemitones: [0, 1, 3, 1], // i - bII - bIII - bII
    chordIntervals: [0, 3, 7, 10, 13], // m7(b9)
    bassOscType: 'sine',
    arpOscType: 'triangle',
    bassFilterCutoff: 500,
    bassFilterQ: 3,
    useFmArp: false,
    syncopated: false,
    geigerPulse: true
  },
  metalloid: {
    family: 'metalloid',
    label: 'Métalloïdes (Mixolydien Modulaire)',
    mode: 'mixolydian',
    baseBpm: 116,
    rootHz: 98.0, // G2
    scaleSemitones: [0, 2, 4, 5, 7, 9, 10],
    progressionSemitones: [0, 10, 5, 0], // I - bVII - IV - I
    chordIntervals: [0, 4, 7, 10, 14], // 7(9)
    bassOscType: 'triangle',
    arpOscType: 'square',
    bassFilterCutoff: 1300,
    bassFilterQ: 2,
    useFmArp: false,
    syncopated: false,
    geigerPulse: false
  },
  post_transition: {
    family: 'post_transition',
    label: 'Métaux Post-Transition (Éolien Industriel)',
    mode: 'aeolian',
    baseBpm: 114,
    rootHz: 123.47, // B2
    scaleSemitones: [0, 2, 3, 5, 7, 8, 10],
    progressionSemitones: [0, 8, 5, 7], // i - bVI - iv - v
    chordIntervals: [0, 3, 7, 10, 14],
    bassOscType: 'sawtooth',
    arpOscType: 'triangle',
    bassFilterCutoff: 850,
    bassFilterQ: 2,
    useFmArp: false,
    syncopated: true,
    geigerPulse: false
  }
};

function semitonesToHz(baseHz: number, semitones: number): number {
  return baseHz * 2 ** (semitones / 12);
}

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmBassFilter: BiquadFilterNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private isMuted = false;
  private isBgmPlaying = false;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private currentStep = 0;
  private nextNoteTime = 0;
  private clonesCount = 1;
  private isInitialized = false;

  private atomicNumber = 1;
  private currentFamily: ChemicalFamily = getChemicalFamily(1);
  private activeChordFrequencies: number[] = [];
  private sfxDegreeCursor = 0;

  private coherenceValue = 0;
  private coherenceTier: CoherenceTier = 'x1';

  private unsubStore: (() => void) | null = null;
  private unsubEvents: Array<() => void> = [];

  constructor() {
    this.updateActiveChordFrequencies(0);
  }

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
      gameEvents.on('time:dilation', ({ active }) => {
        if (active) {
          this.playTimeDilationSound();
        } else {
          this.playTimeRestoreSound();
        }
      }),
      gameEvents.on('platform:decay', () => {
        this.playDecaySound();
      }),
      gameEvents.on('hero:wall_bounce', () => {
        this.playBounceSound();
      }),
      gameEvents.on('plate:trigger', () => {
        this.playMechanicalClick();
      }),
      gameEvents.on('synth:land', () => {
        this.playSynthLandingSound();
      }),
      gameEvents.on('platform:plasma_bounce', () => {
        this.playPlasmaChord();
      }),
      gameEvents.on('bell:violation', () => {
        this.playBellViolationChord();
      }),
      gameEvents.on('bubble:harvest', () => {
        this.playBubbleChime();
      }),
      gameEvents.on('hero:dive', () => {
        this.playDiveSound();
      }),
      gameEvents.on('hero:wavedash', () => {
        this.playWaveDashSound();
      }),
      gameEvents.on('coherence:changed', ({ value, tier, decoherence }) => {
        this.setCoherence(value, tier);
        if (decoherence) {
          this.playDecoherence();
        }
      }),
      gameEvents.on('timeloop:tick', ({ remainingMs }) => {
        this.playTimeLoopTick(remainingMs);
      }),
      gameEvents.on('timeloop:rewind', () => {
        this.playTimeLoopRewind();
      })
    );

    // Setup user gesture unlock in browser environments
    if (typeof window !== 'undefined') {
      const unlock = () => {
        const ctx = this.ensureContext();
        if (ctx && ctx.state === 'suspended') {
          ctx
            .resume()
            .then(() => {
              if (this.isBgmPlaying && this.ctx) {
                this.nextNoteTime = Math.max(this.nextNoteTime, this.ctx.currentTime + 0.03);
              }
            })
            .catch(() => {});
        }
        if (this.isBgmPlaying && ctx && !this.bgmTimer) {
          this.nextNoteTime = ctx.currentTime + 0.05;
          this.bgmTimer = setInterval(() => {
            this.scheduleBgmTick();
          }, 35);
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
    this.bgmGain.gain.setValueAtTime(this.getAdaptiveBgmGain(), this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    const profile = FAMILY_MUSICAL_PROFILES[this.currentFamily];
    this.bgmBassFilter = this.ctx.createBiquadFilter();
    this.bgmBassFilter.type = 'lowpass';
    this.bgmBassFilter.Q.setValueAtTime(profile.bassFilterQ, this.ctx.currentTime);
    this.bgmBassFilter.frequency.setValueAtTime(
      this.getBassCutoffFrequency(),
      this.ctx.currentTime
    );
    this.bgmBassFilter.connect(this.bgmGain);

    this.createNoiseBuffer();
  }

  private getAdaptiveBgmGain(): number {
    return Number((0.26 + this.coherenceValue * 0.14).toFixed(4));
  }

  private getTierRank(tier: CoherenceTier): number {
    switch (tier) {
      case 'HYPER':
        return 3;
      case 'x3':
        return 2;
      case 'x2':
        return 1;
      default:
        return 0;
    }
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
   * Returns the adaptive bass lowpass filter cutoff multiplier (1.0 -> 2.2)
   * driven by normalized Quantum Coherence in [0, 1].
   */
  public getBassFilterMultiplier(): number {
    return Number((1.0 + this.coherenceValue * 1.2).toFixed(4));
  }

  public getBassCutoffFrequency(): number {
    const profile = FAMILY_MUSICAL_PROFILES[this.currentFamily];
    return Math.min(
      18000,
      Number((profile.bassFilterCutoff * this.getBassFilterMultiplier()).toFixed(2))
    );
  }

  public setCoherence(value: number, tier: CoherenceTier): void {
    const prevTier = this.coherenceTier;
    const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    this.coherenceValue = clamped;
    this.coherenceTier = tier;

    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.bgmBassFilter) {
        try {
          const targetCutoff = this.getBassCutoffFrequency();
          this.bgmBassFilter.frequency.cancelScheduledValues(now);
          this.bgmBassFilter.frequency.setValueAtTime(this.bgmBassFilter.frequency.value, now);
          this.bgmBassFilter.frequency.linearRampToValueAtTime(targetCutoff, now + 0.08);
        } catch {
          // safe fallback
        }
      }
      if (this.bgmGain) {
        try {
          const targetGain = this.getAdaptiveBgmGain();
          this.bgmGain.gain.cancelScheduledValues(now);
          this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
          this.bgmGain.gain.linearRampToValueAtTime(targetGain, now + 0.1);
        } catch {
          // safe fallback
        }
      }
    }

    if (this.getTierRank(tier) > this.getTierRank(prevTier)) {
      this.playCoherenceTierUp(tier);
    }
  }

  public getCoherenceValue(): number {
    return this.coherenceValue;
  }

  public getCoherenceTier(): CoherenceTier {
    return this.coherenceTier;
  }

  public setAtomicNumber(z: number): void {
    const clampedZ = Math.max(1, Math.min(118, Math.round(z)));
    this.atomicNumber = clampedZ;
    this.currentFamily = getChemicalFamily(clampedZ);
    this.updateActiveChordFrequencies(Math.floor(this.currentStep / 4) % 4);

    if (this.bgmBassFilter && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        const profile = FAMILY_MUSICAL_PROFILES[this.currentFamily];
        this.bgmBassFilter.Q.cancelScheduledValues(now);
        this.bgmBassFilter.Q.setValueAtTime(this.bgmBassFilter.Q.value, now);
        this.bgmBassFilter.Q.linearRampToValueAtTime(profile.bassFilterQ, now + 0.08);

        this.bgmBassFilter.frequency.cancelScheduledValues(now);
        this.bgmBassFilter.frequency.setValueAtTime(this.bgmBassFilter.frequency.value, now);
        this.bgmBassFilter.frequency.linearRampToValueAtTime(
          this.getBassCutoffFrequency(),
          now + 0.08
        );
      } catch {
        // safe fallback
      }
    }
  }

  public getAtomicNumber(): number {
    return this.atomicNumber;
  }

  public getCurrentFamily(): ChemicalFamily {
    return this.currentFamily;
  }

  public getCurrentProfile(): FamilyMusicalProfile {
    return FAMILY_MUSICAL_PROFILES[this.currentFamily];
  }

  public getActiveChordFrequencies(): number[] {
    return [...this.activeChordFrequencies];
  }

  private updateActiveChordFrequencies(chordIndex: number): void {
    const profile = FAMILY_MUSICAL_PROFILES[this.currentFamily];
    const chordRootOffset =
      profile.progressionSemitones[chordIndex % profile.progressionSemitones.length];
    const chordRootHz = semitonesToHz(profile.rootHz, chordRootOffset);
    // 1st, 3rd, 5th, 7th, 9th
    this.activeChordFrequencies = profile.chordIntervals.map((interval) =>
      Number(semitonesToHz(chordRootHz, interval).toFixed(2))
    );
  }

  /**
   * Returns a frequency quantized to the 1st, 3rd, 5th, 7th, or 9th degree
   * of the active BGM chord, shifted by an optional number of octaves.
   */
  public getQuantizedFrequency(degreeIndex?: number, octaveShift = 0): number {
    if (this.activeChordFrequencies.length === 0) {
      this.updateActiveChordFrequencies(0);
    }
    const idx =
      degreeIndex !== undefined
        ? ((degreeIndex % this.activeChordFrequencies.length) +
            this.activeChordFrequencies.length) %
          this.activeChordFrequencies.length
        : this.sfxDegreeCursor++ % this.activeChordFrequencies.length;
    const base = this.activeChordFrequencies[idx] ?? 220;
    return Number((base * 2 ** octaveShift).toFixed(2));
  }

  /**
   * SFX: Jump
   * Balayage de fréquence ascendant quantifié sur l'accord actif de la BGM
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

      const startFreq = this.getQuantizedFrequency(0, 0);
      const endFreq = this.getQuantizedFrequency(2, 1);

      osc.type = 'square';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

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
      // Quantized arpeggio onto the active BGM chord degrees (1st, 3rd, 5th, 7th, 9th)
      let freqs: number[];
      if (type === 'timeDilation') {
        freqs = [
          this.getQuantizedFrequency(4, 1),
          this.getQuantizedFrequency(3, 1),
          this.getQuantizedFrequency(2, 1),
          this.getQuantizedFrequency(0, 1)
        ];
      } else if (type === 'speed' || type === 'antiGravity' || type === 'lowGravity') {
        freqs = [
          this.getQuantizedFrequency(0, 1),
          this.getQuantizedFrequency(1, 1),
          this.getQuantizedFrequency(2, 1),
          this.getQuantizedFrequency(3, 1),
          this.getQuantizedFrequency(4, 1)
        ];
      } else {
        freqs = [
          this.getQuantizedFrequency(0, 1),
          this.getQuantizedFrequency(1, 1),
          this.getQuantizedFrequency(2, 1),
          this.getQuantizedFrequency(0, 2)
        ];
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
   * SFX: Time Dilation Restore
   * Court balayage fréquentiel ascendant de retour au temps normal
   */
  public playTimeRestoreSound(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.24;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + duration);
      filter.Q.setValueAtTime(2, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + duration + 0.01);
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
   * Springy dynamic bounce on neon walls quantized to the active BGM chord
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

      const baseFreq = this.getQuantizedFrequency(undefined, 0);
      const peakFreq = this.getQuantizedFrequency(2, 1);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(peakFreq, now + 0.03);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, now + duration);

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
   * SFX: Synth Platform Landing ("Corde de Synthé")
   * Warm plucked synth string quantized to the active BGM chord degrees (1st, 3rd, 5th, 7th, 9th)
   */
  public playSynthLandingSound(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.18;

      const freq = this.getQuantizedFrequency(undefined, 1);
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.Q.setValueAtTime(3.5, now);
      filter.frequency.setValueAtTime(freq * 4, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(220, freq * 1.2), now + duration);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
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
   * Procedural Synesthetic BGM
   * Driven by the chemical family of the current atomic number Z
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
    if (this.nextNoteTime < this.ctx.currentTime - 2.0) {
      this.nextNoteTime = this.ctx.currentTime + 0.02;
    }

    const profile = FAMILY_MUSICAL_PROFILES[this.currentFamily];
    // Tempo scales slightly when clones are present around the family base BPM
    const cloneBoost = this.clonesCount >= 3 ? 14 : this.clonesCount >= 2 ? 7 : 0;
    const bpm = profile.baseBpm + cloneBoost;
    const stepDuration = 60 / (bpm * 4); // 16th note duration

    while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleStep(this.nextNoteTime, this.currentStep, stepDuration, bpm);
      this.nextNoteTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 16;
    }
  }

  private scheduleStep(time: number, step: number, stepDuration: number, bpm = 118): void {
    if (!this.ctx || !this.bgmGain) return;

    const profile = FAMILY_MUSICAL_PROFILES[this.currentFamily];
    const chordIndex = Math.floor(step / 4) % profile.progressionSemitones.length;
    this.updateActiveChordFrequencies(chordIndex);

    if (step % 4 === 0) {
      gameEvents.emit('bgm:beat', { step, bpm });
    }

    const tierRank = this.getTierRank(this.coherenceTier);

    // 1. Bassline (with family-specific oscillator & adaptive coherence lowpass filter)
    const chordOffset = profile.progressionSemitones[chordIndex];
    const bassNote = semitonesToHz(profile.rootHz / 2, chordOffset);
    const shouldPlayBass =
      step % 4 === 0 ||
      ((this.clonesCount >= 2 || tierRank >= 1) && step % 4 === 2) ||
      (profile.family === 'alkali_alkaline_earth' && (step === 6 || step === 14));

    if (shouldPlayBass) {
      try {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = profile.bassOscType;
        bassOsc.frequency.setValueAtTime(bassNote, time);

        const bassDur = stepDuration * 1.65;
        const bassPeak = 0.22 + this.coherenceValue * 0.08;
        bassGain.gain.setValueAtTime(0.001, time);
        bassGain.gain.linearRampToValueAtTime(bassPeak, time + 0.01);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + bassDur);

        if (this.bgmBassFilter) {
          bassOsc.connect(bassGain);
          bassGain.connect(this.bgmBassFilter);
        } else {
          const bassFilter = this.ctx.createBiquadFilter();
          bassFilter.type = 'lowpass';
          bassFilter.Q.setValueAtTime(profile.bassFilterQ, time);
          bassFilter.frequency.setValueAtTime(profile.bassFilterCutoff, time);
          bassFilter.frequency.linearRampToValueAtTime(this.getBassCutoffFrequency(), time + 0.02);
          bassOsc.connect(bassFilter);
          bassFilter.connect(bassGain);
          bassGain.connect(this.bgmGain);
        }

        bassOsc.start(time);
        bassOsc.stop(time + bassDur + 0.01);
      } catch {
        // safe
      }
    }

    // 1b. Driving rhythmic kick/pulse on quarter-notes from tier x2+
    if (tierRank >= 1 && step % 4 === 0) {
      try {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(125, time);
        kickOsc.frequency.exponentialRampToValueAtTime(42, time + 0.085);

        const kickPeak = tierRank >= 3 ? 0.2 : tierRank >= 2 ? 0.16 : 0.12;
        kickGain.gain.setValueAtTime(0.001, time);
        kickGain.gain.linearRampToValueAtTime(kickPeak, time + 0.004);
        kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.095);

        kickOsc.connect(kickGain);
        kickGain.connect(this.bgmGain);
        kickOsc.start(time);
        kickOsc.stop(time + 0.1);
      } catch {
        // safe
      }
    }

    // 2. Arpeggiator (mode-accurate scale & family timbre)
    const scaleNotes = profile.scaleSemitones.map((st) => semitonesToHz(profile.rootHz * 2, st));
    const shouldPlayArp = profile.syncopated
      ? step % 3 === 0 || ((this.clonesCount > 1 || tierRank >= 2) && step % 2 === 1)
      : this.clonesCount > 1 || tierRank >= 2
        ? true
        : step % 2 === 0;

    if (shouldPlayArp && scaleNotes.length > 0) {
      try {
        let noteIndex = (step * 2 + (this.clonesCount - 1)) % scaleNotes.length;
        if ((this.clonesCount >= 3 || tierRank >= 2) && step % 4 === 3) {
          noteIndex = (noteIndex + 3) % scaleNotes.length;
        }
        const freq = scaleNotes[noteIndex];

        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();

        arpOsc.type = this.clonesCount >= 2 ? 'square' : profile.arpOscType;
        arpOsc.frequency.setValueAtTime(freq, time);

        let modOsc: OscillatorNode | null = null;
        if (profile.useFmArp) {
          modOsc = this.ctx.createOscillator();
          const modGain = this.ctx.createGain();
          modOsc.type = 'sine';
          modOsc.frequency.setValueAtTime(freq * 2, time);
          modGain.gain.setValueAtTime(freq * 0.45, time);
          modOsc.connect(modGain);
          modGain.connect(arpOsc.frequency);
        }

        const arpFilter = this.ctx.createBiquadFilter();
        arpFilter.type = 'lowpass';
        const baseArpCutoff = this.clonesCount >= 2 ? 2100 : 1500;
        arpFilter.frequency.setValueAtTime(baseArpCutoff + this.coherenceValue * 1600, time);

        const arpDur = stepDuration * 0.85;
        const peakGain = (this.clonesCount >= 2 ? 0.095 : 0.075) + this.coherenceValue * 0.035;

        arpGain.gain.setValueAtTime(0.001, time);
        arpGain.gain.linearRampToValueAtTime(peakGain, time + 0.005);
        arpGain.gain.exponentialRampToValueAtTime(0.001, time + arpDur);

        arpOsc.connect(arpFilter);
        arpFilter.connect(arpGain);
        arpGain.connect(this.bgmGain);

        if (modOsc) {
          modOsc.start(time);
          modOsc.stop(time + arpDur + 0.01);
        }
        arpOsc.start(time);
        arpOsc.stop(time + arpDur + 0.01);

        // 2b. HYPER tier: bright upper-octave (+12 semitones) harmonic arpeggio synced to family scale
        if (this.coherenceTier === 'HYPER') {
          const hyperFreq = semitonesToHz(freq, 12);
          const hyperOsc = this.ctx.createOscillator();
          const hyperGain = this.ctx.createGain();
          hyperOsc.type = 'triangle';
          hyperOsc.frequency.setValueAtTime(hyperFreq, time);

          hyperGain.gain.setValueAtTime(0.001, time);
          hyperGain.gain.linearRampToValueAtTime(0.11, time + 0.006);
          hyperGain.gain.exponentialRampToValueAtTime(0.001, time + arpDur);

          hyperOsc.connect(hyperGain);
          hyperGain.connect(this.bgmGain);

          hyperOsc.start(time);
          hyperOsc.stop(time + arpDur + 0.01);
        }
      } catch {
        // safe
      }
    }

    // 2c. Rich harmonic chord layer in x3 and HYPER tiers on beat accents
    if (tierRank >= 2 && step % 4 === 0 && this.activeChordFrequencies.length >= 3) {
      try {
        const chordDegrees = [this.activeChordFrequencies[1], this.activeChordFrequencies[2]];
        const padDur = stepDuration * 2.2;
        const padPeak = tierRank >= 3 ? 0.065 : 0.048;
        for (const chordFreq of chordDegrees) {
          const padOsc = this.ctx.createOscillator();
          const padGain = this.ctx.createGain();
          padOsc.type = 'triangle';
          padOsc.frequency.setValueAtTime(chordFreq * 2, time);

          padGain.gain.setValueAtTime(0.001, time);
          padGain.gain.linearRampToValueAtTime(padPeak, time + 0.015);
          padGain.gain.exponentialRampToValueAtTime(0.001, time + padDur);

          padOsc.connect(padGain);
          padGain.connect(this.bgmGain);
          padOsc.start(time);
          padOsc.stop(time + padDur + 0.01);
        }
      } catch {
        // safe
      }
    }

    // 3. Adaptive Coherence Hi-Hat / synthetic percussion layer (tier x2 and above)
    if (tierRank >= 1 && step % 2 === 1 && this.noiseBuffer) {
      try {
        const hiHatSource = this.ctx.createBufferSource();
        hiHatSource.buffer = this.noiseBuffer;

        const hiHatFilter = this.ctx.createBiquadFilter();
        hiHatFilter.type = 'highpass';
        hiHatFilter.frequency.setValueAtTime(6500, time);

        const hiHatGain = this.ctx.createGain();
        const isAccent = step % 4 === 3;
        const basePeak = tierRank >= 3 ? 0.11 : tierRank >= 2 ? 0.085 : 0.06;
        const peak = isAccent ? basePeak * 1.25 : basePeak;
        const hatDur = isAccent ? 0.05 : 0.032;

        hiHatGain.gain.setValueAtTime(0.001, time);
        hiHatGain.gain.linearRampToValueAtTime(peak, time + 0.003);
        hiHatGain.gain.exponentialRampToValueAtTime(0.001, time + hatDur);

        hiHatSource.connect(hiHatFilter);
        hiHatFilter.connect(hiHatGain);
        hiHatGain.connect(this.bgmGain);

        hiHatSource.start(time);
        hiHatSource.stop(time + hatDur + 0.005);
      } catch {
        // safe
      }
    }

    // 4. Rhythmic Geiger micro-pulsations for radioactive Lanthanides & Actinides (Z >= 57)
    if (profile.geigerPulse && (step % 4 === 1 || step % 7 === 0)) {
      try {
        const geigerOsc = this.ctx.createOscillator();
        const geigerGain = this.ctx.createGain();
        geigerOsc.type = 'square';
        geigerOsc.frequency.setValueAtTime(3200, time);
        geigerOsc.frequency.exponentialRampToValueAtTime(900, time + 0.015);

        geigerGain.gain.setValueAtTime(0.001, time);
        geigerGain.gain.linearRampToValueAtTime(0.04, time + 0.002);
        geigerGain.gain.exponentialRampToValueAtTime(0.001, time + 0.018);

        geigerOsc.connect(geigerGain);
        geigerGain.connect(this.bgmGain);

        geigerOsc.start(time);
        geigerOsc.stop(time + 0.02);
      } catch {
        // safe
      }
    }
  }

  /**
   * SFX: Ascending musical stinger when crossing into a higher coherence tier (x2, x3, HYPER).
   */
  public playCoherenceTierUp(tier: CoherenceTier): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const notes =
        tier === 'HYPER'
          ? [
              this.getQuantizedFrequency(0, 1),
              this.getQuantizedFrequency(2, 1),
              this.getQuantizedFrequency(4, 1),
              this.getQuantizedFrequency(0, 2)
            ]
          : tier === 'x3'
            ? [
                this.getQuantizedFrequency(0, 1),
                this.getQuantizedFrequency(1, 1),
                this.getQuantizedFrequency(2, 1)
              ]
            : [this.getQuantizedFrequency(0, 1), this.getQuantizedFrequency(2, 1)];

      const spacing = 0.045;
      notes.forEach((freq, idx) => {
        const start = now + idx * spacing;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = tier === 'HYPER' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, start);

        const peak = tier === 'HYPER' ? 0.24 : 0.18;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(peak, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(start);
        osc.stop(start + 0.2);
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Gravitational Dive (punchy downward whoosh)
   */
  public playDiveSound(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.15;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + duration);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + duration + 0.01);

      if (this.noiseBuffer) {
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1600, now);
        bp.frequency.exponentialRampToValueAtTime(400, now + duration);
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.001, now);
        nGain.gain.linearRampToValueAtTime(0.16, now + 0.01);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        noise.connect(bp);
        bp.connect(nGain);
        nGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + duration + 0.01);
      }
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Quantum Wave-Dash (energetic rebound impulse on landing jump)
   */
  public playWaveDashSound(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.16;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      const root = this.getQuantizedFrequency(0, 1);
      const fifth = this.getQuantizedFrequency(2, 1);
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(root * 0.75, now);
      osc1.frequency.exponentialRampToValueAtTime(fifth * 1.5, now + duration);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(root, now);
      osc2.frequency.exponentialRampToValueAtTime(fifth * 2, now + duration);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(gain);
      osc2.connect(gain);
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
   * SFX: Quantum Decoherence
   * Subtle downward filtered shimmer & soft noise release when coherence drops to 0 on death.
   */
  public playDecoherence(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.22;

      if (this.noiseBuffer) {
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(4, now);
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.linearRampToValueAtTime(260, now + duration);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.001, now);
        noiseGain.gain.linearRampToValueAtTime(0.11, now + 0.015);
        noiseGain.gain.linearRampToValueAtTime(0.001, now + duration);

        noiseSource.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noiseSource.start(now);
        noiseSource.stop(now + duration + 0.01);
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(110, now + duration);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.012);
      gain.gain.linearRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Plasma Trampoline Bounce (bright shimmering synth chord)
   */
  public playPlasmaChord(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const freqs = [
        this.getQuantizedFrequency(0, 1),
        this.getQuantizedFrequency(2, 1),
        this.getQuantizedFrequency(4, 1),
        this.getQuantizedFrequency(0, 2)
      ];
      for (const freq of freqs) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.03, now + 0.18);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.16, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Bell Inequality Violation (Celestial golden harmonic chord)
   */
  public playBellViolationChord(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      // Celestial Lydian/Maj9 harmonic chord
      const freqs = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
      freqs.forEach((freq, idx) => {
        const start = now + idx * 0.035;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.65);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(start);
        osc.stop(start + 0.68);
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Crystalline bubble convergence chime
   */
  public playBubbleChime(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const freqs = [1046.5, 1318.51, 1567.98, 2093.0];
      freqs.forEach((freq, idx) => {
        const start = now + idx * 0.03;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(start);
        osc.stop(start + 0.24);
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Alchemy Covalent Synthesis (Harmonic crystalline chord + resonant sweep)
   */
  public playAlchemySynthesis(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const duration = 0.5;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(3.5, now);
      filter.frequency.setValueAtTime(420, now);
      filter.frequency.exponentialRampToValueAtTime(5200, now + duration);
      filter.connect(this.sfxGain);

      // Luminous Lydian/Maj9 arpeggio chord
      const freqs = [392.0, 493.88, 587.33, 739.99, 880.0, 1174.66];
      freqs.forEach((freq, idx) => {
        const start = now + idx * 0.04;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.19, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);

        osc.connect(gain);
        gain.connect(filter);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Alchemy Reject (Soft elastic descending bounce when no stable bond exists)
   */
  public playAlchemyReject(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const notes: ReadonlyArray<{ start: number; from: number; to: number; dur: number }> = [
        { start: 0, from: 280, to: 210, dur: 0.085 },
        { start: 0.075, from: 215, to: 155, dur: 0.11 }
      ];

      for (const note of notes) {
        const t = now + note.start;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.from, t);
        osc.frequency.exponentialRampToValueAtTime(note.to, t + note.dur);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.16, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + note.dur + 0.01);
      }
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Chrono-Loop subtle clockwork tick in the final second of a cycle
   */
  public playTimeLoopTick(remainingMs = 500): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const urgency = Math.max(0, Math.min(1, 1 - remainingMs / 1000));
      const freq = 980 + urgency * 420;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + 0.045);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11 + urgency * 0.06, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.055);
    } catch {
      // safe fallback
    }
  }

  /**
   * SFX: Chrono-Loop temporal rewind sweep when freezing a run into an EchoHero
   */
  public playTimeLoopRewind(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      const sweep = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweep.type = 'sawtooth';
      sweep.frequency.setValueAtTime(220, now);
      sweep.frequency.exponentialRampToValueAtTime(880, now + 0.14);
      sweep.frequency.exponentialRampToValueAtTime(440, now + 0.22);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(3.0, now);
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(2200, now + 0.16);

      sweepGain.gain.setValueAtTime(0.001, now);
      sweepGain.gain.linearRampToValueAtTime(0.14, now + 0.02);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

      sweep.connect(filter);
      filter.connect(sweepGain);
      sweepGain.connect(this.sfxGain);
      sweep.start(now);
      sweep.stop(now + 0.24);

      // Subtle harmonic lock-in chime
      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(1046.5, now + 0.09);
      chimeGain.gain.setValueAtTime(0.001, now + 0.09);
      chimeGain.gain.linearRampToValueAtTime(0.1, now + 0.11);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      chime.connect(chimeGain);
      chimeGain.connect(this.sfxGain);
      chime.start(now + 0.09);
      chime.stop(now + 0.27);
    } catch {
      // safe fallback
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
    this.bgmBassFilter = null;
    this.coherenceValue = 0;
    this.coherenceTier = 'x1';
    this.isInitialized = false;
  }
}

export const soundManager = new SoundManager();
export default soundManager;
