import Phaser from 'phaser';

export default class Spike extends Phaser.Sprite {
  constructor({ game, x, y, asset }) {
    super(game, x, y, asset);
    this.game = game;
    this.game.physics.arcade.enable(this);
    this.body.immovable = true;
    this.body.moves = false;
    this.scale.setTo(1, 0.01);
  }
}
