import Phaser from 'phaser';
import { sample, uniqBy, round, remove, min, max } from 'lodash';

export default class Hero extends Phaser.Sprite {
  constructor({ game, x, y, asset, platforms, spikes, id, HUD, touchCheck, touchController }) {
    super(game, x, y, asset);
    this.game = game;
    this.asset = 'hero';
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
    this.animations.add('left', [6, 7, 8, 9, 10, 11], 30, true);
    this.animations.add('idle', [0, 1, 2, 3], 10, true);
    this.animations.add('right', [6, 7, 8, 9, 10, 11], 30, true);
    this.animations.add('jump', [13, 14, 15], 3, true);
    this.cursors = this.game.input.keyboard.createCursorKeys();
    this.animations.play('jump');
    this.game.global.cleanHeroes = setInterval(this.clean.bind(this), 1000);
    this.touchController = touchController;
    this.touchCheck = touchCheck || {
      deltaX: 0,
      deltaY: 0
    };
  }

  duplicate() {
    this.data.uncertainty = 3; // temporary limit at 3
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
      ...this,
      x: clonedHero.position.x + Math.random() * 200 - 100,
      y: clonedHero.position.y - 10,
      id: Math.random() * 100
    });

    this.game.add.existing(newHero);
    this.game.global.heroes.push(newHero);
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
    this.destroy();
  }

  update() {
    if (this.game.global.heroes.length > 1 && !this.inCamera) {
      this.killHero(this.id);
      return;
    }

    if (this.game.physics.arcade.collide(this, this.spikes)) {
      this.killHero(this.id);
      return;
    }

    const previousMovement = this.touchCheck;
    this.touchCheck = this.touchController.check();
    let { deltaX, deltaY } = this.touchCheck;
    const lastDeltaX = previousMovement.deltaX;
    const jump = deltaY > 20;
    const goRight = deltaX > 20 || lastDeltaX > 20;
    const goLeft = deltaX < -20 || lastDeltaX < -20;

    this.body.velocity.x = 0;
    const hitPlatform = this.game.physics.arcade.collide(this, this.platforms);

    let isOnGround = this.body.touching.down && hitPlatform;

    const keepMoving = !hitPlatform && lastDeltaX !== 0 && deltaX === 0;
    if (keepMoving) {
      deltaX = lastDeltaX;
      this.touchCheck.deltaX = previousMovement.deltaX;
    }

    if ((this.cursors.up.isDown || jump) && isOnGround) {
      this.body.velocity.y = max([deltaY > 20 ? -12 * deltaY : -450, -450]);
      isOnGround = false;
      this.animations.play('jump');
      this.duplicate();
    }

    if (this.cursors.left.isDown || goLeft) {
      this.body.velocity.x = max([deltaX < 20 ? 8 * deltaX : -350, -350]);
      if (isOnGround) {
        this.animations.play('left');
      }
      this.scale.x = -1;
    } else if (this.cursors.right.isDown || goRight) {
      this.body.velocity.x = min([deltaX > 20 ? 8 * deltaX : 350, 350]);
      if (isOnGround) {
        this.animations.play('right');
      }
      this.scale.x = 1;
    } else {
      if (isOnGround) {
        this.animations.play('idle');
      }
    }
  }
}
