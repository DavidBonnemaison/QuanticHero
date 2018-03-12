import Phaser from 'phaser';
import { random, sample } from 'lodash';

export default class Particle extends Phaser.Sprite {
  constructor({ game, x, y, asset, particles, HUD, type }) {
    super(game, x, y, asset);
    this.anchor.setTo(0.5);
    this.game = game;
    this.HUD = HUD;
    this.scale.setTo(0.2, 0.2);
    this.game.physics.arcade.enable(this);
    this.particles = particles;
    this.body.immovable = true;
    this.body.moves = false;
    this.type = type;
    this.interval = setInterval(() => {
      const offsetX = random(-5, 5);
      const offsetY = random(-5, 5);
      this.x += offsetX;
      this.y += offsetY;
      setTimeout(() => {
        this.x -= offsetX;
        this.y -= offsetY;
      }, 50);
    }, 150);
  }

  killParticle(hero) {
    switch (this.type) {
      case 'duplicate':
        hero.duplicate();
        break;
      case 'speed':
        hero.velocityMultiplier = 1.4;
        break;
      case 'lowGravity':
        this.game.physics.arcade.gravity.y = this.game.physics.arcade.gravity.y / 2;
        break;
      case 'antiGravity':
        this.game.physics.arcade.gravity.y = this.game.physics.arcade.gravity.y * -1;
        hero.upsideDown = hero.upsideDown * -1;
        break;
    }
    this.kill();
    clearInterval(this.interval);
    this.game.global.particles = this.game.global.particles.filter(particle => particle !== this);
    this.destroy();
  }

  update() {
    this.angle += sample([40, -40]);
    this.game.physics.arcade.overlap(this.game.global.heroes, this, this.killParticle.bind(this));
  }
}
