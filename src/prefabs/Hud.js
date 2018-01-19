import Phaser from 'phaser';

export default class Hud extends Phaser.Group {
  constructor({ game }) {
    super(game);
    this.game = game;
    this.totalParticles = 0;
    this.energy = 0;
    this.energyLabel = 'E : ';
    this.energyText = new Phaser.Text(this.game, 20, 14, this.getEnergyText(), {
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

    this.add(this.energyText);
    this.add(this.uncertaintyText);
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
