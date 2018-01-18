export default class Hud extends Phaser.Group {
  constructor({ game }) {
    super(game);
    this.game = game;
    this.totalParticles = 0;
    this.score = 0;
    this.scoreLabel = 'Score: ';
    this.scoreText = new Phaser.Text(this.game, 20, 14, this.getScoreText(), {
      font: '20px monospace',
      fill: 'white',
      align: 'center'
    });

    this.add(this.scoreText);
    this.fixedToCamera = true;
  }

  getScoreText() {
    return this.scoreLabel + this.score + '/' + this.totalParticles;
  }

  updateTotalParticles() {
    this.totalParticles += 1;
    this.scoreText.text = this.getScoreText();
  }

  updateScore() {
    this.score += 1;
    this.scoreText.text = this.getScoreText();
  }
}
