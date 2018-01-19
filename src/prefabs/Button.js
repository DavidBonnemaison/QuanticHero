import Phaser from 'phaser';

export default class Button extends Phaser.Group {
  constructor({ game, x, y, text, callback }) {
    super(game);
    this.game = game;
    this.x = x;
    this.y = y;
    this.testButton = new Phaser.Text(this.game, x, y, text, {
      font: '40px monospace',
      fill: 'white',
      align: 'center'
    });
    this.testButton.anchor.setTo(0.5);
    this.testButton.inputEnabled = true;
    this.testButton.events.onInputDown.add(callback, this);

    this.add(this.testButton);
    this.fixedToCamera = true;
  }
}
