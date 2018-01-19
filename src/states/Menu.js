import Phaser from 'phaser';
import Button from './../prefabs/Button';
import Molecule from '../sprites/Molecule';
import { range } from 'lodash';

export default class extends Phaser.State {
  init() {
    this.game.stage.backgroundColor = '#111111';
  }

  create() {
    this.beginButton = new Button({
      game: this.game,
      x: this.game.world.centerX,
      y: 200,
      text: 'Begin',
      callback: this.begin.bind(this)
    });
    this.game.add.existing(this.beginButton);
    this.molecules = this.game.add.group();
    range(0, 20).forEach(this.createMolecule.bind(this));
  }

  begin() {
    this.state.start('Game');
  }

  createMolecule() {
    const mol = new Molecule({
      game: this.game,
      x: this.game.world.width / 2 - 100,
      y: 900,
      asset: ''
    });
    this.molecules.add(this.game.add.existing(mol));
  }
}
