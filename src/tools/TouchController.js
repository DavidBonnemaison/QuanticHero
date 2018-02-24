import Phaser from 'phaser-ce';

class TouchController {
  constructor(game) {
    this.game = game;
    this.game.input.onDown.add(this.touchBegin.bind(this));
    this.game.input.onUp.add(this.touchEnd.bind(this));
    this.touching = false;
    this.dragLength = 50;
    this.lastPosition = {
      x: 0,
      y: 0
    };
    this.lastMovement = {
      deltaX: 0,
      deltaY: 0
    };
  }

  touchBegin(e) {
    this.touching = true;
    this.lastPosition = {
      x: this.game.input.activePointer.positionDown.x,
      y: this.game.input.activePointer.positionDown.y
    };
  }

  touchEnd(e) {
    this.touching = false;
  }

  check() {
    if (!this.touching) {
      return null;
    }

    if (
      Phaser.Point.distance(this.game.input.activePointer.position, this.lastPosition) <
      this.dragLength
    ) {
      return this.lastMovement;
    }

    const x = this.game.input.activePointer.position.x;
    const y = this.game.input.activePointer.position.y;
    const deltaX = x - this.lastPosition.x;
    const deltaY = this.lastPosition.y - y;

    this.lastPosition = {
      x,
      y
    };

    this.lastMovement = {
      deltaX,
      deltaY
    };

    return this.lastMovement;
  }
}

export default TouchController;
