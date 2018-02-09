import Phaser from 'phaser';
export default class Door extends Phaser.Sprite {
  constructor({ game, x, y, asset }) {
    super(game, x, y, asset);
    this.game = game;
    this.game.physics.arcade.enable(this);
    this.body.immovable = true;
    this.body.moves = false;
    this.animations.add('closed', [3], 30, true);
    this.animations.add('open', [11], 30, true);
    this.animations.play('closed');
  }

  open() {
    this.animations.play('open');
  }
}
