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
      fill: '#ffffff',
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
        fill: '#ffffff',
        align: 'right'
      }
    );

    const backArrow = new Phaser.Text(this.game, 10, 0, '↩', {
      font: '40px monospace',
      fill: '#ffffff',
      align: 'right'
    });

    backArrow.inputEnabled = true;
    backArrow.events.onInputDown.add(this.goToMenu, this);

    this.levelTitle = new Phaser.Text(
      this.game,
      this.game.width / 2 + 10,
      29,
      `${this.game.data.atom}`,
      {
        font: '20px monospace',
        fill: '#ffffff',
        align: 'center'
      }
    );
    this.levelTitle.anchor.setTo(0.5);

    const background1 = new Phaser.Graphics(this.game)
      .beginFill('0xff0000', 0.3)
      .drawRect(0, 0, 45, 50);

    const background2 = new Phaser.Graphics(this.game)
      .beginFill('#cccccc', 0.5)
      .drawRect(45, 0, this.game.world.width - 50, 50);

    this.add(background1);
    this.add(background2);
    this.add(this.energyText);
    this.add(this.uncertaintyText);
    this.add(this.levelTitle);
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
