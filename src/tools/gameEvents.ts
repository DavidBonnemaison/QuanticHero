import type { ParticleType, PlatformPhase } from '../types';

export interface GameEventPayloads {
  'hero:jump': undefined;
  'hero:duplicate': { count: number };
  'particle:collect': { type: ParticleType };
  'hero:death': { remaining: number; entangledCollapse?: boolean };
  'hero:portal_docked': { isBeta: boolean };
  'level:complete': { level: number };
  'phase:shift': { phase: PlatformPhase };
  'tunnel:use': { remaining: number };
  'pauli:blast': { hero1Id: number; hero2Id: number };
  'time:dilation': { active: boolean; durationMs: number };
  'platform:decay': { x: number; y: number };
  'hero:wall_bounce': { x: number; y: number };
  'plate:trigger': { plateId: string; gateId: string };
}

export type GameEventName = keyof GameEventPayloads;
export type GameEventHandler<T extends GameEventName> = (payload: GameEventPayloads[T]) => void;

export class GameEventBus {
  // biome-ignore lint/suspicious/noExplicitAny: generic handler map
  private listeners: Map<GameEventName, Set<GameEventHandler<any>>> = new Map();

  public on<T extends GameEventName>(event: T, handler: GameEventHandler<T>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  public off<T extends GameEventName>(event: T, handler: GameEventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit<T extends GameEventName>(
    ...args: GameEventPayloads[T] extends undefined
      ? [event: T, payload?: undefined]
      : [event: T, payload: GameEventPayloads[T]]
  ): void {
    const [event, payload] = args;
    const handlers = this.listeners.get(event);
    if (handlers) {
      // Create a shallow copy to prevent issues if a handler unregisters during emit
      const copy = Array.from(handlers);
      for (const h of copy) {
        try {
          h(payload);
        } catch (err) {
          console.error(`Error in gameEvent listener for ${event}:`, err);
        }
      }
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const gameEvents = new GameEventBus();
export default gameEvents;
