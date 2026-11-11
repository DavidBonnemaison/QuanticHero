import Phaser from 'phaser';

export default class extends Phaser.State {
  init() {
    this.stage.backgroundColor = '#EDEEC9';
    this.fontsReady = false;
    this.fontsLoaded = this.fontsLoaded.bind(this);
  }

  preload() {
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => this.fontsLoaded());
    } else {
      this.fontsLoaded();
    }
    setTimeout(this.fontsLoaded, 1000);

    const text = this.add.text(this.world.centerX, this.world.centerY, 'loading fonts', {
      font: '16px Arial',
      fill: '#dddddd',
      align: 'center'
    });
    text.anchor.setTo(0.5, 0.5);

    this.load.image('loaderBg', '/assets/images/loader-bg.png');
    this.load.image('loaderBar', '/assets/images/loader-bar.png');
  }

  render() {
    if (this.fontsReady) {
      this.state.start('Splash');
    }
  }

  fontsLoaded() {
    this.fontsReady = true;
  }
}
