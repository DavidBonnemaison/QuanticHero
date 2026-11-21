import type { CoherenceTier, ParticleType, PlatformPhase } from '../types';

export interface GameEventPayloads {
  'hero:jump': undefined;
  'hero:duplicate': { count: number };
  'particle:collect': { type: ParticleType };
  'hero:death': { remaining: number; entangledCollapse?: boolean };
  'hero:portal_docked': { isBeta: boolean };
  'level:complete': { level: number };
  'phase:shift': { phase: PlatformPhase };
  'tunnel:use': { remaining: number; screenEdge?: boolean };
  'pauli:blast': { hero1Id: number; hero2Id: number };
  'time:dilation': { active: boolean; durationMs: number };
  'platform:decay': { x: number; y: number };
  'hero:wall_bounce': { x: number; y: number };
  'plate:trigger': { plateId: string; gateId: string };
  'hero:dive': { x: number; y: number };
  'hero:wavedash': { x: number; y: number };
  'hero:focus_switch': { fromId: number; toId: number };
  'bgm:beat': { step: number; bpm: number };
  'synth:land': { x: number; y: number };
  'tether:collect': { x: number; y: number; type: ParticleType };
  'tether:pylon_hook': { x: number; y: number };
  'hero:fusion': { x: number; y: number; fusionStack: number };
  'hero:fission': { x: number; y: number };
  'platform:cracked_break': { x: number; y: number };
  'hero:screen_wrap': { axis: 'x' | 'y'; x: number; y: number };
  'platform:plasma_bounce': { x: number; y: number };
  'platform:liquid_plunge': { x: number; y: number };
  'platform:liquid_emerge': { x: number; y: number };
  'quantum:pin': { platformId: string; pinned: boolean; cooldownMs: number };
  'hero:wormhole': { wormholeId: string; outX: number; outY: number; speed: number };
  'hero:broglie_crystallize': { count: number; durationMs: number };
  'hero:ghost_surf': { x: number; y: number };
  'bell:violation': { level: number; deltaMs: number };
  'bubble:harvest': { x: number; y: number };
  'platform:ephemeral_vanish': { x: number; y: number };
  'platform:ephemeral_restore': { count: number };
  'entanglement:reveal': { revealAtX: number };
  'wow:iron_collapse': { level: number };
  'wow:supernova_shockwave': { level: number };
  'wow:oganesson_constellation': { level: number };
  'coherence:changed': {
    value: number;
    tier: CoherenceTier;
    raw: number;
    styleScore: number;
    decoherence?: boolean;
  };
  'timeloop:rewind': { echoCount: number; cycleMs: number; manual: boolean };
  'timeloop:tick': { remainingMs: number };
  'wavefunction:collapse': {
    id: string;
    kind: 'platform' | 'spike';
    collapsedTo: 'A' | 'B';
    source: 'player' | 'beam' | 'pointer';
    x: number;
    y: number;
  };
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
