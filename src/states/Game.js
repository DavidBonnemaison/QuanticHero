import Phaser from 'phaser';
import { range } from 'lodash';
import { push } from 'react-router-redux';
import * as levels from '../data/levels';
import Hero from '../sprites/Hero';
import Particle from '../sprites/Particle';
import Molecule from '../sprites/Molecule';
import Platform from '../sprites/Platform';
import Spike from '../sprites/Spike';
import HUD from './../prefabs/Hud';
import Overlay from './../prefabs/Overlay';
import Portal from '../sprites/Portal';
import store from './../store';
import * as gameActions from './../actions/game';
import TouchController from './../tools/TouchController';

export default class extends Phaser.State {
  init() {
    this.gameState = store.getState().game;
    const { currentLevel, maxLevel } = this.gameState;
    this.currentLevel = currentLevel;
    this.maxLevel = maxLevel;
    if (maxLevel === 0) {
      this.state.start('Tuto');
    }

    this.game.data = levels[`level${this.currentLevel}`];
    if (this.game.data === undefined) {
      this.game.data = levels.level1;
      store.dispatch(gameActions.updateCurrentLevel(1));
    }
    this.game.stage.backgroundColor = this.game.data.hue;
    store.subscribe(this.handleStoreChange.bind(this));
  }

  goToMenu() {
    store.dispatch(push('/'));
    this.game.destroy();
  }

  handleStoreChange() {
    const oldState = this.gameState;
    this.gameState = store.getState().game;
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

    ['heroes', 'particles', 'platforms', 'spikes', 'portal'].forEach(group => {
      this[group] = new Phaser.Group(this.game);
      this[group].enableBody = true;
      this.game.global[group] = [];
    });

    this.HUD = new HUD({
      game: this.game,
      goToMenu: this.goToMenu.bind(this)
    });

    this.molecules = this.game.add.group();
    range(0, 20).forEach(this.createMolecule.bind(this));
    this.game.data.spikes.forEach(this.createSpike.bind(this));
    this.game.data.platforms.forEach(this.createPlatform.bind(this));
    this.game.data.particles.forEach(this.createParticle.bind(this));

    this.portalSprite = new Portal({
      game: this.game,
      id: 0,
      x: this.game.data.door.x - 48,
      y: this.game.data.door.y - 96,
      asset: 'portal'
    });
    this.portal.add(this.game.add.existing(this.portalSprite));

    this.hero = new Hero({
      game: this.game,
      id: 0,
      x: this.game.data.player.position.x,
      y: this.game.data.player.position.y,
      asset: 'hero',
      platforms: this.platforms,
      spikes: this.spikes,
      HUD: this.HUD,
      touchController: new TouchController(this.game)
    });

    this.game.global.heroes.push(this.hero);
    setTimeout(() => {
      this.world.sendToBack(this.molecules);
      this.heroes.add(this.game.add.existing(this.hero));
      this.overlay.destroy();
    }, 2100);
    this.game.add.existing(this.overlay);
    this.world.bringToTop(this.molecules);
  }

  centerCamera() {
    const hasFocus = this.game.global.heroes.filter(h => h.isFocused);
    let idealPosition = this.game.global.heroes.reduce(
      (acc, current) => ({
        x: acc.x + current.x,
        y: acc.y + current.y
      }),
      { x: 0, y: 0 }
    );

    if (hasFocus.length) {
      idealPosition = {
        x: hasFocus[0].x,
        y: hasFocus[0].y
      };
    } else {
      idealPosition.x /= this.game.global.heroes.length;
      idealPosition.y /= this.game.global.heroes.length;
    }
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
    this.HUD.updateTimer();

    if (this.game.global.heroes.length === 0) {
      this.game.state.clearCurrentState();
      this.state.start('Game');
    }
    const isAtThePortal = this.game.physics.arcade.collide(this.game.global.heroes, this.portal);
    if (isAtThePortal) {
      const nextLevel = Number(this.currentLevel) + 1;
      store.dispatch(gameActions.updateCurrentLevel(nextLevel));
      this.HUD.setScore();
      if (this.maxLevel < nextLevel) {
        store.dispatch(gameActions.updateMaxLevel(nextLevel));
      }
      this.game.state.clearCurrentState();
      this.game.destroy();
      store.dispatch(push('/done'));
    }
  }
}
