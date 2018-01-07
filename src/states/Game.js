/* globals __DEV__ */
import Phaser from 'phaser';
import Hero from '../sprites/Hero';

export default class extends Phaser.State {
  init() {}
  preload() {}

  createPlatform({ x, y }) {
    this.ledge = this.platforms.create(x, y, 'platform');
    this.ledge.body.immovable = true;
    this.ledge.body.moves = false;
    return this.ledge;
  }

  create() {
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    this.game.time.desiredFps = 30;
    this.game.physics.arcade.gravity.y = 500;
    this.game.world.setBounds(0, 0, 1600, 1000);

    this.bg = this.game.add.tileSprite(0, -200, 1600, 1000, 'bg');
    this.bg.fixedToCamera = true;

    this.platforms = this.game.add.group();
    this.platforms.enableBody = true;

    this.ground = this.createPlatform({
      x: 0,
      y: this.game.world.height - 64
    });

    this.ground.scale.setTo(10, 10);
    this.ground.body.immovable = true;
    this.ground.body.moves = false;

    this.createPlatform({ x: 0, y: 700 });
    this.createPlatform({ x: 500, y: 800 });
    this.createPlatform({ x: 1000, y: 850 });
    this.createPlatform({ x: 550, y: 600 });
    this.createPlatform({ x: 0, y: 700 });

    this.hero = new Hero({
      game: this.game,
      x: 200,
      y: 800,
      asset: 'hero',
      platforms: this.platforms
    });

    this.game.add.existing(this.hero);
    this.game.camera.follow(this.hero);
  }

  render() {
    this.bg.tilePosition.x = -(this.camera.x * 0.2);
    if (__DEV__) {
      this.game.debug.spriteInfo(this.hero, 32, 32);
    }
  }
}
