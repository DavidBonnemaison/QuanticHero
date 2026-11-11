import Phaser from 'phaser';

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

    this.setBounce(0.4, 0.3);
    this.setCollideWorldBounds(true);
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

    // Bounce off ceiling when hitting ceiling
    const atCeiling =
      this.upsideDown === 1
        ? this.body.blocked.up || this.body.touching.up
        : this.body.blocked.down || this.body.touching.down;

    if (atCeiling) {
      if (this.upsideDown === 1 && this.body.velocity.y < 50) {
        this.setVelocityY(220);
      } else if (this.upsideDown === -1 && this.body.velocity.y > -50) {
        this.setVelocityY(-220);
      }
    }

    // Side bounce detection (world bounds & platforms)
    const levelWidth =
      (this.scene as unknown as { levelData?: { width?: number } })?.levelData?.width ?? 1000;
    const halfWidth = this.body.halfWidth || 32;
    const bounceSpeed = 300 * this.velocityMultiplier;

    const hitLeft =
      this.body.blocked.left ||
      this.body.touching.left ||
      (this.x <= halfWidth + 1 && (goLeft || this.body.velocity.x < 0));

    const hitRight =
      this.body.blocked.right ||
      this.body.touching.right ||
      (this.x >= levelWidth - halfWidth - 1 && (goRight || this.body.velocity.x > 0));

    if (hitLeft && this.recoilVx <= 0) {
      this.recoilVx = bounceSpeed;
      this.recoilTimer = 220;
      if (touchingGround) {
        this.setVelocityY(-160 * this.upsideDown);
      } else if (this.body.velocity.y * this.upsideDown > -50) {
        this.setVelocityY(-100 * this.upsideDown);
      }
    } else if (hitRight && this.recoilVx >= 0) {
      this.recoilVx = -bounceSpeed;
      this.recoilTimer = 220;
      if (touchingGround) {
        this.setVelocityY(-160 * this.upsideDown);
      } else if (this.body.velocity.y * this.upsideDown > -50) {
        this.setVelocityY(-100 * this.upsideDown);
      }
    }

    // Active bounce recoil handling
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
