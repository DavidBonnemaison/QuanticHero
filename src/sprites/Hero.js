import Phaser from 'phaser';

export default class extends Phaser.Sprite {
  constructor({ game, x, y, asset, platforms }) {
    super(game, x, y, asset);
    this.anchor.setTo(0.5);
    this.game.physics.arcade.enable(this);
    this.platforms = platforms;

    this.body.bounce.y = 0.2;
    this.body.collideWorldBounds = true;

    this.animations.add('left', [6, 7, 8, 9, 10, 11], 30, true);
    this.animations.add('idle', [0, 1, 2, 3], 10, true);
    this.animations.add('right', [6, 7, 8, 9, 10, 11], 30, true);
    this.animations.add('jump', [13, 14, 15], 3, true);

    this.cursors = this.game.input.keyboard.createCursorKeys();
    this.jumpButton = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    this.animations.play('jump');
  }

  update() {
    this.body.velocity.x = 0;

    this.hitPlatform = this.game.physics.arcade.collide(this, this.platforms);
    this.isOnGround = this.body.touching.down && this.hitPlatform;

    if (this.jumpButton.isDown && this.isOnGround) {
      this.body.velocity.y = -350;
      this.isOnGround = false;
      this.animations.play('jump');
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
