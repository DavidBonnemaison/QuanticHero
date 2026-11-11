import Phaser from 'phaser';
import { gameEvents } from '../tools/gameEvents';

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

  public bounceOffLeftWall(): void {
    if (this.recoilVx <= 0) {
      this.recoilVx = 300 * this.velocityMultiplier;
      this.recoilTimer = 220;
      const touchingGround =
        this.upsideDown === 1
          ? this.body?.touching.down || this.body?.blocked.down
          : this.body?.touching.up || this.body?.blocked.up;
      if (touchingGround) {
        this.setVelocityY(-160 * this.upsideDown);
      } else if (this.body && this.body.velocity.y * this.upsideDown > -50) {
        this.setVelocityY(-100 * this.upsideDown);
      }
    }
  }

  public bounceOffRightWall(): void {
    if (this.recoilVx >= 0) {
      this.recoilVx = -300 * this.velocityMultiplier;
      this.recoilTimer = 220;
      const touchingGround =
        this.upsideDown === 1
          ? this.body?.touching.down || this.body?.blocked.down
          : this.body?.touching.up || this.body?.blocked.up;
      if (touchingGround) {
        this.setVelocityY(-160 * this.upsideDown);
      } else if (this.body && this.body.velocity.y * this.upsideDown > -50) {
        this.setVelocityY(-100 * this.upsideDown);
      }
    }
  }

  public bounceOffCeiling(): void {
    if (this.upsideDown === 1 && (!this.body || this.body.velocity.y < 50)) {
      this.setVelocityY(220);
    } else if (this.upsideDown === -1 && (!this.body || this.body.velocity.y > -50)) {
      this.setVelocityY(-220);
    }
  }

  public updateControl(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys | null,
    wasd: { [key: string]: Phaser.Input.Keyboard.Key } | null,
    touch: TouchInputState,
    delta = 16.6
  ): void {
    if (!this.body) return;

    const goLeft = (cursors?.left?.isDown ?? false) || (wasd?.A?.isDown ?? false) || touch.left;
    const goRight = (cursors?.right?.isDown ?? false) || (wasd?.D?.isDown ?? false) || touch.right;
    const jump =
      (cursors?.up?.isDown ?? false) ||
      (wasd?.W?.isDown ?? false) ||
      (cursors?.space?.isDown ?? false) ||
      touch.jump;

    const touchingGround =
      this.upsideDown === 1
        ? this.body.touching.down || this.body.blocked.down
        : this.body.touching.up || this.body.blocked.up;

    // Active bounce recoil handling (triggered only by scene boundaries)
    if (this.recoilTimer > 0) {
      this.recoilTimer -= delta;
      this.setVelocityX(this.recoilVx);
      this.recoilVx *= 0.94;

      // Allow cancelling recoil early if player steers in the bounce direction
      if (this.recoilVx > 0 && goRight) {
        this.recoilTimer = 0;
        this.setVelocityX(350 * this.velocityMultiplier);
      } else if (this.recoilVx < 0 && goLeft) {
        this.recoilTimer = 0;
        this.setVelocityX(-350 * this.velocityMultiplier);
      }

      this.play(this.getAnimKey('jump'), true);
      this.setFlipX(this.recoilVx < 0);
      return;
    }

    // Normal controls
    if (this.isFocused) {
      if (goLeft) {
        this.setVelocityX(-350 * this.velocityMultiplier);
        this.setFlipX(true);
        if (touchingGround) {
          this.play(this.getAnimKey('left'), true);
        }
      } else if (goRight) {
        this.setVelocityX(350 * this.velocityMultiplier);
        this.setFlipX(false);
        if (touchingGround) {
          this.play(this.getAnimKey('right'), true);
        }
      } else {
        if (touchingGround) {
          this.setVelocityX(0);
          this.play(this.getAnimKey('idle'), true);
        } else {
          this.body.velocity.x *= 0.98;
        }
      }

      if (jump && touchingGround) {
        this.setVelocityY(-450 * this.upsideDown);
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
  }
}
