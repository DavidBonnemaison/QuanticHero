import Phaser from 'phaser';

export default class Button extends Phaser.Group {
  constructor({ game, x, y, text, callback, hue, antiHue, enabled }) {
    super(game);
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = 100;
    this.height = 100;
    this.hue = enabled ? hue : '#555555';

    const textObject = new Phaser.Text(this.game, x, y, text, {
      font: '40px VT323',
      fill: enabled ? antiHue : '#cccccc',
      align: 'center'
    });

    const background = new Phaser.Graphics(this.game)
      .beginFill('0x' + this.hue.replace('#', ''))
      .drawRect(x - 25, y - 28, 50, 50);
    textObject.anchor.setTo(0.5);
    background.inputEnabled = true;
    if (enabled) background.events.onInputDown.add(callback, this);
    textObject.bringToTop();

    this.add(background);
    this.add(textObject);
    this.fixedToCamera = true;
  }

  remove() {
    this.game.world.remove(this);
  }
}
