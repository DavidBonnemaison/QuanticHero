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
        font: '40px VT323',
        fill: '#ffffff',
        align: 'center'
      }
    );
    block.anchor.setTo(0.5);
    return block;
  }

  nextAction() {
    if (this.actionEnabled) {
      this.currentAdvice += 1;
      if (this.currentAdvice === this.all.children.length) {
        this.game.state.clearCurrentState();
        this.state.start('Game');
        return;
      }
      this.actionEnabled = false;
      this.all.y -= this.game.world.height;
      setTimeout(() => (this.actionEnabled = true), 500);
    }
  }

  create() {
    this.actionEnabled = true;
    this.game.time.desiredFps = 60;
    this.game.world.setBounds(0, 0, window.innerWidth, window.innerHeight);
    this.game.camera.setPosition(0, 0);
    this.currentAdvice = 0;

    const text1 = this.makeText(
      `Oops... Sorry kid,
looks like I shrank 
you to the size 
of an atom.`,
      0
    );

    const text2 = this.makeText(
      `Ok, you'll have to
escape through the
molecules.`,
      1
    );

    const text3 = this.makeText(
      `I should warn you,
quantum uncertainty
will make you feel 
like you duplicate
at every move...`,
      2
    );

    const text4 = this.makeText(
      `Get all the
electrons to go to
the next molecules.
Good luck !`,
      3
    );

    const nextButton = new ActionButton({
      game: this.game,
      x: this.game.world.width / 2,
      y: this.game.world.height - 50,
      callback: this.nextAction.bind(this),
      text: 'Continue'
    });

    this.all = this.game.add.group();
    this.all.add(text1);
    this.all.add(text2);
    this.all.add(text3);
    this.all.add(text4);

    this.game.add.existing(nextButton);
  }
}
