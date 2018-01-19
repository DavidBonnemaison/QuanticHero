import Phaser from 'phaser';

export default class Platform extends Phaser.Sprite {
  constructor({ game, x, y, asset }) {
    super(game, x, y, asset);
    this.game = game;
    this.game.physics.arcade.enable(this);
    this.body.immovable = true;
    this.body.moves = false;
  }
}
