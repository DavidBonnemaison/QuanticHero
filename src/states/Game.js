/* globals __DEV__ */
import Phaser from 'phaser';
import Hero from '../sprites/Hero';

export default class extends Phaser.State {
  init() {}
  preload() {}

  createObject({ x, y, scale, asset, group }) {
    const newObject = group.create(x, this.game.world.height - y, asset);
    newObject.body.immovable = true;
    newObject.body.moves = false;
    if (scale) {
      newObject.scale.setTo(scale.x, scale.y);
    }
    return newObject;
  }

  createPlatform({ x, y, scale }) {
    return this.createObject({
      x,
      y,
      scale,
      asset: 'platform',
      group: this.platforms
    });
  }

  createSpike({ x, y, scale }) {
    return this.createObject({
      x,
      y,
      scale,
      asset: 'spike',
      group: this.spikes
    });
  }

  create() {
    this.game.global = {};
    this.game.global.heroes = [];
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    this.game.time.desiredFps = 30;
    this.game.physics.arcade.gravity.y = 500;
    this.game.world.setBounds(0, 0, 1600, 1000);
    this.game.camera.setPosition(this.game.world.width / 2 - 180, 1600);

    this.bg = this.game.add.tileSprite(
      0,
      40,
      this.game.world.width,
      this.game.world.height,
      'bg'
    );
    this.bg.fixedToCamera = true;

    this.platforms = this.game.add.group();
    this.spikes = this.game.add.group();
    this.platforms.enableBody = true;
    this.spikes.enableBody = true;

    this.ground = this.createPlatform({
      x: 400,
      y: 50,
      scale: {
        x: 2,
        y: 1
      }
    });

    this.createSpike({ x: 1200, y: 50, scale: { x: 0.5, y: 0.5 } });
    this.createSpike({ x: 1405, y: 50, scale: { x: 0.5, y: 0.5 } });
    this.createSpike({ x: 100, y: 50, scale: { x: 0.5, y: 0.5 } });
    this.createPlatform({ x: 1000, y: 150, scale: { x: 1, y: 0.5 } });
    this.createPlatform({ x: 650, y: 250, scale: { x: 1, y: 0.5 } });
    this.createPlatform({ x: 400, y: 350, scale: { x: 0.5, y: 0.5 } });
    this.createPlatform({ x: 0, y: 100, scale: { x: 0.5, y: 0.5 } });
    this.createPlatform({ x: 1000, y: 450, scale: { x: 0.5, y: 0.5 } });
    this.createPlatform({ x: 700, y: 350, scale: { x: 0.5, y: 0.5 } });
    this.createPlatform({ x: 300, y: 450, scale: { x: 0.05, y: 10 } });
    // this.createPlatform({ x: 500, y: 800 });
    // this.createPlatform({ x: 1000, y: 850 });
    // this.createPlatform({ x: 550, y: 600 });
    // this.createPlatform({ x: 0, y: 700 });

    this.hero = new Hero({
      game: this.game,
      id: 0,
      x: this.game.world.width / 2,
      y: 800,
      asset: 'hero',
      platforms: this.platforms,
      spikes: this.spikes
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
    if (this.game.global.heroes.length === 0) {
      this.state.start('Game');
    }
  }
}
