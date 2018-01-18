/* globals __DEV__ */
import Phaser from 'phaser';
import { range } from 'lodash';
import Hero from '../sprites/Hero';
import Particle from '../sprites/Particle';
import Molecule from '../sprites/Molecule';
import HUD from './../prefabs/Hud';

export default class extends Phaser.State {
  init() {
    this.game.stage.backgroundColor = '#01051f';
  }

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

  createParticle({ x, y }) {
    const particle = new Particle({
      game: this.game,
      x,
      y: this.game.world.height - y,
      asset: 'ball',
      particles: this.particles,
      HUD: this.HUD
    });
    this.game.global.particles.push(particle);
    this.game.add.existing(particle);
  }

  create() {
    this.game.global = {};
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    this.game.time.desiredFps = 30;
    this.game.physics.arcade.gravity.y = 500;
    this.game.world.setBounds(0, 0, 1600, 1000);
    this.game.camera.setPosition(this.game.world.width / 2 - 180, 1600);

    range(0, 100).forEach(() => {
      const mol = new Molecule({
        game: this.game,
        x: this.game.world.width / 2 - 100,
        y: 900,
        asset: ''
      });
      this.game.add.existing(mol);
    });

    ['heroes', 'particles', 'platforms', 'spikes'].forEach(group => {
      this[group] = new Phaser.Group(this.game);
      this[group].enableBody = true;
      this.game.global[group] = [];
    });

    //
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

    this.HUD = new HUD({
      game: this.game
    });

    this.hero = new Hero({
      game: this.game,
      id: 0,
      x: this.game.world.width / 2,
      y: 800,
      asset: 'hero',
      platforms: this.platforms,
      spikes: this.spikes
    });

    [
      {
        x: 100,
        y: 120
      },
      {
        x: 650,
        y: 100
      },
      {
        x: 1100,
        y: 500
      }
    ].forEach(this.createParticle.bind(this));

    this.cursors = this.game.input.keyboard.createCursorKeys();

    this.heroes.add(this.hero);
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
    this.centerCamera();
    if (this.game.global.heroes.length === 0) {
      this.state.start('Game');
    }
  }
}
