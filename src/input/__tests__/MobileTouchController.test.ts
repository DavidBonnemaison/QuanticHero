import { describe, expect, it } from 'vitest';
import { PHYSICS } from '../../physics/constants';
import { stepHeroControl } from '../../physics/stepHeroPhysics';
import {
  DEADZONE_X,
  DOUBLE_TAP_WINDOW_MS,
  FLICK_DOWN_THRESHOLD_Y,
  FLICK_DOWN_WINDOW_MS,
  FLICK_JUMP_THRESHOLD_Y,
  JUMP_REARM_DROP_Y,
  MAX_TETHER_X,
  MobileTouchController
} from '../MobileTouchController';

describe('Spec-03 MobileTouchController', () => {
  describe('Floating Thumb-Ribbon (horizontal sliding anchor)', () => {
    it('ignores movement within DEADZONE_X (8 px)', () => {
      const ctrl = new MobileTouchController();
      ctrl.onPointerDown(100, 500, 100);

      ctrl.onPointerMove(100 + DEADZONE_X, 500, 116);
      expect(ctrl.state.left).toBe(false);
      expect(ctrl.state.right).toBe(false);

      ctrl.onPointerMove(100 - DEADZONE_X, 500, 132);
      expect(ctrl.state.left).toBe(false);
      expect(ctrl.state.right).toBe(false);
    });

    it('clamps anchorX to MAX_TETHER_X (24 px) and reverses direction immediately on pullback', () => {
      const ctrl = new MobileTouchController();
      ctrl.onPointerDown(100, 500, 100);

      // Slide +120 px right -> anchorX follows to 220 - 24 = 196
      ctrl.onPointerMove(220, 500, 150);
      expect(ctrl.anchorX).toBe(220 - MAX_TETHER_X);
      expect(ctrl.state.right).toBe(true);
      expect(ctrl.state.left).toBe(false);

      // Pull back -18 px (x = 202, dx = +6): immediately stops running right
      ctrl.onPointerMove(202, 500, 170);
      expect(ctrl.state.right).toBe(false);
      expect(ctrl.state.left).toBe(false);

      // Pull back past deadzone (x = 187, dx = -9 < -8): immediately runs left
      ctrl.onPointerMove(187, 500, 190);
      expect(ctrl.state.left).toBe(true);
      expect(ctrl.state.right).toBe(false);
    });

    it('handles symmetric left slide and immediate right reversal', () => {
      const ctrl = new MobileTouchController();
      ctrl.onPointerDown(300, 500, 100);

      // Slide -150 px left -> anchorX follows to 150 + 24 = 174
      ctrl.onPointerMove(150, 500, 150);
      expect(ctrl.anchorX).toBe(150 + MAX_TETHER_X);
      expect(ctrl.state.left).toBe(true);
      expect(ctrl.state.right).toBe(false);

      // Move +33 px right (x = 183, dx = +9 > 8): immediately runs right
      ctrl.onPointerMove(183, 500, 180);
      expect(ctrl.state.right).toBe(true);
      expect(ctrl.state.left).toBe(false);
    });
  });

  describe('Impulse Flick-Jump & Variable Jump Re-arm', () => {
    it('triggers jumpJustPressed and jumpHeld when flicking up past -18 px, then re-arms on +8 px drop', () => {
      const ctrl = new MobileTouchController();
      ctrl.onPointerDown(200, 600, 100);

      // Flick up -19 px (< -18)
      ctrl.onPointerMove(200, 600 - FLICK_JUMP_THRESHOLD_Y - 1, 120);
      expect(ctrl.state.jump).toBe(true);
      expect(ctrl.state.jumpJustPressed).toBe(true);
      expect(ctrl.state.jumpHeld).toBe(true);

      // Consume one-frame edge flag
      ctrl.consumeFrameFlags();
      expect(ctrl.state.jumpJustPressed).toBe(false);
      expect(ctrl.state.jumpHeld).toBe(true);

      // Continue moving higher to y = 550 -> minPointerY updates
      ctrl.onPointerMove(200, 550, 140);
      expect(ctrl.minPointerY).toBe(550);
      expect(ctrl.state.jumpHeld).toBe(true);

      // Drop +8 px from minPointerY (y = 558) -> releases jumpHeld and re-arms anchorY
      ctrl.onPointerMove(200, 550 + JUMP_REARM_DROP_Y, 160);
      expect(ctrl.state.jump).toBe(false);
      expect(ctrl.state.jumpHeld).toBe(false);
      expect(ctrl.anchorY).toBe(550 + JUMP_REARM_DROP_Y);

      // Immediate second flick-jump without lifting thumb
      ctrl.onPointerMove(200, ctrl.anchorY - FLICK_JUMP_THRESHOLD_Y - 2, 180);
      expect(ctrl.state.jump).toBe(true);
      expect(ctrl.state.jumpJustPressed).toBe(true);
      expect(ctrl.state.jumpHeld).toBe(true);
    });
  });

  describe('Flick-Down Gravitational Dive', () => {
    it('triggers diveRequested on fast downward flick (> 28 px in < 120 ms) while airborne', () => {
      const ctrl = new MobileTouchController();
      ctrl.onPointerDown(200, 500, 1000);

      ctrl.onPointerMove(200, 500 + FLICK_DOWN_THRESHOLD_Y + 2, 1000 + 60, false);
      expect(ctrl.state.diveRequested).toBe(true);

      ctrl.consumeFrameFlags();
      expect(ctrl.state.diveRequested).toBe(false);
    });

    it('does not trigger diveRequested if slow (>= 120 ms) or touching ground', () => {
      const ctrl = new MobileTouchController();
      ctrl.onPointerDown(200, 500, 1000);

      // Too slow
      ctrl.onPointerMove(
        200,
        500 + FLICK_DOWN_THRESHOLD_Y + 10,
        1000 + FLICK_DOWN_WINDOW_MS,
        false
      );
      expect(ctrl.state.diveRequested).toBe(false);

      // On ground
      ctrl.onPointerDown(200, 500, 2000);
      ctrl.onPointerMove(200, 500 + FLICK_DOWN_THRESHOLD_Y + 10, 2050, true);
      expect(ctrl.state.diveRequested).toBe(false);
    });

    it('halves horizontal velocity and applies 720 * upsideDown vertical velocity in stepHeroControl', () => {
      const normalDive = stepHeroControl(
        {
          vx: 350,
          vy: -100,
          touchingGround: false,
          recoilTimer: 0,
          recoilVx: 0,
          velocityMultiplier: 1,
          upsideDown: 1,
          flipX: false,
          animState: 'jump',
          isActive: true
        },
        { left: false, right: false, jump: false, dive: true }
      );
      expect(normalDive.dived).toBe(true);
      expect(normalDive.vy).toBe(PHYSICS.DIVE_VY);
      expect(normalDive.vx).toBeLessThan(200);

      const invertedDive = stepHeroControl(
        {
          vx: -300,
          vy: 50,
          touchingGround: false,
          recoilTimer: 0,
          recoilVx: 0,
          velocityMultiplier: 1,
          upsideDown: -1,
          flipX: true,
          animState: 'jump',
          isActive: true
        },
        { left: false, right: false, jump: false, dive: true }
      );
      expect(invertedDive.dived).toBe(true);
      expect(invertedDive.vy).toBe(-PHYSICS.DIVE_VY);
      expect(invertedDive.vx).toBeGreaterThan(-175);
    });
  });

  describe('Quantum Orbit Switcher (Double-Tap & Hold)', () => {
    it('detects double-tap within < 220 ms and keeps pointer active as running anchor', () => {
      const ctrl = new MobileTouchController();

      const first = ctrl.onPointerDown(250, 500, 1000);
      expect(first.doubleTap).toBe(false);
      ctrl.onPointerUp();

      const second = ctrl.onPointerDown(255, 505, 1000 + DOUBLE_TAP_WINDOW_MS - 40);
      expect(second.doubleTap).toBe(true);
      expect(ctrl.isPointerDown).toBe(true);
      expect(ctrl.anchorX).toBe(255);

      // Immediately slide right without lifting thumb -> steers newly focused clone
      ctrl.onPointerMove(275, 505, 1200);
      expect(ctrl.state.right).toBe(true);
    });

    it('does not trigger double-tap when interval >= 220 ms', () => {
      const ctrl = new MobileTouchController();

      expect(ctrl.onPointerDown(250, 500, 1000).doubleTap).toBe(false);
      ctrl.onPointerUp();

      expect(ctrl.onPointerDown(250, 500, 1000 + DOUBLE_TAP_WINDOW_MS).doubleTap).toBe(false);
    });

    it('resets all active states on pointerup', () => {
      const ctrl = new MobileTouchController();
      ctrl.onPointerDown(100, 500, 100);
      ctrl.onPointerMove(150, 460, 120, false);
      expect(ctrl.state.right).toBe(true);
      expect(ctrl.state.jump).toBe(true);

      ctrl.onPointerUp();
      expect(ctrl.isPointerDown).toBe(false);
      expect(ctrl.state.left).toBe(false);
      expect(ctrl.state.right).toBe(false);
      expect(ctrl.state.jump).toBe(false);
      expect(ctrl.state.jumpHeld).toBe(false);
      expect(ctrl.state.jumpJustPressed).toBe(false);
      expect(ctrl.state.diveRequested).toBe(false);
    });
  });

  describe('Multi-touch pointerId isolation', () => {
    it('ignores secondary pointer down/move/up while primary pointer is active', () => {
      const ctrl = new MobileTouchController();

      // Primary thumb (pointerId = 1) starts running right
      const primaryDown = ctrl.onPointerDown(100, 500, 100, 1);
      expect(primaryDown.isPrimary).toBe(true);
      expect(ctrl.activePointerId).toBe(1);
      ctrl.onPointerMove(120, 500, 120, true, 1);
      expect(ctrl.state.right).toBe(true);
      expect(ctrl.anchorX).toBe(100);

      // 2nd finger (pointerId = 2) touches down elsewhere -> must NOT overwrite anchor or stop running
      const secondaryDown = ctrl.onPointerDown(400, 300, 140, 2);
      expect(secondaryDown.isPrimary).toBe(false);
      expect(secondaryDown.doubleTap).toBe(false);
      expect(ctrl.activePointerId).toBe(1);
      expect(ctrl.anchorX).toBe(100);
      expect(ctrl.anchorY).toBe(500);
      expect(ctrl.state.right).toBe(true);

      // 2nd finger moves -> must NOT affect Thumb-Ribbon state
      ctrl.onPointerMove(350, 200, 160, false, 2);
      expect(ctrl.state.right).toBe(true);
      expect(ctrl.state.left).toBe(false);
      expect(ctrl.state.jump).toBe(false);

      // 2nd finger releases -> must NOT release primary Thumb-Ribbon
      ctrl.onPointerUp(2);
      expect(ctrl.isPointerDown).toBe(true);
      expect(ctrl.activePointerId).toBe(1);
      expect(ctrl.state.right).toBe(true);

      // Primary thumb releases -> releases Thumb-Ribbon
      ctrl.onPointerUp(1);
      expect(ctrl.isPointerDown).toBe(false);
      expect(ctrl.activePointerId).toBeNull();
      expect(ctrl.state.right).toBe(false);
    });
  });
});
