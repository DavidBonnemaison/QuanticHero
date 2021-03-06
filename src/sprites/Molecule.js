import Phaser from 'phaser';
import { random, sample } from 'lodash';
import randomColor from 'randomcolor';

export default class Molecule extends Phaser.Group {
  constructor({ game, x, y }) {
    super(game, x, y);
    this.game = game;
    this.scale.setTo(0.2, 0.2);
    this.id = random(1000, 9999);
    this.size = sample([random(20, 200), random(game.width, game.width * 2)]);
    this.color = (
      '0x' +
      randomColor({
        hue: this.game.data ? this.game.data.hue : 'monochrome'
      })
    )
      .toUpperCase()
      .replace('#', '');
    this.x = random(-this.size, this.game.width + this.size);
    this.y = random(-this.size, this.game.height + this.size);
    this.speed = {
      x: sample([random(-10, -5, true), random(5, 10, true)]) * Math.sqrt(this.size) / 150,
      y: random(-10, 10, true) * Math.sqrt(this.size) / 150
    };

    const graphics = this.game.add.graphics(0, 0);
    graphics.beginFill(this.color);
    graphics.drawCircle(0, 0, this.size);
    this.addChild(graphics);

    this.alpha = random();
    this.alphaPlus = true;
    if (this.size > 400) {
      this.alpha = random(0.1, 0.2, true);
      return;
    }

    this.interval = setInterval(() => {
      this.alpha = this.alphaPlus ? this.alpha + 0.02 : this.alpha - 0.02;
      if (this.alpha > 0.9) {
        this.alphaPlus = false;
      }
      if (this.alpha < 0.02) {
        this.alphaPlus = true;
      }
    }, 33);
  }

  update() {
    const bounds = {
      top: this.game.camera.y,
      right: this.game.width + this.game.camera.x,
      bottom: this.game.height + this.game.camera.y,
      left: this.game.camera.x
    };

    if (this.alpha < 0.02) {
      this.x = random(bounds.left, bounds.right);
    }

    this.x += this.speed.x;
    this.y += this.speed.y;

    if (this.y + this.size < bounds.top && this.speed.y < 0) this.y = bounds.bottom + 150;
    if (this.y - this.size > bounds.bottom && this.speed.y > 0) this.y = bounds.top - 150;
    if (this.x - this.size > bounds.right && this.speed.x > 0) this.x = bounds.left - 150;
    if (this.x + this.size < bounds.left && this.speed.x < 0) this.x = bounds.right + 150;
  }
}
