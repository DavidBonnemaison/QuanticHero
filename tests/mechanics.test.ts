import { describe, expect, it } from 'vitest';
import {
  calculateCollapse,
  checkPauliRepulsion,
  checkTunnelObstacle,
  togglePhase,
  updateDecayPlatform
} from '../src/mechanics/quantumMechanics';
import type { CollapseConfig, Platform, PlatformPhase } from '../src/types';

describe('Spec-02 Quantum Mechanics', () => {
  describe('Quantum Tunneling (type: "tunnel")', () => {
    it('allows tunneling through thin wall (thickness <= 80 px) when pushing right', () => {
      const heroX = 100;
      const heroY = 200;
      const heroWidth = 40;
      const heroHeight = 40;

      // Platform adjacent to the right, thickness = 40 px (<= 80)
      const thinWall: Platform = {
        x: 120,
        y: 180,
        width: 40,
        height: 60,
        kind: 'wall'
      };

      const result = checkTunnelObstacle(heroX, heroY, heroWidth, heroHeight, 'right', thinWall);
      expect(result).not.toBeNull();
      expect(result?.canTunnel).toBe(true);
      expect(result?.thickness).toBe(40);
      // Exit point: wall.x + wall.width + heroWidth/2 + 4 = 120 + 40 + 20 + 4 = 184
      expect(result?.exitX).toBe(184);
    });

    it('allows tunneling through thin wall (thickness <= 80 px) when pushing left', () => {
      const heroX = 180;
      const heroY = 200;
      const heroWidth = 40;
      const heroHeight = 40;

      // Platform adjacent to the left, thickness = 30 px (<= 80)
      const thinWall: Platform = {
        x: 130,
        y: 180,
        width: 30,
        height: 60,
        kind: 'wall'
      };

      const result = checkTunnelObstacle(heroX, heroY, heroWidth, heroHeight, 'left', thinWall);
      expect(result).not.toBeNull();
      expect(result?.canTunnel).toBe(true);
      expect(result?.thickness).toBe(30);
      // Exit point: wall.x - heroWidth/2 - 4 = 130 - 20 - 4 = 106
      expect(result?.exitX).toBe(106);
    });

    it('denies tunneling through thick obstacle (thickness > 80 px)', () => {
      const heroX = 100;
      const heroY = 200;
      const heroWidth = 40;
      const heroHeight = 40;

      // Large platform of thickness 250 px (> 80 px)
      const thickObstacle: Platform = {
        x: 120,
        y: 180,
        width: 250,
        height: 60
      };

      const result = checkTunnelObstacle(
        heroX,
        heroY,
        heroWidth,
        heroHeight,
        'right',
        thickObstacle
      );
      expect(result).not.toBeNull();
      expect(result?.canTunnel).toBe(false);
      expect(result?.thickness).toBe(250);
    });

    it('ignores platform when hero does not overlap vertically', () => {
      const heroX = 100;
      const heroY = 200;
      const heroWidth = 40;
      const heroHeight = 40;

      // Platform far above the hero
      const highPlatform: Platform = {
        x: 120,
        y: 50,
        width: 30,
        height: 40
      };

      const result = checkTunnelObstacle(
        heroX,
        heroY,
        heroWidth,
        heroHeight,
        'right',
        highPlatform
      );
      expect(result).toBeNull();
    });
  });

  describe('Pauli Exclusion Repulsion (type: "pauli")', () => {
    it('repels two clones closer than 75 px with opposite +/- 620 px/s velocity and -580 px/s vertical kick', () => {
      const currentTime = 1000;
      const heroes = [
        { id: 1, x: 200, y: 300, pauliGraceUntil: 0, upsideDown: 1 },
        { id: 2, x: 230, y: 300, pauliGraceUntil: 0, upsideDown: 1 } // dist = 30 px (< 75)
      ];

      const events = checkPauliRepulsion(heroes, currentTime, 75, 500);
      expect(events).toHaveLength(1);

      const ev = events[0];
      expect(ev.heroAId).toBe(1);
      expect(ev.heroBId).toBe(2);

      // Hero 1 (on the left) is pushed left (-620)
      expect(ev.impulseA.vx).toBe(-620);
      expect(ev.impulseA.vy).toBe(-580);

      // Hero 2 (on the right) is pushed right (+620)
      expect(ev.impulseB.vx).toBe(620);
      expect(ev.impulseB.vy).toBe(-580);

      // Grace period set to currentTime + 500ms
      expect(ev.newGraceUntil).toBe(1500);
    });

    it('respects the 500 ms grace period after spawn to prevent instant explosion', () => {
      const currentTime = 200;
      const heroes = [
        { id: 1, x: 200, y: 300, pauliGraceUntil: 500 }, // in grace period until 500 ms
        { id: 2, x: 220, y: 300, pauliGraceUntil: 0 }
      ];

      const events = checkPauliRepulsion(heroes, currentTime, 60, 500);
      expect(events).toHaveLength(0);
    });

    it('does not trigger repulsion when distance >= 60 px', () => {
      const currentTime = 1000;
      const heroes = [
        { id: 1, x: 100, y: 300, pauliGraceUntil: 0 },
        { id: 2, x: 180, y: 300, pauliGraceUntil: 0 } // dist = 80 px (>= 60)
      ];

      const events = checkPauliRepulsion(heroes, currentTime, 60, 500);
      expect(events).toHaveLength(0);
    });

    it('correctly handles gravity inversion for upside-down clones', () => {
      const currentTime = 1000;
      const heroes = [
        { id: 1, x: 200, y: 300, pauliGraceUntil: 0, upsideDown: -1 },
        { id: 2, x: 240, y: 300, pauliGraceUntil: 0, upsideDown: -1 }
      ];

      const events = checkPauliRepulsion(heroes, currentTime, 60, 500);
      expect(events).toHaveLength(1);
      // For upsideDown === -1, -580 * (-1) = +580 (kicks downwards away from ceiling)
      expect(events[0].impulseA.vy).toBe(580);
      expect(events[0].impulseB.vy).toBe(580);
    });
  });

  describe('Phase Platforms (phase: "cyan" | "magenta")', () => {
    it('alternates phase seamlessly on jump', () => {
      let phase: PlatformPhase = 'cyan';
      phase = togglePhase(phase);
      expect(phase).toBe('magenta');

      phase = togglePhase(phase);
      expect(phase).toBe('cyan');

      phase = togglePhase(phase);
      expect(phase).toBe('magenta');
    });
  });

  describe('Radioactive Half-Life Platform Decay (decayMs)', () => {
    it('remains stable and solid when not triggered', () => {
      const state = {
        timerMs: 0,
        decayMs: 600,
        triggered: false,
        collapsed: false
      };

      const update = updateDecayPlatform(state, 100);
      expect(update.solid).toBe(true);
      expect(update.collapsed).toBe(false);
      expect(update.alpha).toBe(1.0);
      expect(update.shaking).toBe(false);
    });

    it('shakes and blinks during countdown after trigger', () => {
      const state = {
        timerMs: 0,
        decayMs: 600,
        triggered: true,
        collapsed: false
      };

      const update = updateDecayPlatform(state, 200);
      expect(update.solid).toBe(true);
      expect(update.collapsed).toBe(false);
      expect(update.shaking).toBe(true);
      expect(update.alpha).toBeGreaterThan(0);
      expect(state.timerMs).toBe(200);
    });

    it('collapses, disables collision, and sets alpha 0 when decayMs is reached', () => {
      const state = {
        timerMs: 500,
        decayMs: 600,
        triggered: true,
        collapsed: false
      };

      const update = updateDecayPlatform(state, 150); // reaches 650 >= 600
      expect(update.solid).toBe(false);
      expect(update.collapsed).toBe(true);
      expect(update.alpha).toBe(0);
      expect(state.collapsed).toBe(true);
    });

    it('slows decay countdown to 25% under Time Dilation', () => {
      const state = {
        timerMs: 0,
        decayMs: 600,
        triggered: true,
        collapsed: false
      };

      // In 400ms under 0.25 time dilation, only 100ms advances
      const update = updateDecayPlatform(state, 400, 0.25);
      expect(state.timerMs).toBe(100);
      expect(update.collapsed).toBe(false);
      expect(update.solid).toBe(true);
    });
  });

  describe('Gravitational Collapse (LevelData.collapse)', () => {
    const config: CollapseConfig = {
      speedY: 40, // 40 px/s
      delayMs: 3000 // starts after 3000 ms
    };

    it('remains inactive before delayMs is reached', () => {
      const result = calculateCollapse(config, 2000, 16);
      expect(result.active).toBe(false);
      expect(result.stepY).toBe(0);
    });

    it('advances spikes at full speed after delayMs is exceeded', () => {
      // 1000 ms step at 40 px/s = 40 px
      const result = calculateCollapse(config, 3500, 1000, 1.0);
      expect(result.active).toBe(true);
      expect(result.stepY).toBe(40);
    });

    it('divides collapse speed by 4 under Time Dilation', () => {
      // Under 0.25 dilation, 1000 ms step at 40 px/s = 10 px
      const result = calculateCollapse(config, 3500, 1000, 0.25);
      expect(result.active).toBe(true);
      expect(result.stepY).toBe(10);
    });
  });
});
