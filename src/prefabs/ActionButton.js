import Phaser from 'phaser';

export default class ActionButton extends Phaser.Group {
  constructor({ game, x, y, text, callback }) {
    super(game);
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = 200;
    this.height = 200;

    const textObject = new Phaser.Text(this.game, x, y, text, {
      font: '40px VT323',
      fill: '#ffffff',
      align: 'center'
    });

    const background = new Phaser.Graphics(this.game)
      .beginFill(0xe74c3c)
      .drawRect(
        x - textObject.width / 2 - 10,
        y - textObject.height / 2 - 5,
        textObject.width + 20,
        textObject.height + 10
      );
    textObject.anchor.setTo(0.5);
    background.inputEnabled = true;
    background.events.onInputDown.add(callback, this);
    textObject.bringToTop();

    this.add(background);
    this.add(textObject);
    this.fixedToCamera = true;
  }
}
