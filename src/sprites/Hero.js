import Phaser from 'phaser';
import { sample, uniqBy, round, remove } from 'lodash';

export default class Hero extends Phaser.Sprite {
  constructor({ game, x, y, asset, platforms, spikes, id, HUD, leftController, rightController }) {
    super(game, x, y, asset);
    this.game = game;
    this.game.global = this.game.global || {};
    this.game.global.heroes = this.game.global.heroes || [];
    this.anchor.setTo(0.5);
    this.id = id;
    this.game.physics.arcade.enable(this);
    this.platforms = platforms;
    this.spikes = spikes;
    this.isDuplicating = false;
    this.body.bounce.y = 0.2;
    this.body.collideWorldBounds = true;
    this.HUD = HUD;
    this.data = this.game.data;
    this.leftController = leftController;
    this.rightController = rightController;
    this.animations.add('left', [6, 7, 8, 9, 10, 11], 30, true);
    this.animations.add('idle', [0, 1, 2, 3], 10, true);
    this.animations.add('right', [6, 7, 8, 9, 10, 11], 30, true);
    this.animations.add('jump', [13, 14, 15], 3, true);
    this.cursors = this.game.input.keyboard.createCursorKeys();
    this.animations.play('jump');
    this.game.global.cleanHeroes = setInterval(this.clean.bind(this), 1000);
  }

  duplicate() {
    console.log(this.leftController);
    if (this.game.global.heroes.length === this.data.uncertainty) {
      return;
    }
    const onGoingDuplications = this.game.global.heroes
      .map(hero => hero.isDuplicating)
      .filter(status => status === true);
    if (onGoingDuplications.length) {
      return;
    }
    this.isDuplicating = true;
    const clonedHero = sample(this.game.global.heroes);
    const newHero = new Hero({
      game: this.game,
      x: clonedHero.position.x + Math.random() * 200 - 100,
      y: clonedHero.position.y,
      asset: 'hero',
      platforms: this.platforms,
      spikes: this.spikes,
      id: Math.random() * 100,
      heroes: this.heroes,
      HUD: this.HUD,
      leftController: this.leftController,
      rightController: this.rightController
    });

    this.game.add.existing(newHero);
    this.game.global.heroes.push(newHero);
    this.HUD.updateUncertainty(this.game.global.heroes.length);
    setTimeout(() => (this.isDuplicating = false), 1000);
  }

  clean() {
    if (!this.game) {
      return;
    }
    this.game.global.heroes = uniqBy(this.game.global.heroes, ({ x, y }) => round(x) + round(y));
    if (!this.game.global.heroes.includes(this)) {
      this.killHero(this.id);
    }
  }

  killHero(id) {
    this.kill();
    this.game.global.heroes = remove(this.game.global.heroes, hero => hero.id !== id);
    this.HUD.updateUncertainty(this.game.global.heroes.length);
    this.destroy();
  }

  update() {
    this.goRight = !this.leftController && this.rightController;
    this.goLeft = !this.rightController && this.leftController;
    this.jump = this.rightController && this.leftController;

    if (this.game.global.heroes.length > 1 && !this.inCamera) {
      this.killHero(this.id);
      return;
    }

    this.body.velocity.x = 0;
    this.hitPlatform = this.game.physics.arcade.collide(this, this.platforms);
    this.hitSpikes = this.game.physics.arcade.collide(this, this.spikes);

    if (this.hitSpikes) {
      this.killHero(this.id);
      return;
    }

    this.isOnGround = this.body.touching.down && this.hitPlatform;

    if ((this.cursors.up.isDown || this.jump) && this.isOnGround) {
      this.body.velocity.y = -400;
      this.isOnGround = false;
      this.animations.play('jump');
      this.duplicate();
    }

    if (this.cursors.left.isDown || this.goLeft) {
      this.body.velocity.x = -300;

      if (this.isOnGround) {
        this.animations.play('left');
      }
      this.scale.x = -1;
    } else if (this.cursors.right.isDown || this.goRight) {
      this.body.velocity.x = 300;

      if (this.isOnGround) {
        this.animations.play('right');
      }
      this.scale.x = 1;
    } else {
      if (this.isOnGround) {
        this.animations.play('idle');
      }
    }
  }
}
