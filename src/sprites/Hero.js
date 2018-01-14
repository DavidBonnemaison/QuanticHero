import Phaser from 'phaser';
import { sample, uniqBy, round, remove, map, groupBy } from 'lodash';

export default class Hero extends Phaser.Sprite {
  constructor({ game, x, y, asset, platforms, id }) {
    super(game, x, y, asset);
    this.anchor.setTo(0.5);
    this.id = id;
    this.game.physics.arcade.enable(this);
    this.platforms = platforms;
    this.isDuplicating = false;
    this.body.bounce.y = 0.2;
    this.body.collideWorldBounds = true;

    this.animations.add('left', [6, 7, 8, 9, 10, 11], 30, true);
    this.animations.add('idle', [0, 1, 2, 3], 10, true);
    this.animations.add('right', [6, 7, 8, 9, 10, 11], 30, true);
    this.animations.add('jump', [13, 14, 15], 3, true);

    this.cursors = this.game.input.keyboard.createCursorKeys();
    this.jumpButton = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    this.animations.play('jump');

    setInterval(this.clean.bind(this), 1000);
  }

  duplicate() {
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
      id: Math.random() * 100
    });

    this.game.add.existing(newHero);
    this.game.global.heroes.push(newHero);
    setTimeout(() => (this.isDuplicating = false), 1000);
  }

  clean() {
    this.game.global.heroes = uniqBy(this.game.global.heroes, ({ x, y }) =>
      round(x) + round(y)
    );
    if (!this.game.global.heroes.includes(this)) {
      this.killHero(this.id);
    }
  }

  killHero(id) {
    this.kill();
    this.game.global.heroes = remove(
      this.game.global.heroes,
      hero => hero.id !== id
    );
  }

  update() {
    if (this.game.global.heroes.length > 2 && !this.inCamera) {
      this.killHero(this.id);
    }
    this.body.velocity.x = 0;

    this.hitPlatform = this.game.physics.arcade.collide(this, this.platforms);
    this.isOnGround = this.body.touching.down && this.hitPlatform;

    if (this.cursors.up.isDown && this.isOnGround) {
      this.body.velocity.y = -350;
      this.isOnGround = false;
      this.animations.play('jump');
      this.duplicate();
    }

    if (this.cursors.left.isDown) {
      this.body.velocity.x = -200;

      if (this.isOnGround) {
        this.animations.play('left');
      }
      this.scale.x = -1;
      this.facing = 'left';
    } else if (this.cursors.right.isDown) {
      this.body.velocity.x = 200;

      if (this.isOnGround) {
        this.animations.play('right');
      }
      this.scale.x = 1;
      this.facing = 'right';
    } else {
      if (this.isOnGround) {
        this.animations.play('idle');
      }
      this.facing = 'idle';
    }
  }
}
