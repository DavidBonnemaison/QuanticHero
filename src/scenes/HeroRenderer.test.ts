import { describe, expect, it, vi } from 'vitest';
import type Hero from './Hero';
import { HeroRenderer, computeHeroVisualState } from './HeroRenderer';

function makeMockGraphics() {
  return {
    clear: vi.fn(),
    setDepth: vi.fn(),
    fillStyle: vi.fn(),
    lineStyle: vi.fn(),
    fillCircle: vi.fn(),
    strokeCircle: vi.fn(),
    fillTriangle: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    fillPath: vi.fn(),
    strokePath: vi.fn(),
    destroy: vi.fn()
  };
}

function makeMockHero(overrides: Partial<Record<string, unknown>> = {}): Hero {
  const hero = {
    x: 200,
    y: 300,
    active: true,
    visible: true,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    flipX: false,
    upsideDown: 1,
    isFocused: true,
    isEntangled: false,
    isBeta: false,
    fusionStack: 1,
    tunnelCharges: 0,
    pauliGraceUntil: 0,
    isDiving: false,
    body: {
      width: 64,
      height: 64,
      velocity: { x: 0, y: 0 }
    },
    setAlpha: vi.fn(function (this: { alpha: number }, a: number) {
      this.alpha = a;
      return this;
    }),
    ...overrides
  };
  return hero as unknown as Hero;
}

describe('HeroRenderer & computeHeroVisualState', () => {
  it('expresses phase color, Super-Quanta, tunnel, pauli, lean, dive, entanglement, focus, and inverted gravity', () => {
    const cyanState = computeHeroVisualState(makeMockHero(), 1000, {
      reducedEffects: false,
      hasPhasePlatforms: true,
      activePhase: 'cyan'
    });
    const magentaState = computeHeroVisualState(makeMockHero(), 1000, {
      reducedEffects: false,
      hasPhasePlatforms: true,
      activePhase: 'magenta'
    });
    expect(cyanState.envelopeColor).toBe(0x00e5ff);
    expect(magentaState.envelopeColor).toBe(0xff00e5);

    const superQuanta = computeHeroVisualState(
      makeMockHero({ fusionStack: 2, tunnelCharges: 1, pauliGraceUntil: 2000 }),
      1000,
      { reducedEffects: false }
    );
    expect(superQuanta.isSuperQuanta).toBe(true);
    expect(superQuanta.accentColor).toBe(0xfbbf24);
    expect(superQuanta.hasTunnelCharge).toBe(true);
    expect(superQuanta.hasPauliAura).toBe(true);

    const runningDive = computeHeroVisualState(
      makeMockHero({ isDiving: true, body: { velocity: { x: 300, y: 500 } } }),
      1000,
      { reducedEffects: false }
    );
    expect(runningDive.leanRad).toBeGreaterThan(0);
    expect(runningDive.scaleY).toBeGreaterThan(1.1);
    expect(runningDive.scaleX).toBeLessThan(0.9);

    const betaInverted = computeHeroVisualState(
      makeMockHero({ isEntangled: true, isBeta: true, upsideDown: -1 }),
      1000,
      { reducedEffects: false }
    );
    expect(betaInverted.envelopeColor).toBe(0xec4899);
    expect(betaInverted.upsideDown).toBe(-1);

    const unfocusedClone = computeHeroVisualState(makeMockHero({ isFocused: false }), 1000, {
      reducedEffects: false
    });
    expect(unfocusedClone.alpha).toBeLessThan(0.7);
  });

  it('reduces glow layers and wave segments in FX:LO for 60 FPS mobile performance', () => {
    const hi = computeHeroVisualState(makeMockHero(), 1000, { reducedEffects: false });
    const lo = computeHeroVisualState(makeMockHero(), 1000, { reducedEffects: true });

    expect(hi.glowLayers).toBe(2);
    expect(lo.glowLayers).toBe(1);
    expect(lo.waveSegments).toBeLessThan(hi.waveSegments);
  });

  it('switches live between quantum and classic skins without mutating hero visibility or physics body', () => {
    const gfx = makeMockGraphics();
    const mockScene = {
      add: { graphics: vi.fn(() => gfx) }
    } as unknown as Phaser.Scene;

    const renderer = new HeroRenderer(mockScene);
    const hero = makeMockHero({
      fusionStack: 2,
      tunnelCharges: 1,
      pauliGraceUntil: 5000,
      isDiving: true
    });

    // Quantum mode: draws procedural hero, hides classic sprite via alpha = 0 while preserving visible = true & body
    renderer.render(1000, [hero], { skin: 'quantum', reducedEffects: false });
    expect(hero.alpha).toBe(0);
    expect(hero.visible).toBe(true);
    expect(hero.body?.width).toBe(64);
    expect(hero.body?.height).toBe(64);
    expect(gfx.fillCircle).toHaveBeenCalled();
    expect(gfx.strokePath).toHaveBeenCalled();

    // Live switch to Classic mode: immediately restores sprite alpha and skips procedural drawing
    gfx.fillCircle.mockClear();
    renderer.render(1016, [hero], { skin: 'classic', reducedEffects: false });
    expect(hero.alpha).toBeGreaterThan(0);
    expect(gfx.clear).toHaveBeenCalled();
    expect(gfx.fillCircle).not.toHaveBeenCalled();

    renderer.destroy();
    expect(gfx.destroy).toHaveBeenCalledTimes(1);
  });
});
