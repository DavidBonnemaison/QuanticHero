import Phaser from 'phaser';

export default class Particle extends Phaser.Sprite {
  constructor({ game, x, y, asset }) {
    super(game, x, y, asset);
    this.anchor.setTo(0.5);
    this.game = game;
    this.scale.setTo(0.2, 0.2);
  }

  update() {}
}
