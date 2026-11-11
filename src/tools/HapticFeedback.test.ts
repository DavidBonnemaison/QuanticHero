import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../store';
import { HAPTIC_PATTERNS, HapticFeedback } from './HapticFeedback';
import { gameEvents } from './gameEvents';

describe('HapticFeedback', () => {
  let haptics: HapticFeedback;
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true
    });

    useGameStore.setState({
      hapticsEnabled: true
    });

    haptics = new HapticFeedback();
    haptics.init();
  });

  afterEach(() => {
    haptics.destroy();
    gameEvents.clear();
    vi.restoreAllMocks();
  });

  describe('isSupported', () => {
    it('returns true when navigator.vibrate is available', () => {
      expect(haptics.isSupported()).toBe(true);
    });

    it('returns false when navigator.vibrate is undefined (e.g. iOS or desktop browser)', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        writable: true,
        configurable: true
      });
      expect(haptics.isSupported()).toBe(false);
    });
  });

  describe('vibrate execution', () => {
    it('calls navigator.vibrate with given pattern when enabled', () => {
      const result = haptics.vibrate(HAPTIC_PATTERNS.jump);
      expect(result).toBe(true);
      expect(vibrateMock).toHaveBeenCalledWith(HAPTIC_PATTERNS.jump);
    });

    it('does not call navigator.vibrate and returns false when disabled', () => {
      haptics.setEnabled(false);
      const result = haptics.vibrate(HAPTIC_PATTERNS.jump);
      expect(result).toBe(false);
      expect(vibrateMock).not.toHaveBeenCalled();
    });

    it('returns false gracefully when navigator.vibrate throws an error', () => {
      vibrateMock.mockImplementation(() => {
        throw new Error('User gesture required or permission denied');
      });
      const result = haptics.vibrate(50);
      expect(result).toBe(false);
    });

    it('returns false when vibration API is not supported', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        writable: true,
        configurable: true
      });
      const result = haptics.vibrate(50);
      expect(result).toBe(false);
    });
  });

  describe('gameEvents subscriptions', () => {
    it('triggers subtle jump vibration on hero:jump event', () => {
      gameEvents.emit('hero:jump');
      expect(vibrateMock).toHaveBeenCalledTimes(1);
      expect(vibrateMock).toHaveBeenCalledWith(10);
    });

    it('triggers double impulse pattern on hero:duplicate event', () => {
      gameEvents.emit('hero:duplicate', { count: 2 });
      expect(vibrateMock).toHaveBeenCalledTimes(1);
      expect(vibrateMock).toHaveBeenCalledWith([25, 40, 35]);
    });

    it('triggers progressive pattern on particle:collect event', () => {
      gameEvents.emit('particle:collect', { type: 'speed' });
      expect(vibrateMock).toHaveBeenCalledTimes(1);
      expect(vibrateMock).toHaveBeenCalledWith([15, 20, 15]);
    });

    it('triggers strong shock vibration on hero:death event', () => {
      gameEvents.emit('hero:death', { remaining: 0 });
      expect(vibrateMock).toHaveBeenCalledTimes(1);
      expect(vibrateMock).toHaveBeenCalledWith(70);
    });

    it('triggers victory pattern on level:complete event', () => {
      gameEvents.emit('level:complete', { level: 1 });
      expect(vibrateMock).toHaveBeenCalledTimes(1);
      expect(vibrateMock).toHaveBeenCalledWith([30, 50, 60, 50, 100]);
    });
  });

  describe('direct trigger methods', () => {
    it('triggers helper methods with expected patterns', () => {
      haptics.triggerJump();
      expect(vibrateMock).toHaveBeenCalledWith(10);

      haptics.triggerDuplicate();
      expect(vibrateMock).toHaveBeenCalledWith([25, 40, 35]);

      haptics.triggerCollect();
      expect(vibrateMock).toHaveBeenCalledWith([15, 20, 15]);

      haptics.triggerDeath();
      expect(vibrateMock).toHaveBeenCalledWith(70);

      haptics.triggerComplete();
      expect(vibrateMock).toHaveBeenCalledWith([30, 50, 60, 50, 100]);
    });
  });

  describe('Zustand store integration', () => {
    it('syncs enabled state when store changes', () => {
      expect(haptics.getIsEnabled()).toBe(true);
      useGameStore.getState().setHapticsEnabled(false);
      expect(haptics.getIsEnabled()).toBe(false);

      useGameStore.getState().setHapticsEnabled(true);
      expect(haptics.getIsEnabled()).toBe(true);
    });

    it('updates store state when calling setEnabled', () => {
      haptics.setEnabled(false);
      expect(useGameStore.getState().hapticsEnabled).toBe(false);
      haptics.setEnabled(true);
      expect(useGameStore.getState().hapticsEnabled).toBe(true);
    });
  });

  describe('destroy', () => {
    it('unsubscribes from events when destroyed', () => {
      haptics.destroy();
      gameEvents.emit('hero:jump');
      expect(vibrateMock).not.toHaveBeenCalled();
    });
  });
});
