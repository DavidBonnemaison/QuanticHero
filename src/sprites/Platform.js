import Phaser from 'phaser';

export default class Platform extends Phaser.Sprite {
  constructor({ game, x, y, asset, movesTo }) {
    super(game, x, y, asset);
    this.game = game;
    this.game.physics.arcade.enable(this);
    this.body.immovable = true;
    this.body.allowGravity = false;
    this.movesTo = movesTo;
    if (movesTo) {
      this.direction = this.movesTo.x > this.x ? 'right' : 'left';
    }
  }

  update() {
    if (this.movesTo) {
      if (this.direction === 'right') {
        this.body.velocity.x = 100;
        if (this.x > this.movesTo.x) {
          this.direction = 'left';
        }
      }
      if (this.direction === 'left') {
        this.body.velocity.x = -100;
        if (this.x + this.width < this.movesTo.x) {
          this.direction = 'right';
        }
      }
    }
  }
}
