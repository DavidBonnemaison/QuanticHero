import Phaser from 'phaser';
import type { TouchInputState } from '../input/MobileTouchController';
import { PHYSICS } from '../physics/constants';
import {
  clampFallVelocity,
  getAsymmetricGravityMultiplier,
  stepHeroControl
} from '../physics/stepHeroPhysics';
import { gameEvents } from '../tools/gameEvents';
import type { EntanglementMode } from '../types';

export type { TouchInputState };

export default class Hero extends Phaser.Physics.Arcade.Sprite {
  public id: number;
  public isFocused: boolean;
  public velocityMultiplier = 1;
  public upsideDown = 1;
  public recoilTimer = 0;
  public recoilVx = 0;
  public isEntangled = false;
  public isBeta = false;
  public entanglementMode?: EntanglementMode;
  public enteredPortal = false;
  public tunnelCharges = 0;
  public pauliGraceUntil = 0;
  public isDiving = false;
  public lastGroundedTimeMs = Number.NEGATIVE_INFINITY;
  public lastJumpPressedTimeMs = Number.NEGATIVE_INFINITY;
  public hasJumpedSinceGrounded = false;
  public prevJumpPressed = false;
  public jumpCutApplied = false;
  public lastDiveEndTimeMs = Number.NEGATIVE_INFINITY;
  public waveDashUntilMs = Number.NEGATIVE_INFINITY;
  public wasTouchingGround = false;
  public lastLandedPlatform: Phaser.GameObjects.GameObject | null = null;
  public fusionStack = 1;
  public createdAtMs = 0;
  public onCryo = false;
  public inLiquid = false;
  public wormholeCooldownUntil = 0;
  public hasSurfedThisJump = false;
  public levitateUntilMs = 0;
  public trailPoints: Array<{ x: number; y: number }> = [];
  private lastTrailSampleMs = Number.NEGATIVE_INFINITY;
  private elapsedTimeMs = 0;
  private lastAirborneVy = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, isFocused = true) {
    super(scene, x, y, isFocused ? 'hero' : 'disabled');
    this.id = Math.random();
    this.isFocused = isFocused;
    this.createdAtMs = scene?.time?.now ?? 0;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setBounce(0, 0);
    this.setCollideWorldBounds(false);
    this.play(this.getAnimKey('idle'));

    if (Phaser.Geom?.Rectangle) {
      const w = this.width || PHYSICS.HERO_WIDTH;
      const h = this.height || PHYSICS.HERO_HEIGHT;
      const hitW = Math.max(64, w);
      const hitH = Math.max(64, h);
      this.setInteractive(
        new Phaser.Geom.Rectangle((w - hitW) / 2, (h - hitH) / 2, hitW, hitH),
        Phaser.Geom.Rectangle.Contains
      );
    } else {
      this.setInteractive();
    }
    this.on('pointerdown', () => {
      this.scene.events.emit('hero-clicked', this);
    });
  }

  public setEntangled(isBeta: boolean, mode: EntanglementMode): void {
    this.isEntangled = true;
    this.isBeta = isBeta;
    this.entanglementMode = mode;
    if (isBeta) {
      this.setTint(0xec4899);
      if (mode === 'inverted_gravity' || mode === 'mirror_and_gravity') {
        this.setGravityInverted(true);
      }
    } else {
      this.clearTint();
    }
  }

  public setFusionStack(stack: number): void {
    this.fusionStack = Math.max(1, stack);
    const baseScale = this.fusionStack >= 2 ? PHYSICS.SUPER_QUANTA_SCALE : 1;
    if (typeof this.setScale === 'function') {
      this.setScale(baseScale, baseScale);
    }
    if (this.fusionStack >= 2) {
      this.setTint(0xfbbf24);
    } else if (!this.isEntangled) {
      if (this.isFocused) {
        this.clearTint();
      } else {
        this.setTint(0x38bdf8);
      }
    }
  }

  public setFocus(focused: boolean): void {
    this.isFocused = focused;
    this.setTexture(focused ? 'hero' : 'disabled');
    this.play(this.getAnimKey('idle'), true);
    if (this.fusionStack >= 2) {
      this.setTint(0xfbbf24);
    }
  }

  public setGravityInverted(inverted: boolean): void {
    this.upsideDown = inverted ? -1 : 1;
    this.setFlipY(inverted);
  }

  private getAnimKey(base: 'left' | 'right' | 'idle' | 'jump'): string {
    return this.isFocused ? base : `disabled-${base}`;
  }

  private tweenSquashStretch(
    startScaleX: number,
    startScaleY: number,
    duration: number,
    ease: string
  ): void {
    const baseScale = this.fusionStack >= 2 ? PHYSICS.SUPER_QUANTA_SCALE : 1;
    const applyBodyAnchor = (sy: number) => {
      const arcadeBody = this.body as Phaser.Physics.Arcade.Body | undefined;
      if (arcadeBody && typeof arcadeBody.setOffset === 'function' && sy > 0) {
        // Keep body bottom anchored when sprite scales vertically around center origin (0.5, 0.5)
        const halfH = PHYSICS.HERO_HEIGHT / 2;
        const baseOffsetY = (this.height - arcadeBody.height) / 2;
        arcadeBody.setOffset(arcadeBody.offset.x, baseOffsetY + halfH * (1 - 1 / sy));
      }
    };
    if (typeof this.setScale === 'function') {
      this.setScale(startScaleX * baseScale, startScaleY * baseScale);
      applyBodyAnchor(startScaleY * baseScale);
    }
    if (this.scene?.tweens?.add) {
      this.scene.tweens.killTweensOf?.(this);
      this.scene.tweens.add({
        targets: this,
        scaleX: baseScale,
        scaleY: baseScale,
        duration,
        ease,
        onUpdate: () => applyBodyAnchor(this.scaleY),
        onComplete: () => applyBodyAnchor(baseScale)
      });
    }
  }

  private spawnLandingDust(): void {
    if (!this.scene?.add?.circle || !this.scene?.tweens?.add) return;
    const footY = this.y + (PHYSICS.HERO_HEIGHT / 2) * this.upsideDown;
    for (let i = 0; i < 6; i++) {
      const dir = i < 3 ? -1 : 1;
      const spreadX = dir * (12 + (i % 3) * 10);
      const liftY = -this.upsideDown * (4 + (i % 2) * 5);
      const puff = this.scene.add.circle(this.x + dir * 4, footY, 3, 0x00e5ff, 0.85);
      puff.setDepth(19);
      this.scene.tweens.add({
        targets: puff,
        x: puff.x + spreadX,
        y: puff.y + liftY,
        alpha: 0,
        scale: 0.2,
        duration: 220,
        ease: 'Sine.easeOut',
        onComplete: () => puff.destroy()
      });
    }
  }

  private spawnWallSparks(normalDir: 1 | -1): void {
    if (!this.scene?.add?.circle || !this.scene?.tweens?.add) return;
    const contactX = this.x - normalDir * (PHYSICS.HERO_WIDTH / 2);
    for (let i = 0; i < 6; i++) {
      const speedX = normalDir * (18 + (i % 3) * 12);
      const speedY = ((i % 3) - 1) * 14;
      const spark = this.scene.add.circle(contactX, this.y, 2.5, 0x00e5ff, 0.95);
      spark.setDepth(21);
      this.scene.tweens.add({
        targets: spark,
        x: spark.x + speedX,
        y: spark.y + speedY,
        alpha: 0,
        scale: 0.2,
        duration: 180,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy()
      });
    }
  }

  private triggerNeonWallHitStop(normalDir: 1 | -1): void {
    this.tweenSquashStretch(0.65, 1.32, 140, 'Back.easeOut');
    this.spawnWallSparks(normalDir);
    if (this.body && 'moves' in this.body && this.scene?.time?.delayedCall) {
      const arcadeBody = this.body as Phaser.Physics.Arcade.Body;
      arcadeBody.moves = false;
      this.scene.time.delayedCall(22, () => {
        if (this.active && this.body) {
          (this.body as Phaser.Physics.Arcade.Body).moves = true;
        }
      });
    }
  }

  public bounceOffLeftWall(isNeonWall = false): void {
    if (this.recoilVx <= 0) {
      this.recoilVx = PHYSICS.WALL_RECOIL_VX * this.velocityMultiplier;
      this.recoilTimer = PHYSICS.WALL_RECOIL_TIMER_MS;
      if (isNeonWall) {
        this.setVelocityY(-400 * this.upsideDown);
        this.triggerNeonWallHitStop(1);
        return;
      }
      const touchingGround =
        this.upsideDown === 1
          ? this.body?.touching.down || this.body?.blocked.down
          : this.body?.touching.up || this.body?.blocked.up;
      if (touchingGround) {
        this.setVelocityY(PHYSICS.WALL_RECOIL_VY_JUMP * this.upsideDown);
      } else if (this.body && this.body.velocity.y * this.upsideDown > -50) {
        this.setVelocityY(PHYSICS.WALL_RECOIL_VY * this.upsideDown);
      }
    }
  }

  public bounceOffRightWall(isNeonWall = false): void {
    if (this.recoilVx >= 0) {
      this.recoilVx = -PHYSICS.WALL_RECOIL_VX * this.velocityMultiplier;
      this.recoilTimer = PHYSICS.WALL_RECOIL_TIMER_MS;
      if (isNeonWall) {
        this.setVelocityY(-400 * this.upsideDown);
        this.triggerNeonWallHitStop(-1);
        return;
      }
      const touchingGround =
        this.upsideDown === 1
          ? this.body?.touching.down || this.body?.blocked.down
          : this.body?.touching.up || this.body?.blocked.up;
      if (touchingGround) {
        this.setVelocityY(PHYSICS.WALL_RECOIL_VY_JUMP * this.upsideDown);
      } else if (this.body && this.body.velocity.y * this.upsideDown > -50) {
        this.setVelocityY(PHYSICS.WALL_RECOIL_VY * this.upsideDown);
      }
    }
  }

  public bounceOffCeiling(): void {
    if (this.upsideDown === 1 && (!this.body || this.body.velocity.y < 50)) {
      this.setVelocityY(PHYSICS.CEILING_BOUNCE_VY);
    } else if (this.upsideDown === -1 && (!this.body || this.body.velocity.y > -50)) {
      this.setVelocityY(-PHYSICS.CEILING_BOUNCE_VY);
    }
  }

  public getAnimState(): 'idle' | 'left' | 'right' | 'jump' {
    const key = this.anims.currentAnim?.key;
    if (key?.includes('jump')) return 'jump';
    if (key?.includes('left')) return 'left';
    if (key?.includes('right')) return 'right';
    return 'idle';
  }

  public updateControl(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys | null,
    wasd: { [key: string]: Phaser.Input.Keyboard.Key } | null,
    touch: TouchInputState,
    delta = PHYSICS.DELTA_FIXED_MS
  ): void {
    if (!this.body) return;

    if (this.enteredPortal) {
      this.setVelocity(0, 0);
      this.play(this.getAnimKey('idle'), true);
      return;
    }

    this.elapsedTimeMs += delta;
    const nowMs = this.elapsedTimeMs;

    const rawLeft = (cursors?.left?.isDown ?? false) || (wasd?.A?.isDown ?? false) || touch.left;
    const rawRight = (cursors?.right?.isDown ?? false) || (wasd?.D?.isDown ?? false) || touch.right;
    const jump =
      (cursors?.up?.isDown ?? false) ||
      (wasd?.W?.isDown ?? false) ||
      (cursors?.space?.isDown ?? false) ||
      touch.jump;
    const dive =
      (cursors?.down?.isDown ?? false) ||
      (wasd?.S?.isDown ?? false) ||
      Boolean(touch.diveRequested);

    let goLeft = rawLeft;
    let goRight = rawRight;

    if (this.isEntangled && this.isBeta) {
      if (this.entanglementMode === 'mirror_x' || this.entanglementMode === 'mirror_and_gravity') {
        goLeft = rawRight;
        goRight = rawLeft;
      }
    }

    const touchingGround =
      this.upsideDown === 1
        ? this.body.touching.down || this.body.blocked.down
        : this.body.touching.up || this.body.blocked.up;

    if (touchingGround && !this.wasTouchingGround) {
      const impactSpeed = Math.abs(this.lastAirborneVy);
      if (impactSpeed >= 80) {
        const intensity = Math.min(1, Math.max(0.35, impactSpeed / 450));
        this.tweenSquashStretch(1 + 0.28 * intensity, 1 - 0.26 * intensity, 120, 'Sine.easeOut');
        this.spawnLandingDust();
      }
    }

    if (touchingGround) {
      this.lastGroundedTimeMs = nowMs;
      this.hasJumpedSinceGrounded = false;
      this.jumpCutApplied = false;
      this.hasSurfedThisJump = false;
      if (this.isDiving) {
        this.isDiving = false;
        this.lastDiveEndTimeMs = nowMs;
      }
    } else {
      this.lastAirborneVy = this.body.velocity.y;
      this.lastLandedPlatform = null;
      this.onCryo = false;
      if (nowMs - this.lastTrailSampleMs >= 24) {
        this.lastTrailSampleMs = nowMs;
        this.trailPoints.push({ x: this.x, y: this.y });
        if (this.trailPoints.length > PHYSICS.BROGLIE_TRAIL_POINTS) {
          this.trailPoints.shift();
        }
      }
    }

    const wasRecoiling = this.recoilTimer > 0;
    const isActive = this.isEntangled || this.isFocused;

    const res = stepHeroControl(
      {
        vx: this.body.velocity.x,
        vy: this.body.velocity.y,
        touchingGround,
        recoilTimer: this.recoilTimer,
        recoilVx: this.recoilVx,
        velocityMultiplier: this.velocityMultiplier,
        upsideDown: this.upsideDown,
        flipX: this.flipX,
        animState: this.getAnimState(),
        isActive,
        nowMs,
        lastGroundedTimeMs: this.lastGroundedTimeMs,
        lastJumpPressedTimeMs: this.lastJumpPressedTimeMs,
        hasJumpedSinceGrounded: this.hasJumpedSinceGrounded,
        prevJumpPressed: this.prevJumpPressed,
        jumpCutApplied: this.jumpCutApplied,
        isDiving: this.isDiving,
        lastDiveEndTimeMs: this.lastDiveEndTimeMs,
        waveDashUntilMs: this.waveDashUntilMs,
        jumpMultiplier: this.fusionStack >= 2 ? PHYSICS.SUPER_QUANTA_JUMP_MULT : 1,
        onCryo: this.onCryo
      },
      { left: goLeft, right: goRight, jump, dive },
      delta
    );

    this.recoilTimer = res.recoilTimer;
    this.recoilVx = res.recoilVx;
    this.setVelocityX(res.vx);
    if (res.jumped) {
      this.isDiving = false;
      this.hasJumpedSinceGrounded = true;
      this.jumpCutApplied = false;
      this.lastJumpPressedTimeMs = Number.NEGATIVE_INFINITY;
      this.lastGroundedTimeMs = Number.NEGATIVE_INFINITY;
      this.levitateUntilMs = 0;
      this.setVelocityY(res.vy);
      this.tweenSquashStretch(0.78, 1.25, 140, 'Back.easeOut');
      if (res.waveDashed) {
        this.waveDashUntilMs = nowMs + PHYSICS.WAVE_DASH_DURATION_MS;
        this.lastDiveEndTimeMs = Number.NEGATIVE_INFINITY;
        gameEvents.emit('hero:wavedash', { x: this.x, y: this.y });
      }
      gameEvents.emit('hero:jump');
    } else {
      if (res.dived) {
        this.isDiving = true;
        this.setVelocityY(res.vy);
        gameEvents.emit('hero:dive', { x: this.x, y: this.y });
      } else if (res.jumpCut) {
        this.jumpCutApplied = true;
        this.setVelocityY(res.vy);
      }
      const jumpJustPressed = jump && !this.prevJumpPressed;
      if (!touchingGround && jumpJustPressed) {
        this.lastJumpPressedTimeMs = nowMs;
      }
    }

    this.prevJumpPressed = jump;
    this.wasTouchingGround = touchingGround;

    // Asymmetric gravity (Apex Hang-Time & Fall Gravity) + Terminal Velocity
    const asymFactor = getAsymmetricGravityMultiplier(
      this.body.velocity.y,
      this.upsideDown,
      touchingGround && !res.jumped
    );
    const worldGravityY = this.scene?.physics?.world?.gravity?.y ?? PHYSICS.GRAVITY_Y;
    const effectiveBaseGravity = Math.abs(worldGravityY) * this.upsideDown;
    const arcadeBody = this.body as Phaser.Physics.Arcade.Body;
    if (typeof arcadeBody.setGravityY === 'function') {
      arcadeBody.setGravityY(effectiveBaseGravity * asymFactor - worldGravityY);
    }
    const clampedVy = clampFallVelocity(this.body.velocity.y, this.upsideDown, this.isDiving);
    if (clampedVy !== this.body.velocity.y) {
      this.setVelocityY(clampedVy);
    }

    this.setFlipX(res.flipX);
    this.play(this.getAnimKey(res.animState), true);

    if (wasRecoiling) {
      return;
    }

    // Translucent shimmering pulse when quantum tunneling charges are active
    if (this.tunnelCharges > 0) {
      const pulseAlpha = 0.5 + 0.25 * Math.sin(Date.now() * 0.008);
      if (typeof this.setAlpha === 'function') {
        this.setAlpha(pulseAlpha);
      }
    } else if (this.alpha !== 1 && typeof this.setAlpha === 'function') {
      this.setAlpha(1);
    }
  }
}
