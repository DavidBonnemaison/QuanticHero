export const MAX_TETHER_X = 24;
export const DEADZONE_X = 8;
export const FLICK_JUMP_THRESHOLD_Y = 18;
export const JUMP_REARM_DROP_Y = 8;
export const FLICK_DOWN_THRESHOLD_Y = 28;
export const FLICK_DOWN_WINDOW_MS = 120;
export const DOUBLE_TAP_WINDOW_MS = 220;

export interface TouchInputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpJustPressed?: boolean;
  jumpHeld?: boolean;
  diveRequested?: boolean;
}

export interface PointerDownResult {
  doubleTap: boolean;
  isPrimary?: boolean;
}

export class MobileTouchController {
  public isPointerDown = false;
  public activePointerId: number | null = null;
  public anchorX = 0;
  public anchorY = 0;
  public pointerX = 0;
  public pointerY = 0;
  public minPointerY = 0;

  private lastPointerDownTime = Number.NEGATIVE_INFINITY;
  private anchorTimeMs = 0;
  private jumpActive = false;

  public state: TouchInputState = {
    left: false,
    right: false,
    jump: false,
    jumpJustPressed: false,
    jumpHeld: false,
    diveRequested: false
  };

  public onPointerDown(x: number, y: number, timeMs: number, pointerId = 0): PointerDownResult {
    if (this.isPointerDown && this.activePointerId !== null && this.activePointerId !== pointerId) {
      return { doubleTap: false, isPrimary: false };
    }

    const doubleTap = timeMs - this.lastPointerDownTime < DOUBLE_TAP_WINDOW_MS;
    this.lastPointerDownTime = doubleTap ? Number.NEGATIVE_INFINITY : timeMs;

    this.isPointerDown = true;
    this.activePointerId = pointerId;
    this.anchorX = x;
    this.anchorY = y;
    this.pointerX = x;
    this.pointerY = y;
    this.minPointerY = y;
    this.anchorTimeMs = timeMs;
    this.jumpActive = false;

    this.state.left = false;
    this.state.right = false;
    this.state.jump = false;
    this.state.jumpJustPressed = false;
    this.state.jumpHeld = false;
    this.state.diveRequested = false;

    return { doubleTap, isPrimary: true };
  }

  public onPointerMove(
    x: number,
    y: number,
    timeMs: number,
    touchingGround = false,
    pointerId?: number
  ): TouchInputState {
    if (!this.isPointerDown) return this.state;
    if (
      pointerId !== undefined &&
      this.activePointerId !== null &&
      pointerId !== this.activePointerId
    ) {
      return this.state;
    }

    this.pointerX = x;
    this.pointerY = y;

    // 1. Floating Thumb-Ribbon horizontal anchor
    if (x - this.anchorX > MAX_TETHER_X) {
      this.anchorX = x - MAX_TETHER_X;
    } else if (x - this.anchorX < -MAX_TETHER_X) {
      this.anchorX = x + MAX_TETHER_X;
    }

    const dx = x - this.anchorX;
    this.state.right = dx > DEADZONE_X;
    this.state.left = dx < -DEADZONE_X;

    // 2. Impulse Flick-Jump & Flick-Down
    if (!this.jumpActive) {
      const dy = y - this.anchorY;
      if (dy < -FLICK_JUMP_THRESHOLD_Y) {
        this.jumpActive = true;
        this.minPointerY = y;
        this.state.jump = true;
        this.state.jumpJustPressed = true;
        this.state.jumpHeld = true;
      } else if (
        !touchingGround &&
        dy > FLICK_DOWN_THRESHOLD_Y &&
        timeMs - this.anchorTimeMs < FLICK_DOWN_WINDOW_MS
      ) {
        this.state.diveRequested = true;
        this.anchorY = y;
        this.anchorTimeMs = timeMs;
        this.minPointerY = y;
      } else if (y > this.anchorY && timeMs - this.anchorTimeMs >= FLICK_DOWN_WINDOW_MS) {
        // Slowly re-center vertical anchor on slow downward drift
        this.anchorY = y;
        this.anchorTimeMs = timeMs;
      }
    } else {
      if (y < this.minPointerY) {
        this.minPointerY = y;
      }
      if (y - this.minPointerY >= JUMP_REARM_DROP_Y) {
        this.state.jump = false;
        this.state.jumpHeld = false;
        this.jumpActive = false;
        this.anchorY = y;
        this.anchorTimeMs = timeMs;
        this.minPointerY = y;
      }
    }

    return this.state;
  }

  public onPointerUp(pointerId?: number): TouchInputState {
    if (
      pointerId !== undefined &&
      this.activePointerId !== null &&
      pointerId !== this.activePointerId
    ) {
      return this.state;
    }

    this.isPointerDown = false;
    this.activePointerId = null;
    this.jumpActive = false;
    this.state.left = false;
    this.state.right = false;
    this.state.jump = false;
    this.state.jumpJustPressed = false;
    this.state.jumpHeld = false;
    this.state.diveRequested = false;
    return this.state;
  }

  public consumeFrameFlags(): void {
    this.state.jumpJustPressed = false;
    this.state.diveRequested = false;
  }

  public reset(): void {
    this.onPointerUp();
    this.lastPointerDownTime = Number.NEGATIVE_INFINITY;
    this.anchorX = 0;
    this.anchorY = 0;
    this.pointerX = 0;
    this.pointerY = 0;
    this.minPointerY = 0;
    this.anchorTimeMs = 0;
  }
}
