import Phaser from 'phaser-ce';
import { max } from 'lodash';

class TouchController {
  constructor(game) {
    this.game = game;
    this.game.input.onDown.add(this.touchBegin.bind(this));
    this.game.input.onUp.add(this.touchEnd.bind(this));
    this.touching = false;
    this.dragLength = 40;
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
    this.lastMovement = {
      deltaX: 0,
      deltaY: 0
    };
  }

  check() {
    if (!this.touching) {
      return {
        deltaX: 0,
        deltaY: 0
      };
    }

    if (
      Phaser.Point.distance(this.game.input.activePointer.position, this.lastPosition) <
      this.dragLength
    ) {
      return this.lastMovement;
    }

    const x = this.game.input.activePointer.position.x;
    const y = this.game.input.activePointer.position.y;

    if (this.lastMovement.deltaY > 20) {
      this.lastPosition.y = y;
    }

    const deltaX = x - this.lastPosition.x;
    const deltaY = max([this.lastPosition.y - y, 0]);

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
