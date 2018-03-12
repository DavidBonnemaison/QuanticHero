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
    this.load.image('red', 'assets/images/red.png');
    this.load.image('cyan', 'assets/images/cyan.png');
    this.load.image('blue', 'assets/images/blue.png');
    this.load.image('yellow', 'assets/images/yellow.png');
    this.load.image('green', 'assets/images/green.png');
    this.load.spritesheet('hero', 'assets/images/hero.png', 64, 64, 30);
    this.load.spritesheet('disabled', 'assets/images/disabled.png', 64, 64, 30);
    this.load.spritesheet('portal', 'assets/images/portal.png', 480, 312, 30);
  }

  create() {
    this.state.start('Game');
  }
}
