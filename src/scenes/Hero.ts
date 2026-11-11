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
    touch: TouchInputState
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

    // Bounce off ceiling when hitting ceiling in normal gravity
    if (this.upsideDown === 1 && this.body.blocked.up && this.body.velocity.y < 50) {
      this.setVelocityY(150);
    } else if (this.upsideDown === -1 && this.body.blocked.down && this.body.velocity.y > -50) {
      this.setVelocityY(-150);
    }

    if (this.isFocused) {
      if (goLeft) {
        if (!this.body.blocked.left) {
          this.setVelocityX(-350 * this.velocityMultiplier);
        } else {
          this.setVelocityX(150);
        }
        this.setFlipX(true);
        if (touchingGround) {
          this.play(this.getAnimKey('left'), true);
        }
      } else if (goRight) {
        if (!this.body.blocked.right) {
          this.setVelocityX(350 * this.velocityMultiplier);
        } else {
          this.setVelocityX(-150);
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
