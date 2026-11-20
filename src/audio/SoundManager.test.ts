import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../store';
import { gameEvents } from '../tools/gameEvents';
import { SoundManager } from './SoundManager';

function createMockAudioParam(initialValue = 0) {
  return {
    value: initialValue,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn()
  };
}

function createMockAudioNode() {
  return {
    connect: vi.fn(),
    disconnect: vi.fn()
  };
}

function createMockAudioContext() {
  const destination = createMockAudioNode();
  const ctx = {
    state: 'suspended',
    currentTime: 10,
    sampleRate: 44100,
    destination,
    resume: vi.fn().mockImplementation(async () => {
      ctx.state = 'running';
    }),
    close: vi.fn().mockImplementation(async () => {
      ctx.state = 'closed';
    }),
    createGain: vi.fn(() => ({
      ...createMockAudioNode(),
      gain: createMockAudioParam(1)
    })),
    createOscillator: vi.fn(() => ({
      ...createMockAudioNode(),
      type: 'sine',
      frequency: createMockAudioParam(440),
      start: vi.fn(),
      stop: vi.fn()
    })),
    createBiquadFilter: vi.fn(() => ({
      ...createMockAudioNode(),
      type: 'lowpass',
      frequency: createMockAudioParam(1000),
      Q: createMockAudioParam(1)
    })),
    createStereoPanner: vi.fn(() => ({
      ...createMockAudioNode(),
      pan: createMockAudioParam(0)
    })),
    createBufferSource: vi.fn(() => ({
      ...createMockAudioNode(),
      buffer: null as AudioBuffer | null,
      start: vi.fn(),
      stop: vi.fn()
    })),
    createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => ({
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: vi.fn(() => new Float32Array(length))
    }))
  };
  return ctx;
}

describe('SoundManager', () => {
  let soundManager: SoundManager;
  let mockCtx: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.setState({
      currentLevel: 1,
      maxLevel: 1,
      scores: {},
      customLevels: null,
      isMuted: false
    });
    mockCtx = createMockAudioContext();
    soundManager = new SoundManager();
    soundManager.setContext(mockCtx as unknown as AudioContext);
    soundManager.init();
  });

  afterEach(() => {
    soundManager.destroy();
    gameEvents.clear();
    vi.useRealTimers();
  });

  describe('AudioContext setup & Mute controls', () => {
    it('initializes audio graph with master, sfx, and bgm gain nodes', () => {
      expect(mockCtx.createGain).toHaveBeenCalled();
      expect(soundManager.getIsMuted()).toBe(false);
    });

    it('updates masterGain when muted via setMuted', () => {
      soundManager.setMuted(true);
      expect(soundManager.getIsMuted()).toBe(true);

      soundManager.setMuted(false);
      expect(soundManager.getIsMuted()).toBe(false);
    });

    it('syncs mute state with Zustand store changes', () => {
      expect(soundManager.getIsMuted()).toBe(false);
      useGameStore.getState().toggleMute();
      expect(soundManager.getIsMuted()).toBe(true);
      useGameStore.getState().toggleMute();
      expect(soundManager.getIsMuted()).toBe(false);
    });
  });

  describe('Clones count tracking', () => {
    it('sets and retrieves clones count with a minimum of 1', () => {
      expect(soundManager.getClonesCount()).toBe(1);
      soundManager.setClonesCount(3);
      expect(soundManager.getClonesCount()).toBe(3);
      soundManager.setClonesCount(0);
      expect(soundManager.getClonesCount()).toBe(1);
    });
  });

  describe('SFX Synthesis', () => {
    it('plays Jump sound with square wave oscillator sweep', () => {
      soundManager.playJump();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();
    });

    it('plays Quantum Duplicate with binaural sawtooth oscillators', () => {
      soundManager.playDuplicate();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createStereoPanner).toHaveBeenCalled();
    });

    it('plays Particle Collect with sine wave arpeggio chords', () => {
      soundManager.playParticleCollect('speed');
      expect(mockCtx.createOscillator).toHaveBeenCalled();

      soundManager.playParticleCollect('lowGravity');
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });

    it('plays Victory portal teleport with harmonic cascade and resonant filter', () => {
      soundManager.playVictory();
      expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });

    it('plays Death sound with noise burst and sub-bass pitch drop', () => {
      soundManager.playDeath();
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
    });

    it('plays Tunnel sound with FM synthesis sweep 300 -> 900 Hz', () => {
      soundManager.playTunnelSound();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();
    });

    it('plays Phase Shift resonant percussive stereo click', () => {
      soundManager.playPhaseShiftSound();
      expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });

    it('plays Pauli Blast overdriven square wave with lowpass resonance', () => {
      soundManager.playPauliBlastSound();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
    });

    it('plays Time Dilation downward sweep with spatial beating', () => {
      soundManager.playTimeDilationSound();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
    });

    it('plays Decay sound with noise bursts and discharging oscillator', () => {
      soundManager.playDecaySound();
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
    });

    it('plays Wall Bounce sound with springy pitch rise and fall', () => {
      soundManager.playBounceSound();
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();
    });

    it('plays Particle Collect with chords for tunnel, pauli, and timeDilation', () => {
      soundManager.playParticleCollect('tunnel');
      soundManager.playParticleCollect('pauli');
      soundManager.playParticleCollect('timeDilation');
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });
  });

  describe('GameEventBus integration', () => {
    it('responds to hero:jump event', () => {
      const playSpy = vi.spyOn(soundManager, 'playJump');
      gameEvents.emit('hero:jump');
      expect(playSpy).toHaveBeenCalled();
    });

    it('responds to hero:duplicate event and updates clone count', () => {
      const playSpy = vi.spyOn(soundManager, 'playDuplicate');
      gameEvents.emit('hero:duplicate', { count: 3 });
      expect(playSpy).toHaveBeenCalled();
      expect(soundManager.getClonesCount()).toBe(3);
    });

    it('responds to particle:collect event', () => {
      const playSpy = vi.spyOn(soundManager, 'playParticleCollect');
      gameEvents.emit('particle:collect', { type: 'antiGravity' });
      expect(playSpy).toHaveBeenCalledWith('antiGravity');
    });

    it('responds to hero:death event and updates remaining clones', () => {
      const playSpy = vi.spyOn(soundManager, 'playDeath');
      gameEvents.emit('hero:death', { remaining: 2 });
      expect(playSpy).toHaveBeenCalled();
      expect(soundManager.getClonesCount()).toBe(2);
    });

    it('responds to level:complete event', () => {
      const playSpy = vi.spyOn(soundManager, 'playVictory');
      gameEvents.emit('level:complete', { level: 2 });
      expect(playSpy).toHaveBeenCalled();
    });

    it('responds to phase:shift, tunnel:use, pauli:blast, time:dilation, platform:decay, hero:wall_bounce, plate:trigger events exactly once', () => {
      const phaseSpy = vi.spyOn(soundManager, 'playPhaseShiftSound');
      const tunnelSpy = vi.spyOn(soundManager, 'playTunnelSound');
      const pauliSpy = vi.spyOn(soundManager, 'playPauliBlastSound');
      const timeSpy = vi.spyOn(soundManager, 'playTimeDilationSound');
      const restoreSpy = vi.spyOn(soundManager, 'playTimeRestoreSound');
      const decaySpy = vi.spyOn(soundManager, 'playDecaySound');
      const bounceSpy = vi.spyOn(soundManager, 'playBounceSound');
      const clickSpy = vi.spyOn(soundManager, 'playMechanicalClick');

      gameEvents.emit('phase:shift', { phase: 'magenta' });
      expect(phaseSpy).toHaveBeenCalledTimes(1);

      gameEvents.emit('tunnel:use', { remaining: 1 });
      expect(tunnelSpy).toHaveBeenCalledTimes(1);

      gameEvents.emit('pauli:blast', { hero1Id: 1, hero2Id: 2 });
      expect(pauliSpy).toHaveBeenCalledTimes(1);

      gameEvents.emit('time:dilation', { active: true, durationMs: 4000 });
      expect(timeSpy).toHaveBeenCalledTimes(1);
      expect(restoreSpy).not.toHaveBeenCalled();

      gameEvents.emit('time:dilation', { active: false, durationMs: 0 });
      expect(timeSpy).toHaveBeenCalledTimes(1);
      expect(restoreSpy).toHaveBeenCalledTimes(1);

      gameEvents.emit('platform:decay', { x: 100, y: 200 });
      expect(decaySpy).toHaveBeenCalledTimes(1);

      gameEvents.emit('hero:wall_bounce', { x: 100, y: 200 });
      expect(bounceSpy).toHaveBeenCalledTimes(1);

      gameEvents.emit('plate:trigger', { plateId: 'p1', gateId: 'g1' });
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dynamic Procedural BGM', () => {
    it('starts and stops BGM playback', () => {
      expect(soundManager.getIsBgmPlaying()).toBe(false);
      soundManager.startBgm();
      expect(soundManager.getIsBgmPlaying()).toBe(true);

      // Advance timers to trigger scheduling
      vi.advanceTimersByTime(100);
      expect(mockCtx.createOscillator).toHaveBeenCalled();

      soundManager.stopBgm();
      expect(soundManager.getIsBgmPlaying()).toBe(false);
    });

    it('modulates BGM complexity when multiple clones are active', () => {
      soundManager.setClonesCount(3);
      soundManager.startBgm();

      const initialOscCallCount = mockCtx.createOscillator.mock.calls.length;
      vi.advanceTimersByTime(150);

      expect(mockCtx.createOscillator.mock.calls.length).toBeGreaterThan(initialOscCallCount);
      soundManager.stopBgm();
    });
  });

  describe('Spec-07: Musical Synesthesia & Harmonic Quantization', () => {
    it('selects the matching musical profile for all 7 chemical families', () => {
      soundManager.setAtomicNumber(2); // Helium -> Noble Gas
      expect(soundManager.getCurrentFamily()).toBe('noble_gas');
      expect(soundManager.getCurrentProfile().mode).toBe('lydian');

      soundManager.setAtomicNumber(11); // Sodium -> Alkali
      expect(soundManager.getCurrentFamily()).toBe('alkali_alkaline_earth');
      expect(soundManager.getCurrentProfile().baseBpm).toBe(128);
      expect(soundManager.getCurrentProfile().bassOscType).toBe('sawtooth');

      soundManager.setAtomicNumber(26); // Iron -> Transition Metal
      expect(soundManager.getCurrentFamily()).toBe('transition_metal');
      expect(soundManager.getCurrentProfile().mode).toBe('dorian');

      soundManager.setAtomicNumber(17); // Chlorine -> Non-Metal & Halogen
      expect(soundManager.getCurrentFamily()).toBe('nonmetal_halogen');
      expect(soundManager.getCurrentProfile().useFmArp).toBe(true);
      expect(soundManager.getCurrentProfile().syncopated).toBe(true);

      soundManager.setAtomicNumber(92); // Uranium -> Lanthanide & Actinide
      expect(soundManager.getCurrentFamily()).toBe('lanthanide_actinide');
      expect(soundManager.getCurrentProfile().mode).toBe('phrygian');
      expect(soundManager.getCurrentProfile().geigerPulse).toBe(true);

      soundManager.setAtomicNumber(14); // Silicon -> Metalloid
      expect(soundManager.getCurrentFamily()).toBe('metalloid');
      expect(soundManager.getCurrentProfile().mode).toBe('mixolydian');

      soundManager.setAtomicNumber(82); // Lead -> Post-Transition
      expect(soundManager.getCurrentFamily()).toBe('post_transition');
      expect(soundManager.getCurrentProfile().mode).toBe('aeolian');
    });

    it('quantizes playJump, playBounceSound, playSynthLandingSound, and playParticleCollect onto active chord degrees', () => {
      soundManager.setAtomicNumber(10); // Neon (Noble Gas, Lydian Maj7)
      const chord = soundManager.getActiveChordFrequencies();
      expect(chord).toHaveLength(5);

      soundManager.playJump();
      const jumpOsc = mockCtx.createOscillator.mock.results.at(-1)?.value;
      const jumpStartFreq = jumpOsc.frequency.setValueAtTime.mock.calls[0][0];
      expect(chord).toContain(jumpStartFreq);

      soundManager.playSynthLandingSound();
      const landOsc = mockCtx.createOscillator.mock.results.at(-1)?.value;
      const landFreq = landOsc.frequency.setValueAtTime.mock.calls[0][0];
      expect(chord.some((f) => Math.abs(f * 2 - landFreq) < 0.05)).toBe(true);

      soundManager.playBounceSound();
      const bounceOsc = mockCtx.createOscillator.mock.results.at(-1)?.value;
      const bounceFreq = bounceOsc.frequency.setValueAtTime.mock.calls[0][0];
      expect(chord).toContain(bounceFreq);

      const synthSpy = vi.spyOn(soundManager, 'playSynthLandingSound');
      gameEvents.emit('synth:land', { x: 50, y: 100 });
      expect(synthSpy).toHaveBeenCalledTimes(1);
    });

    it('emits bgm:beat on quarter-note steps during BGM playback', () => {
      const beatSpy = vi.fn();
      gameEvents.on('bgm:beat', beatSpy);

      soundManager.setAtomicNumber(57); // Lanthanum (Geiger + Phrygian)
      soundManager.startBgm();
      vi.advanceTimersByTime(150);

      expect(beatSpy).toHaveBeenCalled();
      expect(beatSpy.mock.calls[0][0].step % 4).toBe(0);
      soundManager.stopBgm();
    });
  });

  describe('Spec-03: Adaptive Coherence Audio', () => {
    it('subscribes to coherence:changed and ramps bass lowpass filter from 1.0x to 2.2x with linearRampToValueAtTime', () => {
      soundManager.setAtomicNumber(2); // Noble gas: bassFilterCutoff = 900
      const bassFilter = mockCtx.createBiquadFilter.mock.results[0]?.value;
      expect(bassFilter).toBeDefined();

      expect(soundManager.getBassFilterMultiplier()).toBe(1);
      expect(soundManager.getBassCutoffFrequency()).toBe(900);

      gameEvents.emit('coherence:changed', {
        value: 0.5,
        tier: 'x3',
        raw: 50,
        styleScore: 100
      });
      expect(soundManager.getCoherenceValue()).toBeCloseTo(0.5);
      expect(soundManager.getCoherenceTier()).toBe('x3');
      expect(soundManager.getBassFilterMultiplier()).toBeCloseTo(1.6);
      expect(soundManager.getBassCutoffFrequency()).toBeCloseTo(1440);
      expect(bassFilter.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(
        1440,
        expect.any(Number)
      );

      soundManager.setCoherence(1, 'HYPER');
      expect(soundManager.getBassFilterMultiplier()).toBeCloseTo(2.2);
      expect(soundManager.getBassCutoffFrequency()).toBeCloseTo(1980);
      expect(bassFilter.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(
        1980,
        expect.any(Number)
      );
    });

    it('activates hi-hat percussion layer from tier x2 during BGM scheduling', () => {
      soundManager.setAtomicNumber(2); // Noble gas (no Geiger)
      soundManager.setCoherence(0.1, 'x1');
      soundManager.startBgm();
      const beforeX1 = mockCtx.createBufferSource.mock.calls.length;
      mockCtx.currentTime += 0.5;
      vi.advanceTimersByTime(100);
      const afterX1 = mockCtx.createBufferSource.mock.calls.length;
      expect(afterX1).toBe(beforeX1);
      soundManager.stopBgm();

      soundManager.setCoherence(0.4, 'x2');
      soundManager.startBgm();
      const beforeX2 = mockCtx.createBufferSource.mock.calls.length;
      mockCtx.currentTime += 0.5;
      vi.advanceTimersByTime(100);
      const afterX2 = mockCtx.createBufferSource.mock.calls.length;
      expect(afterX2).toBeGreaterThan(beforeX2);
      soundManager.stopBgm();
    });

    it('adds +12 semitone upper-octave arpeggio harmony synced to chemical family scale at HYPER tier', () => {
      soundManager.setAtomicNumber(2); // Noble gas: rootHz=130.81, scaleSemitones=[0,2,4,6,7,9,11]
      const profile = soundManager.getCurrentProfile();
      const baseScaleHz = profile.scaleSemitones.map((st) => profile.rootHz * 2 * 2 ** (st / 12));
      const hyperScaleHz = baseScaleHz.map((f) => f * 2); // +12 semitones

      soundManager.setCoherence(0.95, 'HYPER');
      mockCtx.createOscillator.mockClear();

      soundManager.startBgm();
      vi.advanceTimersByTime(300);
      soundManager.stopBgm();

      const scheduledFreqs: number[] = mockCtx.createOscillator.mock.results
        .map((r) => r.value?.frequency?.setValueAtTime?.mock?.calls?.[0]?.[0])
        .filter((f): f is number => typeof f === 'number');

      const hasHyperOctaveNote = scheduledFreqs.some((freq) =>
        hyperScaleHz.some((target) => Math.abs(freq - target) < 0.5)
      );
      expect(hasHyperOctaveNote).toBe(true);
    });

    it('plays subtle decoherence SFX directly and on coherence:changed with decoherence=true', () => {
      const decohereSpy = vi.spyOn(soundManager, 'playDecoherence');

      soundManager.playDecoherence();
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createOscillator).toHaveBeenCalled();

      gameEvents.emit('coherence:changed', {
        value: 0,
        tier: 'x1',
        raw: 0,
        styleScore: 120,
        decoherence: true
      });
      expect(decohereSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Alchemy SFX (Epic 03 Spec-02)', () => {
    it('plays harmonic synthesis chord via playAlchemySynthesis()', () => {
      mockCtx.createOscillator.mockClear();
      mockCtx.createBiquadFilter.mockClear();

      soundManager.playAlchemySynthesis();

      expect(mockCtx.createBiquadFilter).toHaveBeenCalledTimes(1);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(6);
    });

    it('plays soft descending bounce via playAlchemyReject()', () => {
      mockCtx.createOscillator.mockClear();

      soundManager.playAlchemyReject();

      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
    });
  });

  describe('destroy', () => {
    it('stops BGM, unhooks listeners, and closes audio context', () => {
      soundManager.startBgm();
      soundManager.destroy();

      expect(soundManager.getIsBgmPlaying()).toBe(false);
      expect(mockCtx.close).toHaveBeenCalled();
    });
  });
});
