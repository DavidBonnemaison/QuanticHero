import Phaser from 'phaser';
import { centerGameObjects } from '../utils';

export default class extends Phaser.State {
  init() {}

  preload() {
    this.loaderBg = this.add.sprite(
      this.game.world.centerX,
      this.game.world.centerY,
      'loaderBg'
    );
    this.loaderBar = this.add.sprite(
      this.game.world.centerX,
      this.game.world.centerY,
      'loaderBar'
    );
    centerGameObjects([this.loaderBg, this.loaderBar]);

    this.load.setPreloadSprite(this.loaderBar);
    //
    // load your assets
    //
    this.load.image('bg', 'assets/images/bg.png');
    this.load.image('platform', 'assets/images/platform.png');
    this.load.spritesheet('hero', 'assets/images/hero.png', 64, 64, 30);
  }

  create() {
    this.state.start('Game');
  }
}
