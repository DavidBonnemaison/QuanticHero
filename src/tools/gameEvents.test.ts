import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEventBus, gameEvents } from './gameEvents';

describe('GameEventBus', () => {
  let bus: GameEventBus;

  beforeEach(() => {
    bus = new GameEventBus();
  });

  it('subscribes and receives emitted events with payloads', () => {
    const handler = vi.fn();
    bus.on('hero:duplicate', handler);

    bus.emit('hero:duplicate', { count: 3 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ count: 3 });
  });

  it('handles void events without payload', () => {
    const handler = vi.fn();
    bus.on('hero:jump', handler);

    bus.emit('hero:jump');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(undefined);
  });

  it('unsubscribes using the returned unsubscribe function', () => {
    const handler = vi.fn();
    const unsub = bus.on('hero:jump', handler);

    bus.emit('hero:jump');
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    bus.emit('hero:jump');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes using bus.off', () => {
    const handler = vi.fn();
    bus.on('level:complete', handler);

    bus.off('level:complete', handler);
    bus.emit('level:complete', { level: 2 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('clears all listeners with clear()', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    bus.on('hero:jump', handler1);
    bus.on('hero:death', handler2);

    bus.clear();
    bus.emit('hero:jump');
    bus.emit('hero:death', { remaining: 0 });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('safely catches errors thrown inside handlers without blocking other listeners', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const faultyHandler = vi.fn(() => {
      throw new Error('Handler failure');
    });
    const goodHandler = vi.fn();

    bus.on('hero:jump', faultyHandler);
    bus.on('hero:jump', goodHandler);

    expect(() => bus.emit('hero:jump')).not.toThrow();
    expect(faultyHandler).toHaveBeenCalled();
    expect(goodHandler).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('exports a global singleton gameEvents', () => {
    expect(gameEvents).toBeInstanceOf(GameEventBus);
  });
});
