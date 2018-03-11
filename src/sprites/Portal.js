import Phaser from 'phaser';
export default class Portal extends Phaser.Sprite {
  constructor({ game, x, y, asset }) {
    super(game, x, y, asset);
    this.game = game;
    this.scale.setTo(0.15, 0.2);
    this.anchor.setTo(-0.2, 0.2);
    this.game.physics.arcade.enable(this);
    this.body.immovable = true;
    this.body.moves = false;
    this.animations.add('spin', [0, 1, 2, 3], 10, true);
    this.animations.play('spin');
  }
}
