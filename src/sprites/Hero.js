import Phaser from 'phaser';
import { sample, uniqBy, round, remove, min, max, inRange } from 'lodash';
import { setTimeout } from 'timers';

export default class Hero extends Phaser.Sprite {
  constructor({
    game,
    x,
    y,
    asset,
    platforms,
    spikes,
    id,
    HUD,
    touchCheck,
    touchController,
    isFocused
  }) {
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
    this.touchController = touchController;
    this.touchCheck = touchCheck || {
      deltaX: 0,
      deltaY: 0
    };
    this.isFocused = isFocused;
    this.isAvailable = true;
    this.loadTexture(isFocused ? 'hero' : 'disabled');
    this.velocityMultiplier = 1;
    this.upsideDown = 1;
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
      id: Math.random() * 100,
      isFocused: false
    });

    this.game.add.existing(newHero);
    this.game.global.heroes.push(newHero);
    setTimeout(() => (this.isDuplicating = false), 1000);
  }

  clean() {
    if (!this.game) {
      return;
    }
    const heroes = uniqBy(this.game.global.heroes, ({ x, y }) => round(x, -1) + round(y));
    if (!heroes.includes(this)) {
      this.x += 10;
    }
  }

  killHero(id) {
    this.kill();
    this.game.global.heroes = remove(this.game.global.heroes, hero => hero.id !== id);
    this.destroy();
  }

  toggleFocus(force) {
    this.isAvailable = false;
    setTimeout(() => (this.isAvailable = true), 600);
    const numberFocused = this.game.global.heroes.filter(h => h.isFocused).length;
    if (numberFocused === 1) {
      this.isFocused = true;
      this.loadTexture('hero');
      return;
    }
    this.isFocused = force || !this.isFocused;
    this.loadTexture(this.isFocused ? 'hero' : 'disabled');
  }

  update() {
    if (this.game.global.heroes.length > 1 && !this.inCamera) {
      this.toggleFocus(true);
    }

    if (this.game.physics.arcade.collide(this, this.spikes)) {
      this.killHero(this.id);
      return;
    }

    this.game.physics.arcade.overlap(this.game.global.particles, this, this.duplicate.bind(this));

    this.game.global.heroes.forEach(h => {
      if (h.id === this.id) h.position = this.position;
    });

    const previousMovement = this.touchCheck;
    this.touchCheck = this.touchController.check();
    const { timer } = this.touchController;
    const longPress = inRange(timer._now - timer._started, 450, 500);
    if (longPress && this.isAvailable) {
      let { x, y } = this.touchController.currentPosition;
      const onHero = inRange(this.x, x - 36, x + 36) && inRange(this.y, y - 36, y + 36);
      if (onHero) {
        this.toggleFocus();
      }
    }

    let { deltaX, deltaY } = this.touchCheck;
    const lastDeltaX = previousMovement.deltaX;
    const jump = this.upsideDown === 1 ? deltaY > 20 : deltaY < -20;
    const goRight = deltaX > 20 || lastDeltaX > 20;
    const goLeft = deltaX < -20 || lastDeltaX < -20;

    this.body.velocity.x = 0;
    const hitPlatform = this.game.physics.arcade.collide(this, this.platforms);

    const touching = this.upsideDown === 1 ? this.body.touching.down : this.body.touching.up;
    let isOnGround = touching && hitPlatform;

    this.scale.y = this.upsideDown;

    const keepMoving = !hitPlatform && lastDeltaX !== 0 && deltaX === 0;
    if (keepMoving) {
      deltaX = lastDeltaX;
      this.touchCheck.deltaX = previousMovement.deltaX;
    }

    console.log(deltaY);
    if ((this.cursors.up.isDown || jump) && isOnGround && this.isFocused) {
      console.log(jump);
      this.body.velocity.y = max([deltaY > 20 ? -12 * deltaY : -450, -450]) * this.upsideDown;
      isOnGround = false;
      this.animations.play('jump');
    }

    if ((this.cursors.left.isDown || goLeft) && this.isFocused) {
      this.body.velocity.x =
        max([deltaX < 20 && deltaX !== 0 ? 8 * deltaX : -350, -350]) * this.velocityMultiplier;
      if (isOnGround) {
        this.animations.play('left');
      }
      this.scale.x = -1;
    } else if ((this.cursors.right.isDown || goRight) && this.isFocused) {
      this.body.velocity.x = min([deltaX > 20 ? 8 * deltaX : 350, 350]) * this.velocityMultiplier;
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
