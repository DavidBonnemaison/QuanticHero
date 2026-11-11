import { useGameStore } from '../store';
import { gameEvents } from './gameEvents';

export type HapticPattern = number | number[] | readonly number[];

export const HAPTIC_PATTERNS = {
  jump: 10,
  duplicate: [25, 40, 35],
  collect: [15, 20, 15],
  death: 70,
  complete: [30, 50, 60, 50, 100]
} as const;

export class HapticFeedback {
  private isEnabled = true;
  private isInitialized = false;
  private unsubStore: (() => void) | null = null;
  private unsubEvents: Array<() => void> = [];

  /**
   * Check if Vibration API is available in the current runtime environment.
   * Returns true only on platforms supporting navigator.vibrate (e.g. Android Chrome).
   */
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    );
  }

  /**
   * Initialize subscriptions to GameEventBus and Zustand store.
   */
  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Sync enabled state from Zustand store
    this.isEnabled = useGameStore.getState().hapticsEnabled ?? true;
    this.unsubStore = useGameStore.subscribe((state) => {
      this.isEnabled = state.hapticsEnabled;
    });

    // Subscribe to gameEvents directly
    this.unsubEvents.push(
      gameEvents.on('hero:jump', () => {
        this.vibrate(HAPTIC_PATTERNS.jump);
      }),
      gameEvents.on('hero:duplicate', () => {
        this.vibrate(HAPTIC_PATTERNS.duplicate);
      }),
      gameEvents.on('particle:collect', () => {
        this.vibrate(HAPTIC_PATTERNS.collect);
      }),
      gameEvents.on('hero:death', () => {
        this.vibrate(HAPTIC_PATTERNS.death);
      }),
      gameEvents.on('level:complete', () => {
        this.vibrate(HAPTIC_PATTERNS.complete);
      })
    );
  }

  /**
   * Returns whether haptic feedback is currently enabled.
   */
  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Enable or disable haptic feedback.
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (useGameStore.getState().hapticsEnabled !== enabled) {
      useGameStore.getState().setHapticsEnabled(enabled);
    }
  }

  /**
   * Safely trigger vibration with graceful fallback if unsupported or permission denied.
   */
  public vibrate(pattern: HapticPattern): boolean {
    if (!this.isEnabled || !this.isSupported()) {
      return false;
    }

    try {
      const p = Array.isArray(pattern) ? [...pattern] : pattern;
      return navigator.vibrate(p as number | number[]);
    } catch {
      // Graceful degradation on permission denied or unsupported environments
      return false;
    }
  }

  /**
   * Direct trigger helpers
   */
  public triggerJump(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.jump);
  }

  public triggerDuplicate(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.duplicate);
  }

  public triggerCollect(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.collect);
  }

  public triggerDeath(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.death);
  }

  public triggerComplete(): boolean {
    return this.vibrate(HAPTIC_PATTERNS.complete);
  }

  /**
   * Clean up all event and store subscriptions.
   */
  public destroy(): void {
    if (this.unsubStore) {
      this.unsubStore();
      this.unsubStore = null;
    }
    this.unsubEvents.forEach((unsub) => unsub());
    this.unsubEvents = [];
    this.isInitialized = false;
  }
}

export const hapticFeedback = new HapticFeedback();
export default hapticFeedback;
