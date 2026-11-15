import { describe, expect, it } from 'vitest';
import {
  type SimWorld,
  createInitialHeroState,
  stepSimulation
} from '../../generator/simulator';
import { PHYSICS } from '../constants';
import {
  clampFallVelocity,
  computeLookAheadOffset,
  getAsymmetricGravityMultiplier
} from '../stepHeroPhysics';

const FLAT_WORLD: SimWorld = {
  width: 2000,
  height: 800,
  platforms: [{ x: 0, y: 500, width: 2000, height: 20 }]
};

describe('Spec-04 Toy Factor Physics', () => {
  it('Jump Buffer: pressing jump 80 ms before landing triggers jump on impact frame', () => {
    // Start hero ~80 ms above y=500 platform (ground y = 468)
    let hero = createInitialHeroState(200, 445);
    hero.touchingGround = false;
    hero.vy = 220;

    // Step 1 frame with jump pressed while airborne
    hero = stepSimulation(hero, { left: false, right: false, jump: true }, FLAT_WORLD);
    const pressTime = hero.timeMs;
    expect(hero.touchingGround).toBe(false);

    // Release jump and fall until landing + impact jump
    let jumpedAfterLanding = false;
    let landTime = -1;
    for (let i = 0; i < 10; i++) {
      hero = stepSimulation(hero, { left: false, right: false, jump: false }, FLAT_WORLD);
      if (hero.vy < 0) {
        landTime = hero.timeMs;
        jumpedAfterLanding = true;
        break;
      }
    }

    expect(jumpedAfterLanding).toBe(true);
    expect(landTime - pressTime).toBeLessThanOrEqual(PHYSICS.JUMP_BUFFER_MS);
    expect(hero.vy).toBeLessThan(0);
  });

  it('Jump Buffer: pressing jump > 110 ms before landing does NOT trigger jump', () => {
    let hero = createInitialHeroState(200, 380);
    hero.touchingGround = false;
    hero.vy = 100;

    // Press jump while high in the air (> 110 ms before landing)
    hero = stepSimulation(hero, { left: false, right: false, jump: true }, FLAT_WORLD);

    // Release jump and fall for up to 500 ms
    let landedAndStayedGrounded = false;
    for (let i = 0; i < 35; i++) {
      hero = stepSimulation(hero, { left: false, right: false, jump: false }, FLAT_WORLD);
      if (hero.touchingGround && hero.vy === 0) {
        landedAndStayedGrounded = true;
        break;
      }
    }
    // Step 1 more frame to confirm buffered jump does NOT fire
    hero = stepSimulation(hero, { left: false, right: false, jump: false }, FLAT_WORLD);

    expect(landedAndStayedGrounded).toBe(true);
    expect(hero.touchingGround).toBe(true);
    expect(hero.vy).toBe(0);
  });

  it('Coyote Time: pressing jump 75 ms after walking off a ledge triggers jump', () => {
    const ledgeWorld: SimWorld = {
      width: 1200,
      height: 800,
      platforms: [{ x: 0, y: 500, width: 200, height: 20 }]
    };

    // Place hero near right edge of platform (x=200), walk off
    let hero = createInitialHeroState(195, 500 - PHYSICS.HERO_HEIGHT / 2);
    // Walk right until airborne
    while (hero.touchingGround) {
      hero = stepSimulation(hero, { left: false, right: true, jump: false }, ledgeWorld);
    }
    const leftEdgeTime = hero.timeMs;

    // Wait ~65-75 ms in midair without jumping
    while (hero.timeMs - leftEdgeTime < 65) {
      hero = stepSimulation(hero, { left: false, right: true, jump: false }, ledgeWorld);
    }
    expect(hero.timeMs - (hero.lastGroundedTimeMs ?? 0)).toBeLessThanOrEqual(
      PHYSICS.COYOTE_TIME_MS
    );

    // Press jump at ~75 ms after leaving ledge
    hero = stepSimulation(hero, { left: false, right: true, jump: true }, ledgeWorld);
    expect(hero.vy).toBeLessThan(-350);
  });

  it('Coyote Time: does not allow double-jump after already jumping from ground', () => {
    let hero = createInitialHeroState(200, 500 - PHYSICS.HERO_HEIGHT / 2);
    // Jump from ground
    hero = stepSimulation(hero, { left: false, right: false, jump: true }, FLAT_WORLD);
    expect(hero.vy).toBeLessThan(0);

    // Release jump for 1 frame, then press again within 50 ms
    hero = stepSimulation(hero, { left: false, right: false, jump: false }, FLAT_WORLD);
    const vyBefore = hero.vy;
    hero = stepSimulation(hero, { left: false, right: false, jump: true }, FLAT_WORLD);

    // Should NOT reset vy back to -450 (no double jump)
    expect(hero.vy).toBeGreaterThan(vyBefore);
  });

  it('Variable Jump Cut: releasing after ~65 ms gives short hop (~50-75 px) vs held jump (~145 px)', () => {
    // 1. Full held jump
    let fullHero = createInitialHeroState(200, 500 - PHYSICS.HERO_HEIGHT / 2);
    const startY = fullHero.y;
    let minFullY = startY;

    for (let i = 0; i < 90; i++) {
      fullHero = stepSimulation(fullHero, { left: false, right: true, jump: true }, FLAT_WORLD);
      if (fullHero.y < minFullY) minFullY = fullHero.y;
      if (i > 2 && fullHero.touchingGround) break;
    }
    const fullHeight = startY - minFullY;
    const fullRange = fullHero.x - 200;

    // 2. Short jump (release after 4 frames = ~66.7 ms)
    let shortHero = createInitialHeroState(200, 500 - PHYSICS.HERO_HEIGHT / 2);
    let minShortY = startY;
    for (let i = 0; i < 60; i++) {
      const holdJump = i < 4;
      shortHero = stepSimulation(
        shortHero,
        { left: false, right: false, jump: holdJump },
        FLAT_WORLD
      );
      if (shortHero.y < minShortY) minShortY = shortHero.y;
      if (i > 4 && shortHero.touchingGround) break;
    }
    const shortHeight = startY - minShortY;

    expect(fullHeight).toBeGreaterThan(135);
    expect(fullHeight).toBeLessThan(160);
    expect(fullRange).toBeGreaterThan(430);
    expect(fullRange).toBeLessThan(480);

    expect(shortHeight).toBeGreaterThanOrEqual(48);
    expect(shortHeight).toBeLessThanOrEqual(75);
  });

  it('Apex Hang-Time & Fall Gravity & Terminal Velocity', () => {
    // Normal ascent
    expect(getAsymmetricGravityMultiplier(-200, 1, false)).toBe(1);
    // Apex hang-time (|vy| < 45)
    expect(getAsymmetricGravityMultiplier(-20, 1, false)).toBe(0.6);
    expect(getAsymmetricGravityMultiplier(20, 1, false)).toBe(0.6);
    // Fall gravity (vy * upsideDown > 45)
    expect(getAsymmetricGravityMultiplier(200, 1, false)).toBe(1.35);
    expect(getAsymmetricGravityMultiplier(-200, -1, false)).toBe(1.35);

    // Terminal velocity clamp (680 px/s) unless diving
    expect(clampFallVelocity(800, 1, false)).toBe(PHYSICS.MAX_FALL_VY);
    expect(clampFallVelocity(-800, -1, false)).toBe(-PHYSICS.MAX_FALL_VY);
    expect(clampFallVelocity(720, 1, true)).toBe(720);
  });

  it('Quantum Wave-Dash: jumping within 70 ms after a dive grants 1.22x speed for 260 ms', () => {
    let hero = createInitialHeroState(200, 300);
    hero.touchingGround = false;

    // Trigger dive
    hero = stepSimulation(
      hero,
      { left: false, right: true, jump: false, dive: true },
      FLAT_WORLD
    );
    expect(hero.isDiving).toBe(true);

    // Fall until landing on y=500 platform
    while (!hero.touchingGround) {
      hero = stepSimulation(hero, { left: false, right: true, jump: false }, FLAT_WORLD);
    }

    // Jump within 70 ms (immediately on impact frame) -> Wave-Dash!
    hero = stepSimulation(hero, { left: false, right: true, jump: true }, FLAT_WORLD);
    expect(hero.isDiving).toBe(false);
    expect(hero.vx).toBeCloseTo(PHYSICS.HERO_SPEED_X * PHYSICS.WAVE_DASH_MULTIPLIER, 1);

    // Advance until wave-dash expires (260 ms) and hero lands back on ground
    for (let i = 0; i < 90; i++) {
      hero = stepSimulation(hero, { left: false, right: true, jump: false }, FLAT_WORLD);
      if (hero.touchingGround && hero.timeMs > (hero.waveDashUntilMs ?? 0)) {
        break;
      }
    }
    hero = stepSimulation(hero, { left: false, right: true, jump: false }, FLAT_WORLD);
    expect(hero.vx).toBeCloseTo(PHYSICS.HERO_SPEED_X, 1);
  });

  it('computeLookAheadOffset clamps to [-70, 70] X and [-55, 55] Y', () => {
    expect(computeLookAheadOffset(0, 0)).toEqual({ x: -0, y: -0 });
    expect(computeLookAheadOffset(350, 0).x).toBeCloseTo(-63, 2);
    expect(computeLookAheadOffset(1000, 1000)).toEqual({ x: -70, y: -55 });
    expect(computeLookAheadOffset(-1000, -1000)).toEqual({ x: 70, y: 55 });
  });
});
