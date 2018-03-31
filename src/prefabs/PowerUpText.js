import Phaser from 'phaser';

export default class PowerUpText extends Phaser.Group {
  constructor({ game, type }) {
    super(game);
    this.game = game;
    this.type = type;

    this.powerUptext = new Phaser.Text(this.game, this.game.width, 70, `${type.toUpperCase()} !`, {
      font: '180px VT323',
      fill: '#ffffff',
      align: 'center'
    });

    this.alpha = 0.5;
    this.add(this.powerUptext);
    this.fixedToCamera = true;
  }

  update() {
    this.powerUptext.x -= 5;
  }
}
