import Phaser from 'phaser';

export default class Overlay extends Phaser.Group {
  constructor({ game, x, y, asset }) {
    super(game, x, y, asset);
    this.game = game;
    this.fixedToCamera = true;
    this.animationOver = false;
    setTimeout(() => {
      this.animationOver = true;
    }, 2000);
    this.create(0, 0, this.createOverlay());
    this.levelTitle = new Phaser.Text(
      this.game,
      50,
      this.game.height / 2,
      this.game.data.atom,
      {
        font: '50px monospace',
        fill: this.game.data.antiHue,
        align: 'center'
      }
    );
    this.levelTitle.alpha = 0;
    this.add(this.levelTitle);
  }

  createOverlay() {
    const bg = this.game.add.bitmapData(this.game.width, this.game.height);
    bg.ctx.beginPath();
    bg.ctx.rect(0, 0, this.game.width, this.game.height);
    bg.ctx.fillStyle = this.game.data.hue;
    bg.ctx.fill();
    bg.fixedToCamera = true;
    return bg;
  }

  update() {
    if (this.animationOver) {
      this.alpha -= 0.05;
    } else if (this.levelTitle.alpha < 1) {
      this.levelTitle.alpha += 0.05;
    }
  }
}
