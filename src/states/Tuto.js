import Phaser from 'phaser';
import ActionButton from './../prefabs/ActionButton';

export default class extends Phaser.State {
  makeText(text, i) {
    const block = new Phaser.Text(
      this.game,
      this.game.width / 2,
      this.game.height * i + this.game.height / 2,
      text,
      {
        font: '48px VT323',
        fill: '#ffffff',
        align: 'center'
      }
    );
    block.anchor.setTo(0.5);
    return block;
  }

  create() {
    this.game.time.desiredFps = 60;
    this.game.world.setBounds(0, 0, window.innerWidth, window.innerHeight);
    this.game.camera.setPosition(0, 0);
    const text1 = this.makeText(`Oops... Sorry kiddo,
looks like I shrank 
you to the size 
of an atom.`, 0);

    const text2 = this.makeText(`LOLOL`, 1);
    const text3 = this.makeText(`This is fun`, 2);

    const nextButton = new ActionButton({
      game: this.game,
      x: this.game.world.width / 2,
      y: this.game.world.height - 50,
      callback: () => {
        this.all.y -= this.game.world.height;
      },
      text: 'Continue'
    });

    this.all = this.game.add.group();
    this.all.add(text1);
    this.all.add(text2);
    this.all.add(text3);

    this.game.add.existing(nextButton);
  }
}
