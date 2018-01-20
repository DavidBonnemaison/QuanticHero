import Phaser from 'phaser';

export default class Hud extends Phaser.Group {
  constructor({ game, goToMenu }) {
    super(game);
    this.game = game;
    this.goToMenu = goToMenu;
    this.totalParticles = 0;
    this.energy = 0;
    this.energyLabel = 'E : ';
    this.energyText = new Phaser.Text(this.game, 50, 14, this.getEnergyText(), {
      font: '20px monospace',
      fill: 'white',
      align: 'center'
    });

    this.uncertainty = 1;
    this.uncertaintyLabel = 'Δ : ';
    this.uncertaintyText = new Phaser.Text(
      this.game,
      this.game.width - 90,
      14,
      this.getUncertaintyText(),
      {
        font: '20px monospace',
        fill: 'white',
        align: 'right'
      }
    );

    const backArrow = new Phaser.Text(this.game, 10, 0, '↩', {
      font: '40px monospace',
      fill: 'white',
      align: 'right'
    });

    backArrow.inputEnabled = true;
    backArrow.events.onInputDown.add(this.goToMenu, this);

    this.add(this.energyText);
    this.add(this.uncertaintyText);
    this.add(backArrow);
    this.fixedToCamera = true;
  }

  getEnergyText() {
    return this.energyLabel + this.energy + '/' + this.totalParticles;
  }

  getUncertaintyText() {
    return (
      this.uncertaintyLabel +
      this.uncertainty +
      '/' +
      this.game.data.uncertainty
    );
  }

  goToMenu() {}

  updateTotalParticles() {
    this.totalParticles += 1;
    this.energyText.text = this.getEnergyText();
  }

  updateEnergy() {
    this.energy += 1;
    this.energyText.text = this.getEnergyText();
  }

  updateUncertainty(n) {
    this.uncertainty = n;
    this.uncertaintyText.text = this.getUncertaintyText();
  }
}
