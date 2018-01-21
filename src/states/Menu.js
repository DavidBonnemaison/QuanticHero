import Phaser from 'phaser';
import Button from './../prefabs/Button';
import Molecule from '../sprites/Molecule';
import * as levels from './../data/levels';
import { range } from 'lodash';

export default class extends Phaser.State {
  init() {
    if (this.game.global && this.game.global.cleanHeroes) {
      clearInterval(this.game.global.cleanHeroes);
    }
  }

  create() {
    this.game.global = {};
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    this.game.time.desiredFps = 30;
    this.game.physics.arcade.gravity.y = 500;
    this.game.world.setBounds(0, 0, window.innerWidth, window.innerHeight);
    this.game.camera.setPosition(
      this.game.world.width / 2 - 400,
      this.game.world.height
    );
    this.game.stage.backgroundColor = '#111111';

    const perLine = 3;
    const spacing = this.game.width / (perLine + 1);
    let line = 0;
    let column = 1;
    Object.keys(levels)
      .sort((a, b) => Number(levels[a].id) - Number(levels[b].id))
      .forEach((key, i) => {
        const { id, hue, antiHue, symbol } = levels[key];
        column += 1;
        if (i % perLine === 0) {
          line += 1;
          column = 1;
        }
        const x = spacing * column;
        const y = 100 * line;
        this.game.add.existing(
          new Button({
            game: this.game,
            x,
            y,
            text: symbol,
            callback: this.goToLevel.bind(this, id),
            hue,
            antiHue
          })
        );
      });

    this.molecules = this.game.add.group();
    range(0, 50).forEach(this.createMolecule.bind(this));
  }

  newGame() {
    this.goToLevel(1);
  }

  goToLevel(n) {
    localStorage.setItem('currentLevel', n);
    this.state.start('Game');
  }

  goToLevelSelection() {}

  createMolecule() {
    const mol = new Molecule({
      game: this.game,
      x: 0,
      y: 0,
      asset: ''
    });
    this.molecules.add(this.game.add.existing(mol));
  }
}
