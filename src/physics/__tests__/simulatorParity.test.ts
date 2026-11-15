import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  type SimWorld,
  createInitialHeroState,
  stepSimulation
} from '../../generator/simulator';
import * as quantumMechanics from '../../mechanics/quantumMechanics';
import { PHYSICS } from '../constants';
import { applyLowGravity, getCollapseBounds, isHeroOnPressurePlate } from '../stepHeroPhysics';

describe('Spec-02 Simulator Parity & Shared Quantum Mechanics', () => {
  it('directly imports and uses quantumMechanics functions in simulator.ts without formula duplication', () => {
    const simulatorSource = fs.readFileSync(
      path.resolve(__dirname, '../../generator/simulator.ts'),
      'utf-8'
    );

    expect(simulatorSource).toContain('checkTunnelObstacle');
    expect(simulatorSource).toContain('checkPauliRepulsion');
    expect(simulatorSource).toContain('updateDecayPlatform');
    expect(simulatorSource).toContain('calculateCollapse');
    expect(simulatorSource).toContain("from '../mechanics/quantumMechanics'");
  });

  it('Rule 1: updates moving platforms (movesTo) at +/-100 px/s X and +/-20 px/s Y slowed by timeDilationFactor', () => {
    const world: SimWorld = {
      width: 1200,
      height: 800,
      platforms: [
        { x: 100, y: 500, width: 200, height: 20, movesTo: { x: 300, y: 560 } }
      ]
    };

    let hero = createInitialHeroState(150, 500 - PHYSICS.HERO_HEIGHT / 2);
    hero = stepSimulation(hero, { left: false, right: false, jump: false }, world, 1000);

    const mp = hero.movingPlatforms?.[0];
    expect(mp).toBeDefined();
    expect(mp!.x).toBeCloseTo(200, 1);
    expect(mp!.y).toBeCloseTo(520, 1);

    // Under time dilation (0.25x), platform moves 25 px in X and 5 px in Y over 1000 ms
    hero.timeDilationUntilMs = hero.timeMs + 4000;
    hero = stepSimulation(hero, { left: false, right: false, jump: false }, world, 1000);
    const mpDilated = hero.movingPlatforms?.[0];
    expect(mpDilated!.x).toBeCloseTo(225, 1);
    expect(mpDilated!.y).toBeCloseTo(525, 1);
  });

  it('Rule 2: unifies timeDilation duration to PHYSICS.TIME_DILATION_DURATION_MS = 4000 ms', () => {
    expect(PHYSICS.TIME_DILATION_DURATION_MS).toBe(4000);

    const world: SimWorld = {
      width: 1200,
      height: 800,
      platforms: [{ x: 0, y: 500, width: 600, height: 20 }],
      particles: [{ x: 100, y: 468, type: 'timeDilation' }]
    };

    let hero = createInitialHeroState(100, 500 - PHYSICS.HERO_HEIGHT / 2);
    hero = stepSimulation(hero, { left: false, right: false, jump: false }, world);
    expect(hero.timeDilationUntilMs).toBeCloseTo(hero.timeMs + 4000, 5);
  });

  it('Rule 3: delegates decay platforms to updateDecayPlatform with time dilation and 2500 ms respawn', () => {
    const spy = vi.spyOn(quantumMechanics, 'updateDecayPlatform');
    const world: SimWorld = {
      width: 1200,
      height: 800,
      platforms: [{ x: 50, y: 500, width: 200, height: 20, decayMs: 500 }]
    };

    let hero = createInitialHeroState(150, 500 - PHYSICS.HERO_HEIGHT / 2);
    hero = stepSimulation(hero, { left: false, right: false, jump: false }, world);
    expect(spy).toHaveBeenCalled();
    expect(hero.decayStates?.[0]?.triggered).toBe(true);

    // Advance 600 ms -> platform collapses
    for (let i = 0; i < 36; i++) {
      hero = stepSimulation(hero, { left: false, right: false, jump: false }, world);
    }
    expect(hero.decayStates?.[0]?.collapsed).toBe(true);

    // Advance 2500 ms -> platform respawns
    for (let i = 0; i < 155; i++) {
      hero = stepSimulation(hero, { left: false, right: false, jump: false }, world);
    }
    expect(hero.decayStates?.[0]?.collapsed).toBe(false);
    spy.mockRestore();
  });

  it('Rule 4: checkPauliRepulsion produces unified +/-620 vx and -580 vy', () => {
    const events = quantumMechanics.checkPauliRepulsion(
      [
        { id: 1, x: 100, y: 300, pauliGraceUntil: 0, upsideDown: 1 },
        { id: 2, x: 130, y: 300, pauliGraceUntil: 0, upsideDown: 1 }
      ],
      1000
    );
    expect(events).toHaveLength(1);
    expect(events[0].impulseA.vx).toBe(-620);
    expect(events[0].impulseA.vy).toBe(-580);
    expect(events[0].impulseB.vx).toBe(620);
    expect(events[0].impulseB.vy).toBe(-580);
  });

  it('Rule 5: delegates quantum tunneling to checkTunnelObstacle', () => {
    const spy = vi.spyOn(quantumMechanics, 'checkTunnelObstacle');
    const world: SimWorld = {
      width: 1200,
      height: 800,
      platforms: [
        { x: 0, y: 500, width: 600, height: 20 },
        { x: 200, y: 400, width: 40, height: 100 }
      ],
      particles: [{ x: 170, y: 468, type: 'tunnel' }]
    };

    let hero = createInitialHeroState(170, 500 - PHYSICS.HERO_HEIGHT / 2);
    hero = stepSimulation(hero, { left: false, right: true, jump: false }, world);
    expect(spy).toHaveBeenCalled();
    expect(hero.tunnelCharges).toBe(0);
    expect(hero.x).toBeGreaterThan(240);
    spy.mockRestore();
  });

  it('Rule 6: lowGravity is cumulative (*= 0.5) and capped at min = 0.25', () => {
    expect(applyLowGravity(1)).toBe(0.5);
    expect(applyLowGravity(0.5)).toBe(0.25);
    expect(applyLowGravity(0.25)).toBe(0.25);

    const world: SimWorld = {
      width: 1200,
      height: 800,
      platforms: [{ x: 0, y: 500, width: 600, height: 20 }],
      particles: [
        { x: 100, y: 468, type: 'lowGravity' },
        { x: 120, y: 468, type: 'lowGravity' },
        { x: 140, y: 468, type: 'lowGravity' }
      ]
    };

    let hero = createInitialHeroState(100, 500 - PHYSICS.HERO_HEIGHT / 2);
    hero = stepSimulation(hero, { left: false, right: false, jump: false }, world);
    expect(hero.gravityMultiplier).toBe(0.25);
  });

  it('Rule 7: pressurePlates use shared HERO_HITBOX_HALF_W = 16 and HERO_HITBOX_HALF_H = 20', () => {
    expect(PHYSICS.HERO_HITBOX_HALF_W).toBe(16);
    expect(PHYSICS.HERO_HITBOX_HALF_H).toBe(20);

    const plate = { id: 'p1', x: 200, y: 490, width: 40, height: 10, targetGateId: 'g1' };
    // At x = 180, halfW = 16 -> heroRight = 196 < 200 (outside), whereas halfW = 32 would overlap!
    expect(isHeroOnPressurePlate(180, 480, plate)).toBe(false);
    // At x = 190, halfW = 16 -> heroRight = 206 > 200 (inside)
    expect(isHeroOnPressurePlate(190, 480, plate)).toBe(true);
  });

  it('Rule 8: collapse uses COLLAPSE_TOP_START_Y = 280 and COLLAPSE_BOTTOM_MARGIN_Y = 140', () => {
    expect(PHYSICS.COLLAPSE_TOP_START_Y).toBe(280);
    expect(PHYSICS.COLLAPSE_BOTTOM_MARGIN_Y).toBe(140);

    const bounds = getCollapseBounds(800, 20);
    expect(bounds.topSpikeBottom).toBe(300);
    expect(bounds.bottomSpikeTop).toBe(640);
  });
});
