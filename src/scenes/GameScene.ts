import Phaser from 'phaser';
import { soundManager } from '../audio/SoundManager';
import * as defaultLevels from '../data/levels';
import { push } from '../shims/navigation';
import { useGameStore } from '../store';
import { formatScore } from '../tools/formatScore';
import { gameEvents } from '../tools/gameEvents';
import type { LevelData, ParticleType } from '../types';
import Hero, { type TouchInputState } from './Hero';

interface MovingPlatform {
  rect: Phaser.GameObjects.Rectangle;
  movesTo: { x?: number; y?: number };
  direction: { x: 'left' | 'right' | null; y: 'top' | 'bottom' | null };
  width: number;
  height: number;
  startX: number;
  startY: number;
}

interface MoleculeParticle {
  circle: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
}

export default class GameScene extends Phaser.Scene {
  public levelData!: LevelData;
  public portalSprite!: Phaser.Physics.Arcade.Sprite;
  public heroes: Hero[] = [];
  public heroGroup!: Phaser.Physics.Arcade.Group;
  public platforms!: Phaser.Physics.Arcade.StaticGroup;
  public movingPlatformsGroup!: Phaser.Physics.Arcade.Group;
  public sceneBounds!: Phaser.Physics.Arcade.StaticGroup;
  public spikes!: Phaser.Physics.Arcade.StaticGroup;
  public particles!: Phaser.Physics.Arcade.Group;

  private movingPlatforms: MovingPlatform[] = [];
  private molecules: MoleculeParticle[] = [];
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: { [key: string]: Phaser.Input.Keyboard.Key } | null = null;
  private touchInput: TouchInputState = { left: false, right: false, jump: false };
  private isPointerDown = false;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private startTime = 0;
  private timerText!: Phaser.GameObjects.Text;
  private isLevelCompleted = false;

  constructor() {
    super('Game');
  }

  init(): void {
    this.heroes = [];
    this.movingPlatforms = [];
    this.molecules = [];
    this.isLevelCompleted = false;

    const store = useGameStore.getState();
    const currentLevel = store.currentLevel || 1;
    let levels = store.customLevels;
    if (!levels) {
      levels = defaultLevels as unknown as Record<string, LevelData>;
      store.setLevels(levels);
    }
    const levelKey = `level${currentLevel}`;
    this.levelData = levels[levelKey] || levels.level1;
    if (!levels[levelKey]) {
      store.updateCurrentLevel(1);
    }
  }

  create(): void {
    // 1. Physics & Bounds
    this.physics.world.gravity.y = 700;
    this.physics.world.setBounds(0, 0, this.levelData.width, this.levelData.height);
    this.physics.world.setBoundsCollision(false, false, false, false);
    this.cameras.main.setBounds(0, 0, this.levelData.width, this.levelData.height);
    this.cameras.main.setBackgroundColor(this.levelData.hue);

    // Dedicated scene boundary walls (left, right, ceiling) for exclusive boundary bouncing
    this.sceneBounds = this.physics.add.staticGroup();

    // Left wall: thickness 40, right edge at x = 0
    const leftWall = this.add.rectangle(-20, this.levelData.height / 2, 40, this.levelData.height);
    this.physics.add.existing(leftWall, true);
    leftWall.setVisible(false);
    leftWall.setData('boundary', 'left');
    this.sceneBounds.add(leftWall);

    // Right wall: thickness 40, left edge at x = levelData.width
    const rightWall = this.add.rectangle(
      this.levelData.width + 20,
      this.levelData.height / 2,
      40,
      this.levelData.height
    );
    this.physics.add.existing(rightWall, true);
    rightWall.setVisible(false);
    rightWall.setData('boundary', 'right');
    this.sceneBounds.add(rightWall);

    // Ceiling: thickness 40, bottom edge at y = 0
    const ceiling = this.add.rectangle(
      this.levelData.width / 2,
      -20,
      this.levelData.width + 80,
      40
    );
    this.physics.add.existing(ceiling, true);
    ceiling.setVisible(false);
    ceiling.setData('boundary', 'ceiling');
    this.sceneBounds.add(ceiling);

    // 2. Background ambient molecules
    this.createMolecules();

    // 3. Platforms
    this.platforms = this.physics.add.staticGroup();
    this.movingPlatformsGroup = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    const antiHueColor = Phaser.Display.Color.HexStringToColor(this.levelData.antiHue).color;

    for (const p of this.levelData.platforms) {
      const width = p.width ?? 200;
      const height = p.height ?? 20;
      const rect = this.add.rectangle(
        p.x + width / 2,
        p.y + height / 2,
        width,
        height,
        antiHueColor
      );

      if (p.movesTo) {
        this.physics.add.existing(rect, false);
        this.movingPlatformsGroup.add(rect);
        const body = rect.body as Phaser.Physics.Arcade.Body;
        body.setImmovable(true);
        body.setAllowGravity(false);

        const dirX =
          p.movesTo.x !== undefined
            ? p.movesTo.x > p.x
              ? 'right'
              : p.movesTo.x < p.x
                ? 'left'
                : null
            : null;
        const dirY =
          p.movesTo.y !== undefined
            ? p.movesTo.y > p.y
              ? 'bottom'
              : p.movesTo.y < p.y
                ? 'top'
                : null
            : null;
        this.movingPlatforms.push({
          rect,
          movesTo: p.movesTo,
          direction: { x: dirX, y: dirY },
          width,
          height,
          startX: p.x + width / 2,
          startY: p.y + height / 2
        });
      } else {
        this.physics.add.existing(rect, true);
        this.platforms.add(rect);
      }
    }

    // 4. Spikes
    this.spikes = this.physics.add.staticGroup();
    const hueColor = Phaser.Display.Color.HexStringToColor(this.levelData.hue).color;

    for (const s of this.levelData.spikes) {
      const width = s.width ?? 200;
      const height = s.height ?? 20;
      const spikeRect = this.add.rectangle(
        s.x + width / 2,
        s.y + height / 2,
        width,
        height,
        hueColor
      );
      this.physics.add.existing(spikeRect, true);
      this.spikes.add(spikeRect);
    }

    // 5. Particles
    this.particles = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    const assetMap: Record<ParticleType, string> = {
      duplicate: 'blue',
      speed: 'red',
      lowGravity: 'green',
      antiGravity: 'cyan'
    };

    for (const part of this.levelData.particles) {
      const textureKey = assetMap[part.type] || 'blue';
      const sprite = this.physics.add.sprite(part.x, part.y, textureKey);
      sprite.setScale(0.2, 0.2);
      sprite.setData('type', part.type);
      this.particles.add(sprite);
      const pBody = sprite.body as Phaser.Physics.Arcade.Body;
      pBody.setImmovable(true);
      pBody.setAllowGravity(false);

      this.tweens.add({
        targets: sprite,
        y: part.y - 6,
        yoyo: true,
        duration: 800,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // 6. Portal
    const portalX = this.levelData.door.x - 48;
    const portalY = this.levelData.door.y - 96;
    this.portalSprite = this.physics.add.sprite(portalX, portalY, 'portal');
    this.portalSprite.setScale(0.15, 0.2);
    const portalBody = this.portalSprite.body as Phaser.Physics.Arcade.Body;
    portalBody.setImmovable(true);
    portalBody.setAllowGravity(false);
    portalBody.moves = false;
    this.portalSprite.play('spin');

    // 7. Heroes
    this.heroGroup = this.physics.add.group();
    const startX = this.levelData.player.position.x;
    const startY = this.levelData.player.position.y;
    const initialHero = new Hero(this, startX, startY, true);
    this.heroes.push(initialHero);
    this.heroGroup.add(initialHero);

    this.cameras.main.centerOn(initialHero.x, initialHero.y);
    this.cameras.main.startFollow(initialHero, true, 0.1, 0.1);

    // Collisions and Overlaps
    this.physics.add.collider(this.heroGroup, this.platforms);
    this.physics.add.collider(this.heroGroup, this.movingPlatformsGroup);
    this.physics.add.collider(this.heroGroup, this.sceneBounds, (heroObj, boundObj) => {
      const hero = heroObj as Hero;
      const bound = boundObj as Phaser.GameObjects.Rectangle;
      const type = bound.getData('boundary');
      if (type === 'left') {
        hero.bounceOffLeftWall();
      } else if (type === 'right') {
        hero.bounceOffRightWall();
      } else if (type === 'ceiling') {
        hero.bounceOffCeiling();
      }
    });
    this.physics.add.overlap(this.heroGroup, this.spikes, (_heroObj) => {
      this.killHero(_heroObj as Hero);
    });
    this.physics.add.overlap(this.heroGroup, this.particles, (_heroObj, _partObj) => {
      this.collectParticle(_heroObj as Hero, _partObj as Phaser.Physics.Arcade.Sprite);
    });
    this.physics.add.overlap(this.heroGroup, this.portalSprite, () => {
      this.completeLevel();
    });

    // 8. Controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D
      }) as { [key: string]: Phaser.Input.Keyboard.Key };
    }

    this.setupPointerControls();

    this.events.on('hero-clicked', (clickedHero: Hero) => {
      if (this.heroes.length > 1) {
        for (const h of this.heroes) {
          h.setFocus(h === clickedHero);
        }
        this.cameras.main.startFollow(clickedHero, true, 0.1, 0.1);
      }
    });

    // 9. HUD and Timer
    this.createHUD();

    // 10. Level Title Overlay
    this.showLevelTitle();

    // 11. Audio
    soundManager.init();
    soundManager.startBgm();
    soundManager.setClonesCount(this.heroes.length);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      soundManager.stopBgm();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      soundManager.stopBgm();
    });

    this.startTime = this.time.now;
  }

  private createMolecules(): void {
    const numMolecules = 25;
    for (let i = 0; i < numMolecules; i++) {
      const rx = Phaser.Math.Between(0, this.levelData.width);
      const ry = Phaser.Math.Between(0, this.levelData.height);
      const radius = Phaser.Math.Between(15, 60);
      const color = Phaser.Display.Color.HexStringToColor(this.levelData.antiHue).color;
      const circle = this.add.circle(rx, ry, radius, color, Phaser.Math.FloatBetween(0.05, 0.15));
      circle.setDepth(1);
      this.molecules.push({
        circle,
        vx: Phaser.Math.FloatBetween(-0.5, 0.5),
        vy: Phaser.Math.FloatBetween(-0.5, 0.5)
      });
    }
  }

  private setupPointerControls(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isPointerDown = true;
      this.pointerStartX = pointer.x;
      this.pointerStartY = pointer.y;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPointerDown) return;
      const deltaX = pointer.x - this.pointerStartX;
      const deltaY = pointer.y - this.pointerStartY;
      this.touchInput.left = deltaX < -20;
      this.touchInput.right = deltaX > 20;
      this.touchInput.jump = deltaY < -20;
    });

    this.input.on('pointerup', () => {
      this.isPointerDown = false;
      this.touchInput.left = false;
      this.touchInput.right = false;
      this.touchInput.jump = false;
    });
  }

  private createHUD(): void {
    const hudBar = this.add.graphics();
    hudBar.fillStyle(0x333333, 0.4);
    hudBar.fillRect(45, 0, this.cameras.main.width - 45, 45);
    hudBar.fillStyle(0xe74c3c, 0.7);
    hudBar.fillRect(0, 0, 45, 45);
    hudBar.setScrollFactor(0);
    hudBar.setDepth(100);

    const backButton = this.add.text(12, 4, '↩', {
      fontFamily: 'VT323',
      fontSize: '36px',
      color: '#ffffff'
    });
    backButton.setScrollFactor(0);
    backButton.setDepth(101);
    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => {
      soundManager.stopBgm();
      try {
        this.game.destroy(true);
      } catch {
        // safe
      }
      window.game = null;
      push('/');
    });

    const getSoundLabel = () => (useGameStore.getState().isMuted ? '🔇' : '🔊');
    const soundButton = this.add.text(58, 6, getSoundLabel(), {
      fontFamily: '"Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif',
      fontSize: '26px'
    });
    soundButton.setScrollFactor(0);
    soundButton.setDepth(101);
    soundButton.setInteractive({ useHandCursor: true });
    soundButton.on('pointerdown', () => {
      useGameStore.getState().toggleMute();
      soundButton.setText(getSoundLabel());
    });

    const unsubStore = useGameStore.subscribe(() => {
      if (soundButton.active) {
        soundButton.setText(getSoundLabel());
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubStore();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      unsubStore();
    });

    this.timerText = this.add.text(this.cameras.main.width - 130, 6, '00:00:00', {
      fontFamily: 'VT323',
      fontSize: '34px',
      color: '#ffffff'
    });
    this.timerText.setScrollFactor(0);
    this.timerText.setDepth(101);
  }

  private showLevelTitle(): void {
    const title = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      `${this.levelData.id} - ${this.levelData.atom}`,
      {
        fontFamily: 'VT323',
        fontSize: '48px',
        color: this.levelData.antiHue,
        align: 'center'
      }
    );
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(90);

    this.tweens.add({
      targets: title,
      alpha: 0,
      delay: 1500,
      duration: 700,
      onComplete: () => title.destroy()
    });
  }

  private killHero(hero: Hero): void {
    if (!hero || !hero.active) return;
    hero.destroy();
    this.heroes = this.heroes.filter((h) => h !== hero && h.active);
    gameEvents.emit('hero:death', { remaining: this.heroes.length });

    if (this.heroes.length === 0) {
      this.scene.restart();
    } else {
      const anyFocused = this.heroes.some((h) => h.isFocused);
      if (!anyFocused && this.heroes.length > 0) {
        this.heroes[0].setFocus(true);
        this.cameras.main.startFollow(this.heroes[0], true, 0.1, 0.1);
      }
    }
  }

  private collectParticle(hero: Hero, particle: Phaser.Physics.Arcade.Sprite): void {
    if (!particle.active) return;
    const type = particle.getData('type') as ParticleType;
    particle.destroy();
    gameEvents.emit('particle:collect', { type });

    const powerUpNames: Record<ParticleType, string> = {
      antiGravity: 'ANTI GRAVITY !',
      lowGravity: 'LOW GRAVITY !',
      speed: 'HIGH SPEED !',
      duplicate: 'CLONING !'
    };

    switch (type) {
      case 'duplicate': {
        const uncertainty = this.levelData.uncertainty ?? 3;
        if (this.heroes.length < uncertainty) {
          const spawnOffset = Phaser.Math.Between(-80, 80);
          const clonedHero = new Hero(this, hero.x + spawnOffset, hero.y - 10, false);
          clonedHero.velocityMultiplier = hero.velocityMultiplier;
          clonedHero.setGravityInverted(this.physics.world.gravity.y < 0);
          this.heroes.push(clonedHero);
          this.heroGroup.add(clonedHero);
          gameEvents.emit('hero:duplicate', { count: this.heroes.length });
        }
        break;
      }
      case 'speed': {
        hero.velocityMultiplier = 1.4;
        break;
      }
      case 'lowGravity': {
        this.physics.world.gravity.y /= 2;
        break;
      }
      case 'antiGravity': {
        this.physics.world.gravity.y *= -1;
        const inverted = this.physics.world.gravity.y < 0;
        for (const h of this.heroes) {
          h.setGravityInverted(inverted);
        }
        break;
      }
    }

    const toast = this.add.text(this.cameras.main.width, 100, powerUpNames[type] || '', {
      fontFamily: 'VT323',
      fontSize: '150px',
      color: '#ffffff'
    });
    toast.setAlpha(0.5);
    toast.setScrollFactor(0);
    toast.setDepth(150);

    this.tweens.add({
      targets: toast,
      x: -toast.width,
      duration: 2200,
      ease: 'Linear',
      onComplete: () => toast.destroy()
    });
  }

  private completeLevel(): void {
    if (this.isLevelCompleted) return;
    this.isLevelCompleted = true;
    soundManager.stopBgm();
    gameEvents.emit('level:complete', { level: Number(this.levelData.id) });

    const elapsedMs = Math.max(0, this.time.now - this.startTime);
    const currentLvl = Number(this.levelData.id);
    const store = useGameStore.getState();

    store.recordScore(currentLvl, elapsedMs);
    const nextLevel = currentLvl + 1;
    store.updateCurrentLevel(nextLevel);
    if (store.maxLevel < nextLevel) {
      store.updateMaxLevel(nextLevel);
    }

    try {
      this.game.destroy(true);
    } catch {
      // safe
    }
    window.game = null;
    push('/done');
  }

  update(_time: number, delta: number): void {
    // Update timer
    if (this.timerText) {
      const elapsedMs = Math.max(0, this.time.now - this.startTime);
      this.timerText.setText(formatScore(elapsedMs));
    }

    // Update heroes
    for (const hero of [...this.heroes]) {
      if (hero.active) {
        hero.updateControl(this.cursors, this.wasd, this.touchInput, delta);
        // Restart if hero falls out through the bottom of the scene
        if (hero.y > this.levelData.height + 20) {
          if (hero.isFocused || this.heroes.length <= 1) {
            this.scene.restart();
            return;
          }
          this.killHero(hero);
        }
      }
    }

    // Update moving platforms
    for (const mp of this.movingPlatforms) {
      const body = mp.rect.body as Phaser.Physics.Arcade.Body;
      const targetX = mp.movesTo.x !== undefined ? mp.movesTo.x + mp.width / 2 : mp.startX;
      const targetY = mp.movesTo.y !== undefined ? mp.movesTo.y + mp.height / 2 : mp.startY;

      if (mp.direction.x === 'right') {
        body.setVelocityX(100);
        if (mp.rect.x > targetX) {
          mp.direction.x = 'left';
        }
      } else if (mp.direction.x === 'left') {
        body.setVelocityX(-100);
        if (mp.rect.x < targetX) {
          mp.direction.x = 'right';
        }
      }

      if (mp.direction.y === 'bottom') {
        body.setVelocityY(20);
        if (mp.rect.y > targetY) {
          mp.direction.y = 'top';
        }
      } else if (mp.direction.y === 'top') {
        body.setVelocityY(-20);
        if (mp.rect.y < targetY) {
          mp.direction.y = 'bottom';
        }
      }
    }

    // Update ambient molecules
    for (const mol of this.molecules) {
      mol.circle.x += mol.vx;
      mol.circle.y += mol.vy;
      if (mol.circle.x < 0) mol.circle.x = this.levelData.width;
      if (mol.circle.x > this.levelData.width) mol.circle.x = 0;
      if (mol.circle.y < 0) mol.circle.y = this.levelData.height;
      if (mol.circle.y > this.levelData.height) mol.circle.y = 0;
    }
  }
}
