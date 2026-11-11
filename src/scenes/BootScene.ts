import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    let started = false;
    const startPreload = () => {
      if (!started) {
        started = true;
        this.scene.start('Preload');
      }
    };

    const fallbackTimeout = setTimeout(startPreload, 1000);

    if (document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          clearTimeout(fallbackTimeout);
          startPreload();
        })
        .catch(() => {
          clearTimeout(fallbackTimeout);
          startPreload();
        });
    } else {
      clearTimeout(fallbackTimeout);
      startPreload();
    }
  }
}
