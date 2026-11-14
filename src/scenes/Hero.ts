import Phaser from 'phaser';
import { PHYSICS } from '../physics/constants';
import { gameEvents } from '../tools/gameEvents';
import type { EntanglementMode } from '../types';

export interface TouchInputState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

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

  constructor(scene: Phaser.Scene, x: number, y: number, isFocused = true) {
    super(scene, x, y, isFocused ? 'hero' : 'disabled');
    this.id = Math.random();
    this.isFocused = isFocused;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setBounce(0, 0);
    this.setCollideWorldBounds(false);
    this.play(this.getAnimKey('idle'));

    this.setInteractive();
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

  public setFocus(focused: boolean): void {
    this.isFocused = focused;
    this.setTexture(focused ? 'hero' : 'disabled');
    this.play(this.getAnimKey('idle'), true);
  }

  public setGravityInverted(inverted: boolean): void {
    this.upsideDown = inverted ? -1 : 1;
    this.setFlipY(inverted);
  }

  private getAnimKey(base: 'left' | 'right' | 'idle' | 'jump'): string {
    return this.isFocused ? base : `disabled-${base}`;
  }

  public bounceOffLeftWall(isNeonWall = false): void {
    if (this.recoilVx <= 0) {
      this.recoilVx = PHYSICS.WALL_RECOIL_VX * this.velocityMultiplier;
      this.recoilTimer = PHYSICS.WALL_RECOIL_TIMER_MS;
      if (isNeonWall) {
        this.setVelocityY(-400 * this.upsideDown);
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

    const rawLeft = (cursors?.left?.isDown ?? false) || (wasd?.A?.isDown ?? false) || touch.left;
    const rawRight = (cursors?.right?.isDown ?? false) || (wasd?.D?.isDown ?? false) || touch.right;
    const jump =
      (cursors?.up?.isDown ?? false) ||
      (wasd?.W?.isDown ?? false) ||
      (cursors?.space?.isDown ?? false) ||
      touch.jump;

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

    // Active bounce recoil handling (triggered only by scene boundaries)
    if (this.recoilTimer > 0) {
      this.recoilTimer -= delta;
      this.setVelocityX(this.recoilVx);
      this.recoilVx *= PHYSICS.WALL_RECOIL_DRAG_X;

      // Allow cancelling recoil early if player steers in the bounce direction
      if (this.recoilVx > 0 && goRight) {
        this.recoilTimer = 0;
        this.setVelocityX(PHYSICS.HERO_SPEED_X * this.velocityMultiplier);
      } else if (this.recoilVx < 0 && goLeft) {
        this.recoilTimer = 0;
        this.setVelocityX(-PHYSICS.HERO_SPEED_X * this.velocityMultiplier);
      }

      this.play(this.getAnimKey('jump'), true);
      this.setFlipX(this.recoilVx < 0);
      return;
    }

    // Normal controls
    const isActive = this.isEntangled || this.isFocused;

    if (isActive) {
      const isHighSpeed =
        Math.abs(this.body.velocity.x) > PHYSICS.HERO_SPEED_X * this.velocityMultiplier;
      if (goLeft) {
        if (touchingGround || !isHighSpeed) {
          this.setVelocityX(-PHYSICS.HERO_SPEED_X * this.velocityMultiplier);
        }
        this.setFlipX(true);
        if (touchingGround) {
          this.play(this.getAnimKey('left'), true);
        }
      } else if (goRight) {
        if (touchingGround || !isHighSpeed) {
          this.setVelocityX(PHYSICS.HERO_SPEED_X * this.velocityMultiplier);
        }
        this.setFlipX(false);
        if (touchingGround) {
          this.play(this.getAnimKey('right'), true);
        }
      } else {
        if (touchingGround) {
          this.setVelocityX(0);
          this.play(this.getAnimKey('idle'), true);
        } else {
          const drag = isHighSpeed ? 0.996 : PHYSICS.AIR_DRAG_X;
          this.body.velocity.x *= drag;
        }
      }

      if (jump && touchingGround) {
        this.setVelocityY(PHYSICS.HERO_JUMP_V0 * this.upsideDown);
        this.play(this.getAnimKey('jump'), true);
        gameEvents.emit('hero:jump');
      }
    } else {
      this.setVelocityX(0);
      if (touchingGround) {
        this.play(this.getAnimKey('idle'), true);
      }
    }

    if (!touchingGround) {
      this.play(this.getAnimKey('jump'), true);
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
