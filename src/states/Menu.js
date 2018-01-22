import Phaser from 'phaser';
import Swipe from 'phaser-swipe';
import { range } from 'lodash';
import Button from './../prefabs/Button';
import Molecule from '../sprites/Molecule';
import * as levels from './../data/levels';

export default class extends Phaser.State {
  init() {
    if (this.game.global && this.game.global.cleanHeroes) {
      clearInterval(this.game.global.cleanHeroes);
    }
  }

  create() {
    this.game.global = {};
    this.game.time.desiredFps = 60;
    this.game.world.setBounds(0, 0, window.innerWidth, window.innerHeight);
    this.game.camera.setPosition(this.game.world.width / 2 - 400, this.game.world.height);
    this.game.stage.backgroundColor = '#111111';
    this.cursors = this.game.input.keyboard.createCursorKeys();
    const perLine = 3;
    const spacing = this.game.width / (perLine + 1);
    let line = 0;
    let column = 1;
    this.swipe = new Swipe(this.game);
    this.isScrolling = false;
    this.game.input.mouse.mouseWheelCallback = this.mouseWheel.bind(this);

    this.buttons = this.game.add.group();
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

        this.buttons.add(
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
          )
        );
      });

    this.world.setBounds(0, 0, window.innerWidth, window.innerHeight * 5);

    this.molecules = this.game.add.group();
    range(0, 50).forEach(this.createMolecule.bind(this));
  }

  goToLevel(n) {
    setTimeout(() => {
      if (this.isScrolling) {
        return;
      }
      localStorage.setItem('currentLevel', n);
      this.game.state.clearCurrentState();
      this.state.start('Game');
    }, 200);
  }

  createMolecule() {
    this.molecules.add(
      this.game.add.existing(
        new Molecule({
          game: this.game,
          x: 0,
          y: 0
        })
      )
    );
  }

  mouseWheel() {
    if (this.isScrolling) {
      return;
    }
    if (this.game.input.mouse.wheelDelta === Phaser.Mouse.WHEEL_DOWN) {
      if (this.buttons.y > -3200) {
        this.isScrolling = true;
        this.scroll(1);
      }
    } else {
      if (this.buttons.y < 0) {
        this.isScrolling = true;
        this.scroll(-1);
      }
    }
  }

  scroll(direction) {
    this.isScrolling = true;
    for (let i = 10; i < 50; i++) {
      setTimeout(() => {
        this.game.camera.y += i / 5 * direction;
        this.buttons.y -= i / 2 * direction;
      }, 1000 / i);
    }
    setTimeout(() => (this.isScrolling = false), 200);
  }

  update() {
    const checkDirection = this.swipe.check();
    if (checkDirection) {
      if (checkDirection.direction === this.swipe.DIRECTION_UP) {
        if (this.buttons.y > -3500) {
          this.scroll(1);
        }
      }
      if (checkDirection.direction === this.swipe.DIRECTION_DOWN) {
        if (this.buttons.y < -10) {
          this.scroll(-1);
        }
      }
    }

    if (this.cursors.down.isDown) {
      if (this.buttons.y > -3500) {
        this.game.camera.y += 10;
        this.buttons.y -= 30;
      }
    }
    if (this.cursors.up.isDown) {
      if (this.buttons.y < 0) {
        this.game.camera.y -= 10;
        this.buttons.y += 30;
      }
    }
  }
}
