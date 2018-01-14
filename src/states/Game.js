/* globals __DEV__ */
import Phaser from 'phaser';
import Hero from '../sprites/Hero';

export default class extends Phaser.State {
  init() {}
  preload() {}

  createPlatform({ x, y, scale }) {
    this.ledge = this.platforms.create(
      x,
      this.game.world.height - y,
      'platform'
    );
    this.ledge.body.immovable = true;
    this.ledge.body.moves = false;
    if (scale) {
      this.ledge.scale.setTo(scale.x, scale.y);
    }
    return this.ledge;
  }

  create() {
    this.game.global = {};
    this.game.global.heroes = [];
    this.game.camera.setPosition(0, 1600);
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
      y: 50
    });

    this.ground.scale.setTo(10, 10);
    this.ground.body.immovable = true;
    this.ground.body.moves = false;

    this.createPlatform({ x: 300, y: 150 });
    this.createPlatform({ x: 500, y: 250, scale: { x: 0.5, y: 0.5 } });
    this.createPlatform({ x: 300, y: 450, scale: { x: 0.05, y: 10 } });
    // this.createPlatform({ x: 500, y: 800 });
    // this.createPlatform({ x: 1000, y: 850 });
    // this.createPlatform({ x: 550, y: 600 });
    // this.createPlatform({ x: 0, y: 700 });

    this.hero = new Hero({
      game: this.game,
      id: 0,
      x: 36,
      y: 800,
      asset: 'hero',
      platforms: this.platforms
    });

    this.cursors = this.game.input.keyboard.createCursorKeys();

    this.game.add.existing(this.hero);
    this.game.global.heroes.push(this.hero);
  }

  centerCamera() {
    const idealPosition = this.game.global.heroes.reduce(
      (acc, current) => ({
        x: acc.x + current.x,
        y: acc.y + current.y
      }),
      { x: 0, y: 0 }
    );

    idealPosition.x /= this.game.global.heroes.length;
    idealPosition.y /= this.game.global.heroes.length;

    const newPosition = {
      x:
        (idealPosition.x + (this.game.camera.x + this.game.width / 2) * 9) / 10,
      y:
        (idealPosition.y + (this.game.camera.y + this.game.height / 2) * 9) / 10
    };

    this.game.camera.focusOnXY(newPosition.x, newPosition.y);
  }

  render() {
    this.bg.tilePosition.x = -(this.camera.x * 0.2);
    this.centerCamera();
  }
}
