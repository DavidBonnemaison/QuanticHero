import Phaser from 'phaser';
import { random, sample } from 'lodash';

export default class Particle extends Phaser.Sprite {
  constructor({ game, x, y, asset, particles, HUD }) {
    super(game, x, y, asset);
    this.anchor.setTo(0.5);
    this.game = game;
    this.HUD = HUD;
    this.scale.setTo(0.2, 0.2);
    this.game.physics.arcade.enable(this);
    this.particles = particles;
    this.body.immovable = true;
    this.body.moves = false;
    this.HUD.updateTotalParticles();
    setInterval(() => {
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
    console.log('from particle');
    hero.duplicate();
    this.kill();
    this.game.global.particles = this.game.global.particles.filter(particle => particle !== this);
    this.HUD.updateEnergy();
    this.destroy();
  }

  update() {
    this.angle += sample([40, -40]);
    this.game.physics.arcade.overlap(this.game.global.heroes, this, this.killParticle.bind(this));
  }
}
