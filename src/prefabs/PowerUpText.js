import Phaser from 'phaser';

export default class PowerUpText extends Phaser.Group {
  constructor({ game, type }) {
    super(game);
    this.game = game;
    this.type = type;
  }
}
