import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    // Images
    this.load.image('spike', '/assets/images/spike.png');
    this.load.image('red', '/assets/images/red.png');
    this.load.image('cyan', '/assets/images/cyan.png');
    this.load.image('blue', '/assets/images/blue.png');
    this.load.image('yellow', '/assets/images/yellow.png');
    this.load.image('green', '/assets/images/green.png');

    // Spritesheets
    this.load.spritesheet('hero', '/assets/images/hero.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('disabled', '/assets/images/disabled.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('portal', '/assets/images/portal.png', {
      frameWidth: 480,
      frameHeight: 312
    });
  }

  create(): void {
    // Hero animations
    if (!this.anims.exists('left')) {
      this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('hero', { frames: [6, 7, 8, 9, 10, 11] }),
        frameRate: 30,
        repeat: -1
      });
    }

    if (!this.anims.exists('idle')) {
      this.anims.create({
        key: 'idle',
        frames: this.anims.generateFrameNumbers('hero', { frames: [0, 1, 2, 3] }),
        frameRate: 10,
        repeat: -1
      });
    }

    if (!this.anims.exists('right')) {
      this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('hero', { frames: [6, 7, 8, 9, 10, 11] }),
        frameRate: 30,
        repeat: -1
      });
    }

    if (!this.anims.exists('jump')) {
      this.anims.create({
        key: 'jump',
        frames: this.anims.generateFrameNumbers('hero', { frames: [13, 14, 15] }),
        frameRate: 3,
        repeat: -1
      });
    }

    // Disabled hero animations
    if (!this.anims.exists('disabled-left')) {
      this.anims.create({
        key: 'disabled-left',
        frames: this.anims.generateFrameNumbers('disabled', { frames: [6, 7, 8, 9, 10, 11] }),
        frameRate: 30,
        repeat: -1
      });
    }

    if (!this.anims.exists('disabled-idle')) {
      this.anims.create({
        key: 'disabled-idle',
        frames: this.anims.generateFrameNumbers('disabled', { frames: [0, 1, 2, 3] }),
        frameRate: 10,
        repeat: -1
      });
    }

    if (!this.anims.exists('disabled-right')) {
      this.anims.create({
        key: 'disabled-right',
        frames: this.anims.generateFrameNumbers('disabled', { frames: [6, 7, 8, 9, 10, 11] }),
        frameRate: 30,
        repeat: -1
      });
    }

    if (!this.anims.exists('disabled-jump')) {
      this.anims.create({
        key: 'disabled-jump',
        frames: this.anims.generateFrameNumbers('disabled', { frames: [13, 14, 15] }),
        frameRate: 3,
        repeat: -1
      });
    }

    // Portal animation
    if (!this.anims.exists('spin')) {
      this.anims.create({
        key: 'spin',
        frames: this.anims.generateFrameNumbers('portal', { frames: [0, 1, 2, 3] }),
        frameRate: 10,
        repeat: -1
      });
    }

    this.scene.start('Game');
  }
}
