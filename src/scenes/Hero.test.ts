import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
  class MockSprite {
    public scene: any;
    public x: number;
    public y: number;
    public texture: string;
    public flipX = false;
    public flipY = false;
    public tint = 0;
    public body: any;
    public anims: any;

    constructor(scene: any, x: number, y: number, texture: string) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.texture = texture;
      this.body = {
        touching: { down: false, up: false, left: false, right: false },
        blocked: { down: false, up: false, left: false, right: false },
        velocity: { x: 0, y: 0 }
      };
      this.anims = {
        currentAnim: { key: 'idle' }
      };
    }

    setBounce() {
      return this;
    }
    setBounceY() {
      return this;
    }
    setCollideWorldBounds() {
      return this;
    }
    play(anim: string) {
      this.anims.currentAnim = { key: anim };
      return this;
    }
    setInteractive() {
      return this;
    }
    on() {
      return this;
    }
    setTexture(t: string) {
      this.texture = t;
      return this;
    }
    setFlipX(f: boolean) {
      this.flipX = f;
      return this;
    }
    setFlipY(f: boolean) {
      this.flipY = f;
      return this;
    }
    setTint(t: number) {
      this.tint = t;
      return this;
    }
    clearTint() {
      this.tint = 0;
      return this;
    }
    setVelocityX(vx: number) {
      this.body.velocity.x = vx;
      return this;
    }
    setVelocityY(vy: number) {
      this.body.velocity.y = vy;
      return this;
    }
    setVelocity(vx: number, vy: number) {
      this.body.velocity.x = vx;
      this.body.velocity.y = vy;
      return this;
    }
  }

  return {
    default: {
      Physics: {
        Arcade: {
          Sprite: MockSprite
        }
      }
    }
  };
});

import Hero from './Hero';

describe('Hero Quantum Entanglement Mechanics', () => {
  let mockScene: any;

  beforeEach(() => {
    mockScene = {
      add: { existing: vi.fn() },
      physics: { add: { existing: vi.fn() } },
      events: { emit: vi.fn() }
    };
  });

  it('configures Alpha as default entangled hero without tint', () => {
    const alpha = new Hero(mockScene, 100, 200, true);
    alpha.setEntangled(false, 'mirror_x');

    expect(alpha.isEntangled).toBe(true);
    expect(alpha.isBeta).toBe(false);
    expect(alpha.entanglementMode).toBe('mirror_x');
    expect(alpha.tint).toBe(0);
    expect(alpha.upsideDown).toBe(1);
  });

  it('configures Beta with magenta tint and proper gravity inversion', () => {
    const beta = new Hero(mockScene, 300, 200, true);
    beta.setEntangled(true, 'inverted_gravity');

    expect(beta.isEntangled).toBe(true);
    expect(beta.isBeta).toBe(true);
    expect(beta.entanglementMode).toBe('inverted_gravity');
    expect(beta.tint).toBe(0xec4899);
    expect(beta.upsideDown).toBe(-1);
    expect(beta.flipY).toBe(true);
  });

  it('mirrors horizontal movement for Beta in mirror_x mode', () => {
    const beta = new Hero(mockScene, 300, 200, true);
    beta.setEntangled(true, 'mirror_x');

    // Player presses RIGHT
    beta.updateControl({ right: { isDown: true } } as any, null, {
      left: false,
      right: false,
      jump: false
    });

    // Beta must move LEFT (-vx) and flipX must be true
    expect(beta.body.velocity.x).toBe(-350);
    expect(beta.flipX).toBe(true);

    // Player presses LEFT
    beta.updateControl({ left: { isDown: true } } as any, null, {
      left: false,
      right: false,
      jump: false
    });

    // Beta must move RIGHT (+vx) and flipX must be false
    expect(beta.body.velocity.x).toBe(350);
    expect(beta.flipX).toBe(false);
  });

  it('keeps horizontal direction synchronized for Beta in inverted_gravity mode', () => {
    const beta = new Hero(mockScene, 300, 200, true);
    beta.setEntangled(true, 'inverted_gravity');

    // Player presses RIGHT
    beta.updateControl({ right: { isDown: true } } as any, null, {
      left: false,
      right: false,
      jump: false
    });

    // In pure inverted gravity, horizontal direction is identical to normal hero
    expect(beta.body.velocity.x).toBe(350);
    expect(beta.flipX).toBe(false);
  });

  it('handles inverted ceiling jump for inverted_gravity Beta', () => {
    const beta = new Hero(mockScene, 300, 200, true);
    beta.setEntangled(true, 'inverted_gravity');

    // Resting on ceiling: touching.up is true
    beta.body.touching.up = true;

    // Player presses Jump
    beta.updateControl({ up: { isDown: true } } as any, null, {
      left: false,
      right: false,
      jump: false
    });

    // Since upsideDown is -1, -450 * (-1) = +450 (jumps downwards towards ground)
    expect(beta.body.velocity.y).toBe(450);
  });

  it('freezes hero velocity when enteredPortal is true', () => {
    const hero = new Hero(mockScene, 100, 200, true);
    hero.setEntangled(false, 'mirror_x');
    hero.enteredPortal = true;

    hero.updateControl({ right: { isDown: true }, up: { isDown: true } } as any, null, {
      left: false,
      right: false,
      jump: false
    });

    expect(hero.body.velocity.x).toBe(0);
    expect(hero.body.velocity.y).toBe(0);
  });
});
