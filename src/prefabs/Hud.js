export default class Hud extends Phaser.Group {
  constructor({ game, particles }) {
    super(game);
    this.game = game;
    this.particles = particles;
  }
}
