import { beforeEach, describe, expect, it } from 'vitest';
import { simulateLevelData } from '../generator/simulator';
import { useGameStore } from '../store';
import {
  AcceleratorRunManager,
  generateChamber,
  resolveAcceleratorElement
} from './AcceleratorRunManager';

describe('AcceleratorRunManager & Procedural Chambers (Spec-03)', () => {
  beforeEach(() => {
    useGameStore.setState({
      acceleratorBest: null
    });
  });

  it('starts a run at Z = 1 (Hydrogen) with 3 Quanta of Life and a valid initial chamber', () => {
    const manager = new AcceleratorRunManager(101);
    const state = manager.startRun(101);

    expect(state.status).toBe('playing');
    expect(state.currentZ).toBe(1);
    expect(state.element.symbol).toBe('H');
    expect(state.lives).toBe(3);
    expect(state.maxLives).toBe(3);
    expect(state.roomsCleared).toBe(0);
    expect(state.activeMutations).toEqual([]);
    expect(state.currentChamber).not.toBeNull();
    expect(state.currentChamber?.id).toBe('accelerator-1');
  });

  it('generates chambers across Z tiers that are always solvable by simulateLevelData', () => {
    const zSamples = [1, 4, 12, 26, 79, 118, 120];
    for (const z of zSamples) {
      const chamber = generateChamber(z, 9001);
      expect(chamber.id).toBe(`accelerator-${z}`);
      expect(chamber.platforms.length).toBeGreaterThanOrEqual(2);
      const sim = simulateLevelData(chamber);
      expect(sim.success, `Chamber Z=${z} must be solvable by simulateLevelData`).toBe(true);
    }
  });

  it('resolves elements beyond Z = 118 into superheavy elements cleanly', () => {
    const h = resolveAcceleratorElement(1);
    expect(h.symbol).toBe('H');
    const og = resolveAcceleratorElement(118);
    expect(og.symbol).toBe('Og');
    const uue = resolveAcceleratorElement(119);
    expect(uue.z).toBe(119);
    expect(uue.symbol).toBe('Uue');
  });

  it('chains completeRoom -> chooseMutation -> next chamber and updates best record in useGameStore', () => {
    const manager = new AcceleratorRunManager(777);
    manager.startRun(777);

    const afterRoom1 = manager.completeRoom(8450);
    expect(afterRoom1.status).toBe('choosing_mutation');
    expect(afterRoom1.roomsCleared).toBe(1);
    expect(afterRoom1.currentZ).toBe(2);
    expect(afterRoom1.totalTimeMs).toBe(8450);
    expect(afterRoom1.pendingChoices).not.toBeNull();
    expect(afterRoom1.pendingChoices?.[0].id).not.toBe(afterRoom1.pendingChoices?.[1].id);

    const chosenId = afterRoom1.pendingChoices?.[0].id ?? '';
    const afterPick = manager.chooseMutation(0);
    expect(afterPick.status).toBe('playing');
    expect(afterPick.activeMutations).toEqual([chosenId]);
    expect(afterPick.pendingChoices).toBeNull();
    expect(afterPick.currentChamber?.id).toBe('accelerator-2');

    const storedBest = useGameStore.getState().acceleratorBest;
    expect(storedBest).not.toBeNull();
    expect(storedBest?.maxZ).toBe(2);
    expect(storedBest?.bestRooms).toBe(1);
    expect(storedBest?.mutations).toEqual([chosenId]);
  });

  it('decrements lives on loseLife() and transitions to gameover when lives reach 0', () => {
    const manager = new AcceleratorRunManager(555);
    manager.startRun(555);

    const hit1 = manager.loseLife();
    expect(hit1.gameOver).toBe(false);
    expect(hit1.state.lives).toBe(2);
    expect(hit1.state.status).toBe('playing');

    const hit2 = manager.loseLife();
    expect(hit2.gameOver).toBe(false);
    expect(hit2.state.lives).toBe(1);
    expect(hit2.state.status).toBe('playing');

    const hit3 = manager.loseLife();
    expect(hit3.gameOver).toBe(true);
    expect(hit3.state.lives).toBe(0);
    expect(hit3.state.status).toBe('gameover');

    const storedBest = useGameStore.getState().acceleratorBest;
    expect(storedBest).not.toBeNull();
    expect(storedBest?.maxZ).toBe(1);
  });
});
