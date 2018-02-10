import Phaser from 'phaser';
import { range } from 'lodash';
import './../plugins/joystick';
import * as levels from '../data/levels';
import Hero from '../sprites/Hero';
import Particle from '../sprites/Particle';
import Molecule from '../sprites/Molecule';
import Platform from '../sprites/Platform';
import Spike from '../sprites/Spike';
import HUD from './../prefabs/Hud';
import Overlay from './../prefabs/Overlay';
import Door from '../sprites/Door';

export default class extends Phaser.State {
  init() {
    if (Number(localStorage.getItem('maxLevel')) === 0) {
      this.state.start('Tuto');
    }
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

  createSpike({ x, y, width, height }) {
    const bmd = this.game.add.bitmapData(width, height);
    bmd.ctx.beginPath();
    bmd.ctx.rect(0, 0, width, height);
    bmd.ctx.fillStyle = this.game.data.hue;
    bmd.ctx.fill();
    const spike = new Spike({
      game: this.game,
      x,
      y,
      width,
      height,
      asset: bmd
    });

    this.spikes.add(this.game.add.existing(spike));
  }

  createParticle({ x, y }) {
    const particle = new Particle({
      game: this.game,
      x,
      y,
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

  createPlatform({ x, y, width = 200, height = 20, movesTo }) {
    const bmd = this.game.add.bitmapData(width, height);
    bmd.ctx.beginPath();
    bmd.ctx.rect(0, 0, width, height);
    bmd.ctx.fillStyle = this.game.data.antiHue;
    bmd.ctx.fill();
    const platform = new Platform({
      game: this.game,
      x,
      y,
      width,
      height,
      movesTo,
      asset: bmd
    });

    this.platforms.add(this.game.add.existing(platform));
  }

  create() {
    this.game.global = {};
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    this.game.time.desiredFps = 60;
    this.game.physics.arcade.gravity.y = 700;
    this.game.world.setBounds(0, 0, this.game.data.width, this.game.data.height);
    this.game.camera.setPosition(
      this.game.data.player.position.x,
      this.game.data.player.position.y
    );

    this.overlay = new Overlay({
      game: this.game,
      x: 0,
      y: 0
    });

    ['heroes', 'particles', 'platforms', 'spikes', 'door'].forEach(group => {
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

    this.doorSprite = new Door({
      game: this.game,
      id: 0,
      x: this.game.data.door.x - 48,
      y: this.game.data.door.y - 96,
      asset: 'door'
    });
    this.door.add(this.game.add.existing(this.doorSprite));

    const isTouchScreen =
      navigator.maxTouchPoints > 0 || 'ontouchstart' in window || navigator.msMaxTouchPoints > 0;
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
      x: this.game.data.player.position.x,
      y: this.game.data.player.position.y,
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
      x: (idealPosition.x + (this.game.camera.x + this.game.width / 2) * 9) / 10,
      y: (idealPosition.y + (this.game.camera.y + this.game.height / 2) * 9) / 10
    };

    if (this.game.global.heroes.length === 0) {
      this.game.camera.focusOnXY(this.hero.x, this.hero.y);
    } else {
      this.game.camera.focusOnXY(newPosition.x, newPosition.y);
    }
  }

  render() {
    this.centerCamera();

    if (this.game.global.heroes.length === 0) {
      this.game.state.clearCurrentState();
      this.state.start('Game');
    }
    if (this.game.global.particles.length === 0) {
      this.doorSprite.open();
      const isAtTheDoor = this.game.physics.arcade.collide(this.game.global.heroes, this.door);
      if (isAtTheDoor) {
        const nextLevel = Number(this.currentLevel) + 1;
        localStorage.setItem('currentLevel', nextLevel);
        if (Number(localStorage.getItem('maxLevel')) < nextLevel) {
          localStorage.setItem('maxLevel', nextLevel);
        }
        this.game.state.clearCurrentState();
        this.state.start('Game');
      }
    }
  }
}
