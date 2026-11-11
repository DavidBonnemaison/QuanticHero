import type { ParticleType } from '../types';

export interface GameEventPayloads {
  'hero:jump': void;
  'hero:duplicate': { count: number };
  'particle:collect': { type: ParticleType };
  'hero:death': { remaining: number };
  'level:complete': { level: number };
}

export type GameEventName = keyof GameEventPayloads;
export type GameEventHandler<T extends GameEventName> = (payload: GameEventPayloads[T]) => void;

export class GameEventBus {
  private listeners: Map<GameEventName, Set<GameEventHandler<any>>> = new Map();

  public on<T extends GameEventName>(event: T, handler: GameEventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
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
    ...args: GameEventPayloads[T] extends void
      ? [event: T]
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
