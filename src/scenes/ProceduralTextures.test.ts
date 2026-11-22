import { describe, expect, it, vi } from 'vitest';
import {
  ALL_PARTICLE_TYPES,
  PARTICLE_TEXTURE_KEYS,
  PARTICLE_VISUAL_SPECS,
  PORTAL_TEXTURE_KEY,
  SPIKE_TEXTURE_KEY,
  drawPortalSingularity,
  generateProceduralTextures
} from './ProceduralTextures';

function makeMockGraphics() {
  return {
    clear: vi.fn(),
    fillStyle: vi.fn(),
    lineStyle: vi.fn(),
    fillCircle: vi.fn(),
    strokeCircle: vi.fn(),
    fillRect: vi.fn(),
    fillTriangle: vi.fn(),
    strokeTriangle: vi.fn(),
    lineBetween: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    strokePath: vi.fn(),
    fillPath: vi.fn(),
    closePath: vi.fn(),
    generateTexture: vi.fn(),
    destroy: vi.fn()
  };
}

describe('ProceduralTextures', () => {
  it('registers portal, spike, and all 8 particle glyph textures at startup and destroys temp graphics', () => {
    const existing = new Set<string>();
    const createdGraphics: ReturnType<typeof makeMockGraphics>[] = [];

    const mockScene = {
      textures: {
        exists: vi.fn((key: string) => existing.has(key))
      },
      make: {
        graphics: vi.fn(() => {
          const g = makeMockGraphics();
          g.generateTexture.mockImplementation((key: string) => {
            existing.add(key);
          });
          createdGraphics.push(g);
          return g;
        })
      }
    } as unknown as Phaser.Scene;

    const registered = generateProceduralTextures(mockScene);

    expect(registered).toContain(PORTAL_TEXTURE_KEY);
    expect(registered).toContain(SPIKE_TEXTURE_KEY);
    expect(registered).toHaveLength(2 + ALL_PARTICLE_TYPES.length);

    for (const type of ALL_PARTICLE_TYPES) {
      expect(existing.has(PARTICLE_TEXTURE_KEYS[type])).toBe(true);
    }

    expect(createdGraphics).toHaveLength(10);
    for (const g of createdGraphics) {
      expect(g.destroy).toHaveBeenCalledTimes(1);
    }

    // Calling again is idempotent and does not regenerate existing textures
    generateProceduralTextures(mockScene);
    expect(createdGraphics).toHaveLength(10);
  });

  it('guarantees all 8 particle types have unique shapes and texture keys (colorblind accessibility)', () => {
    expect(ALL_PARTICLE_TYPES).toHaveLength(8);

    const shapeIds = new Set(ALL_PARTICLE_TYPES.map((t) => PARTICLE_VISUAL_SPECS[t].shapeId));
    const textureKeys = new Set(ALL_PARTICLE_TYPES.map((t) => PARTICLE_VISUAL_SPECS[t].textureKey));
    const symbols = new Set(ALL_PARTICLE_TYPES.map((t) => PARTICLE_VISUAL_SPECS[t].symbol));

    expect(shapeIds.size).toBe(8);
    expect(textureKeys.size).toBe(8);
    expect(symbols.size).toBe(8);
  });

  it('renders locked vs unlocked portal singularity states and scales detail for FX:LO', () => {
    const gUnlockedHi = makeMockGraphics();
    drawPortalSingularity(gUnlockedHi as unknown as Phaser.GameObjects.Graphics, 400, 300, 1200, {
      primaryColor: 0x00e5ff,
      accentColor: 0xe0f2fe,
      isLocked: false,
      reducedEffects: false
    });

    const gUnlockedLo = makeMockGraphics();
    drawPortalSingularity(gUnlockedLo as unknown as Phaser.GameObjects.Graphics, 400, 300, 1200, {
      primaryColor: 0x00e5ff,
      accentColor: 0xe0f2fe,
      isLocked: false,
      reducedEffects: true
    });

    const gLocked = makeMockGraphics();
    drawPortalSingularity(gLocked as unknown as Phaser.GameObjects.Graphics, 400, 300, 1200, {
      primaryColor: 0x00e5ff,
      accentColor: 0xe0f2fe,
      isLocked: true,
      reducedEffects: false
    });

    // Unlocked portal has open core gleam and no containment X-bars
    expect(gUnlockedHi.lineBetween).not.toHaveBeenCalled();
    // Locked portal draws sealed containment X-bars
    expect(gLocked.lineBetween).toHaveBeenCalledTimes(2);
    // FX:LO skips outer glow & inner counter-rotating arc for 60 FPS mobile budget
    expect(gUnlockedLo.arc.mock.calls.length).toBeLessThan(gUnlockedHi.arc.mock.calls.length);
  });
});
