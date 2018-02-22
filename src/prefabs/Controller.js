import Phaser from 'phaser';

export default class Controller extends Phaser.Group {
  constructor({ game, x, y, onInputDown, onInputUp }) {
    super(game);
    this.game = game;
    this.x = x;
    this.y = y;

    const background = new Phaser.Graphics(this.game)
      .beginFill(0x000000)
      .drawRect(x, y, game.width / 2, game.height);
    background.alpha = 0;

    background.inputEnabled = true;
    background.events.onInputDown.add(onInputDown, this);
    background.events.onInputUp.add(onInputUp, this);

    this.add(background);

    this.fixedToCamera = true;
  }

  remove() {
    this.game.world.remove(this);
  }
}
