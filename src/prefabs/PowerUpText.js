import Phaser from 'phaser';

export default class PowerUpText extends Phaser.Group {
  constructor({ game, type }) {
    super(game);
    this.game = game;
    this.type = type;

    const powerUptext = new Phaser.Text(this.game, 20, 70, 'POWER UP !', {
      font: '40px VT323',
      fill: '#ffffff',
      align: 'center'
    });

    this.add(powerUptext);
    this.fixedToCamera = true;
  }

  update() {
    this.x += 10;
  }
}
