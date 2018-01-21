import Phaser from 'phaser';
import { range } from 'lodash';
import './../plugins/joystick';
import * as levels from '../data/levels';
import Hero from '../sprites/Hero';
import Particle from '../sprites/Particle';
import Molecule from '../sprites/Molecule';
import Platform from '../sprites/Platform';
import HUD from './../prefabs/Hud';
import Overlay from './../prefabs/Overlay';

export default class extends Phaser.State {
  init() {
    try {
      this.currentLevel = localStorage.getItem('currentLevel');
    } catch (e) {
      this.currentLevel = localStorage.setItem('currentLevel', '1');
    }
    if (this.currentLevel === null) {
      this.currentLevel = '1';
    }
    this.game.data = levels[`level${this.currentLevel}`];
    if (this.game.data === undefined) {
      this.currentLevel = '1';
      this.game.data = levels.level1;
      localStorage.setItem('currentLevel', '1');
    }
    this.game.stage.backgroundColor = this.game.data.hue;
  }

  goToMenu() {
    this.state.start('Menu');
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

  createSpike({ x, y }) {
    return this.createObject({
      x,
      y,
      scale: {
        x: 0.5,
        y: 0.5
      },
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

  createMolecule() {
    const mol = new Molecule({
      game: this.game,
      x: 0,
      y: 0
    });
    this.molecules.add(this.game.add.existing(mol));
  }

  createPlatform({ x, y, width = 200, height = 20 }) {
    const bmd = this.game.add.bitmapData(width, height);
    bmd.ctx.beginPath();
    bmd.ctx.rect(0, 0, width, height);
    bmd.ctx.fillStyle = this.game.data.antiHue;
    bmd.ctx.fill();
    const platform = new Platform({
      game: this.game,
      x,
      y: this.game.world.height - y,
      width,
      height,
      asset: bmd
    });

    this.platforms.add(this.game.add.existing(platform));
  }

  create() {
    this.game.global = {};
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    this.game.time.desiredFps = 30;
    this.game.physics.arcade.gravity.y = 500;
    this.game.world.setBounds(
      0,
      0,
      this.game.data.width,
      this.game.data.height
    );
    this.game.camera.setPosition(
      this.game.world.width / 2 - 400,
      this.game.world.height
    );
    this.overlay = new Overlay({
      game: this.game,
      x: 0,
      y: 0
    });

    ['heroes', 'particles', 'platforms', 'spikes'].forEach(group => {
      this[group] = new Phaser.Group(this.game);
      this[group].enableBody = true;
      this.game.global[group] = [];
    });

    this.HUD = new HUD({
      game: this.game,
      goToMenu: this.goToMenu.bind(this)
    });

    this.molecules = this.game.add.group();
    range(0, 200).forEach(this.createMolecule.bind(this));
    this.game.data.spikes.forEach(this.createSpike.bind(this));
    this.game.data.platforms.forEach(this.createPlatform.bind(this));
    this.game.data.particles.forEach(this.createParticle.bind(this));

    const isTouchScreen = navigator.maxTouchPoints > 0 || 'ontouchstart' in window || navigator.msMaxTouchPoints > 0;
    this.gamepad = this.game.plugins.add(Phaser.Plugin.VirtualGamepad);
    this.joystick = this.gamepad.addJoystick(
      isTouchScreen ? 65 : -5000,
      this.game.height - 65,
      1,
      'gamepad'
    );
    this.button = this.gamepad.addButton(
      isTouchScreen ? this.game.width - 65 : -5000,
      this.game.height - 65,
      1.0,
      'gamepad'
    );

    this.hero = new Hero({
      game: this.game,
      id: 0,
      x: this.game.world.width / 2,
      y: 800,
      asset: 'hero',
      platforms: this.platforms,
      spikes: this.spikes,
      HUD: this.HUD,
      button: this.button,
      joystick: this.joystick
    });

    this.game.global.heroes.push(this.hero);
    setTimeout(() => {
      this.world.sendToBack(this.molecules);
      this.heroes.add(this.game.add.existing(this.hero));
    }, 2100);
    this.game.add.existing(this.overlay);
    this.world.bringToTop(this.molecules);
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
    if (this.game.global.particles.length === 0) {
      localStorage.setItem('currentLevel', Number(this.currentLevel) + 1);
      this.state.start('Game');
    }
  }
}
