import Phaser from 'phaser';
import _ from 'lodash';
import randomColor from 'randomcolor';

export default class Molecule extends Phaser.Sprite {
  constructor({ game, x, y, asset }) {
    super(game, x, y, asset);
    this.anchor.setTo(0.5);
    this.game = game;
    this.scale.setTo(0.2, 0.2);
    this.id = _.random(1000, 9999);
    this.size = _.sample([_.random(2000, 3000), _.random(50, 300)]);
    this.color = (
      '0x' +
      randomColor({
        hue: 'blue'
      })
    )
      .toUpperCase()
      .replace('#', '');
    this.x = _.random(0, this.game.world.width);
    this.y = _.random(0, this.game.world.height);
    this.speed = {
      x:
        _.sample([_.random(-10, -5, true), _.random(5, 10, true)]) *
        Math.sqrt(this.size) /
        150,
      y: _.random(-10, 10, true) * Math.sqrt(this.size) / 150
    };
    this.alpha = _.random(0.2, 0.8, true) / this.size * 200;

    const graphics = this.game.add.graphics(0, 0);
    graphics.beginFill(this.color);
    graphics.drawCircle(0, 0, this.size);
    this.game.physics.arcade.enable(this);
    this.body.immovable = true;
    this.body.moves = false;
    this.addChild(graphics);
  }

  update() {
    if (this.y - this.size / 2 > this.game.world.height)
      this.y = this.size / 10 * -1;

    if (this.y < this.size / 2 * -1)
      this.y = this.game.world.height + this.size / 2;

    if (this.x - this.size / 2 > this.game.world.width)
      this.x = this.size / 2 * -1;
    if (this.x < this.size / 2 * -1)
      this.x = this.game.world.width + this.size / 2;

    this.x += this.speed.x;
    this.y += this.speed.y;
  }
}
