import Phaser from 'phaser';

export default class PowerUpText extends Phaser.Group {
  constructor({ game, type }) {
    super(game);
    this.game = game;
    this.type = type;

    const words = {
      antiGravity: 'ANTI GRAVITY !',
      lowGravity: 'LOW GRAVITY !',
      speed: 'HIGH SPEED !',
      duplicate: 'CLONING !'
    };

    this.powerUptext = new Phaser.Text(this.game, this.game.width, 100, words[type], {
      font: '150px VT323',
      fill: '#ffffff',
      align: 'center'
    });

    this.alpha = 0.5;
    this.add(this.powerUptext);
    this.fixedToCamera = true;
  }

  update() {
    this.powerUptext.x -= 8;
  }
}
