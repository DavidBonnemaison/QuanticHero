import Phaser from 'phaser';
import { centerGameObjects } from '../utils';

export default class extends Phaser.State {
  init() {}

  preload() {
    this.loaderBg = this.add.sprite(this.game.world.centerX, this.game.world.centerY, 'loaderBg');
    this.loaderBar = this.add.sprite(this.game.world.centerX, this.game.world.centerY, 'loaderBar');
    centerGameObjects([this.loaderBg, this.loaderBar]);

    this.load.setPreloadSprite(this.loaderBar);
    //
    // load your assets
    //
    this.load.image('spike', 'assets/images/spike.png');
    this.load.image('ball', 'assets/images/ball.png');
    this.load.spritesheet('hero', 'assets/images/hero.png', 64, 64, 30);
    this.load.spritesheet('door', 'assets/images/door.png', 96, 96, 30);
  }

  create() {
    this.state.start('Menu');
  }
}
