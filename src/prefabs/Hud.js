import Phaser from 'phaser';
import moment from 'moment';
import store from './../store';
import * as actions from './../actions/score';

export default class Hud extends Phaser.Group {
  constructor({ game, goToMenu }) {
    super(game);
    this.game = game;
    this.goToMenu = goToMenu;
    this.totalParticles = 0;
    this.energy = 0;
    this.energyLabel = 'E : ';
    this.energyText = new Phaser.Text(this.game, 54, 10, this.getEnergyText(), {
      font: '28px VT323',
      fill: '#ffffff',
      align: 'center'
    });

    const backArrow = new Phaser.Text(this.game, 5, 7, '↩', {
      font: '40px VT323',
      fill: '#ffffff',
      align: 'right'
    });

    backArrow.inputEnabled = true;
    backArrow.events.onInputDown.add(this.goToMenu, this);

    this.timer = this.game.time.create();
    this.timer.start();
    this.timerText = new Phaser.Text(this.game, this.game.width - 100, 10, '00:00:00', {
      font: '28px VT323',
      fill: '#ffffff',
      align: 'center'
    });

    const background1 = new Phaser.Graphics(this.game)
      .beginFill('0xff0000', 0.3)
      .drawRect(0, 0, 45, 50);

    const background2 = new Phaser.Graphics(this.game)
      .beginFill('#cccccc', 0.5)
      .drawRect(45, 0, this.game.world.width - 50, 50);

    this.add(background1);
    this.add(background2);
    this.add(this.energyText);
    this.add(this.timerText);
    this.add(backArrow);
    this.fixedToCamera = true;
  }

  getEnergyText() {
    return this.energyLabel + this.energy + '/' + this.totalParticles;
  }

  updateTotalParticles() {
    this.totalParticles += 1;
    this.energyText.text = this.getEnergyText();
  }

  updateEnergy() {
    this.energy += 1;
    this.energyText.text = this.getEnergyText();
  }

  updateTimer() {
    this.timerText.text = moment(0)
      .set('ms', this.timer.ms)
      .subtract('ms', 2000)
      .format('mm:ss:SS');
  }

  setScore() {
    store.dispatch(
      actions.setScore({
        level: Number(this.game.data.id),
        score: this.timer.ms
      })
    );
  }
}
