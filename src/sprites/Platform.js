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
      this.direction = {
        x: this.movesTo.x > this.x ? 'right' : this.movesTo.x < this.x ? 'left' : null,
        y: this.movesTo.y > this.y ? 'bottom' : this.movesTo.y < this.y ? 'top' : null
      };
    }
  }

  update() {
    if (this.movesTo) {
      if (this.direction.x === 'right') {
        this.body.velocity.x = 100;
        if (this.x > this.movesTo.x) {
          this.direction.x = 'left';
        }
      }
      if (this.direction.x === 'left') {
        this.body.velocity.x = -100;
        if (this.x + this.width < this.movesTo.x) {
          this.direction.x = 'right';
        }
      }
      if (this.direction.y === 'top') {
        this.body.velocity.y = -20;
        if (this.y < this.movesTo.y) {
          this.direction.y = 'bottom';
        }
      }
      if (this.direction.y === 'bottom') {
        this.body.velocity.y = 20;
        if (this.y - this.height > this.movesTo.y) {
          this.direction.y = 'top';
        }
      }
    }
  }
}
