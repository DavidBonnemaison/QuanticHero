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

  describe('destroy', () => {
    it('stops BGM, unhooks listeners, and closes audio context', () => {
      soundManager.startBgm();
      soundManager.destroy();

      expect(soundManager.getIsBgmPlaying()).toBe(false);
      expect(mockCtx.close).toHaveBeenCalled();
    });
  });
});
