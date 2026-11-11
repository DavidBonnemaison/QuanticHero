import Phaser from 'phaser';
import { soundManager } from '../audio/SoundManager';
import * as defaultLevels from '../data/levels';
import { QuantumEffectsManager } from '../effects/QuantumEffectsManager';
import { push } from '../shims/navigation';
import { useGameStore } from '../store';
import {
  type GhostFrame,
  GhostRecorder,
  calculateSplitDelta,
  decompressTrajectory,
  formatSplitDelta
} from '../tools/GhostRecorder';
import { hapticFeedback } from '../tools/HapticFeedback';
import { formatScore } from '../tools/formatScore';
import { gameEvents } from '../tools/gameEvents';
import { decodeLevelFromUrl } from '../tools/levelCodec';
import type { LevelData, ParticleType } from '../types';
import { GhostHero } from './GhostHero';
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
  public ghostHero: GhostHero | null = null;
  public isEntangled = false;
  public betaHero: Hero | null = null;
  public betaPortalSprite: Phaser.Physics.Arcade.Sprite | null = null;

  private entanglementGraphics: Phaser.GameObjects.Graphics | null = null;
  private alphaEnteredPortal = false;
  private betaEnteredPortal = false;
  private ghostRecorder: GhostRecorder = new GhostRecorder();
  private ghostFrames: GhostFrame[] = [];
  private splitDeltaText: Phaser.GameObjects.Text | null = null;
  private ghostButton: Phaser.GameObjects.Text | null = null;
  private movingPlatforms: MovingPlatform[] = [];
  private molecules: MoleculeParticle[] = [];
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: { [key: string]: Phaser.Input.Keyboard.Key } | null = null;
  private touchInput: TouchInputState = { left: false, right: false, jump: false };
  private isPointerDown = false;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private startTime = 0;
  private timerStarted = false;
  private timerText!: Phaser.GameObjects.Text;
  private isLevelCompleted = false;
  private quantumEffects: QuantumEffectsManager | null = null;

  constructor() {
    super('Game');
  }

  init(): void {
    this.heroes = [];
    this.movingPlatforms = [];
    this.molecules = [];
    this.isLevelCompleted = false;
    this.quantumEffects = null;
    this.ghostHero = null;
    this.ghostRecorder.reset();
    this.ghostFrames = [];
    this.startTime = 0;
    this.timerStarted = false;
    this.splitDeltaText = null;
    this.ghostButton = null;
    this.isEntangled = false;
    this.betaHero = null;
    this.betaPortalSprite = null;
    this.entanglementGraphics = null;
    this.alphaEnteredPortal = false;
    this.betaEnteredPortal = false;

    const store = useGameStore.getState();

    // Check if URL contains custom level and store hasn't set it yet
    if (!store.sharedLevel && typeof window !== 'undefined') {
      const hashOrSearch = window.location.hash || window.location.search;
      if (hashOrSearch && (hashOrSearch.includes('custom=') || hashOrSearch.length > 20)) {
        const decoded = decodeLevelFromUrl(hashOrSearch);
        if (decoded) {
          store.setSharedLevel(decoded);
        }
      }
    }

    if (store.sharedLevel) {
      this.levelData = store.sharedLevel;
      return;
    }

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

    // 7. Heroes & Entanglement Setup
    this.heroGroup = this.physics.add.group();
    const startX = this.levelData.player.position.x;
    const startY = this.levelData.player.position.y;
    const initialHero = new Hero(this, startX, startY, true);
    this.heroes.push(initialHero);
    this.heroGroup.add(initialHero);

    const entanglement = this.levelData.entanglement;
    this.isEntangled = Boolean(entanglement);

    if (entanglement) {
      initialHero.setEntangled(false, entanglement.mode);

      const betaX = entanglement.betaSpawn
        ? entanglement.betaSpawn.x
        : this.levelData.width - startX;
      const betaY = entanglement.betaSpawn ? entanglement.betaSpawn.y : startY;

      this.betaHero = new Hero(this, betaX, betaY, true);
      this.betaHero.setEntangled(true, entanglement.mode);
      if (entanglement.mode === 'inverted_gravity' || entanglement.mode === 'mirror_and_gravity') {
        const bBody = this.betaHero.body as Phaser.Physics.Arcade.Body;
        bBody.gravity.y = -1400;
      }
      this.heroes.push(this.betaHero);
      this.heroGroup.add(this.betaHero);

      // Create Beta Portal if dual portal mode or betaDoor specified
      if (entanglement.portalMode === 'dual' || entanglement.betaDoor) {
        const betaDoorPos = entanglement.betaDoor || this.levelData.door;
        const betaPortalX = betaDoorPos.x - 48;
        const betaPortalY = betaDoorPos.y - 96;
        this.betaPortalSprite = this.physics.add.sprite(betaPortalX, betaPortalY, 'portal');
        this.betaPortalSprite.setScale(0.15, 0.2);
        this.betaPortalSprite.setTint(0xec4899);
        const bpBody = this.betaPortalSprite.body as Phaser.Physics.Arcade.Body;
        bpBody.setImmovable(true);
        bpBody.setAllowGravity(false);
        bpBody.moves = false;
        this.betaPortalSprite.play('spin');
      }

      // Entanglement laser beam graphics
      this.entanglementGraphics = this.add.graphics();
      this.entanglementGraphics.setDepth(20);

      // Initial camera positioning for centroid
      const cx = (initialHero.x + this.betaHero.x) / 2;
      const cy = (initialHero.y + this.betaHero.y) / 2;
      this.cameras.main.centerOn(cx, cy);
    } else {
      this.cameras.main.centerOn(initialHero.x, initialHero.y);
      this.cameras.main.startFollow(initialHero, true, 0.1, 0.1);
    }

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

    if (this.isEntangled) {
      this.physics.add.overlap(this.heroGroup, this.portalSprite, (_portal, heroObj) => {
        this.handleEntangledPortalArrival(heroObj as Hero, this.portalSprite, false);
      });
      if (this.betaPortalSprite) {
        this.physics.add.overlap(this.heroGroup, this.betaPortalSprite, (_portal, heroObj) => {
          this.handleEntangledPortalArrival(heroObj as Hero, this.betaPortalSprite!, true);
        });
      }
    } else {
      this.physics.add.overlap(this.heroGroup, this.portalSprite, () => {
        this.completeLevel();
      });
    }

    // 7b. Ghost Hero Replay
    // Display ghost only on replay of an already-beaten level or if challenge has author ghost
    const store = useGameStore.getState();
    const currentLvlNum = Number(this.levelData.id);
    const scoreItem = store.scores[currentLvlNum];

    let trajectoryToReplay: string | undefined;

    if (store.sharedLevel?.authorGhost) {
      // Shared challenge with author ghost
      trajectoryToReplay = store.sharedLevel.authorGhost;
    } else if (store.sharedLevel) {
      // Shared level without author ghost: check if player already beat it before
      const sharedScore = store.scores[0];
      if (sharedScore?.best && sharedScore.best > 0 && sharedScore.ghostTrajectory) {
        trajectoryToReplay = sharedScore.ghostTrajectory;
      }
    } else {
      // Standard career level: only show ghost if replaying a completed level (best > 0 and level < maxLevel)
      const isReplay = Boolean(
        scoreItem?.best && scoreItem.best > 0 && store.maxLevel > currentLvlNum
      );
      if (isReplay && scoreItem?.ghostTrajectory) {
        trajectoryToReplay = scoreItem.ghostTrajectory;
      }
    }

    if (trajectoryToReplay) {
      this.ghostFrames = decompressTrajectory(trajectoryToReplay);
      if (this.ghostFrames.length > 0) {
        this.ghostHero = new GhostHero(this, this.ghostFrames);
        this.ghostHero.setVisible(store.ghostEnabled);
      }
    }

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
      if (this.isEntangled) return;
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

    // 11. Audio & Haptics
    soundManager.init();
    soundManager.setClonesCount(this.heroes.length);

    hapticFeedback.init();

    // 12. Quantum Visual Effects (de Broglie waves & spacetime vortex)
    this.quantumEffects = new QuantumEffectsManager(this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      soundManager.stopBgm();
      this.quantumEffects?.destroy();
      this.quantumEffects = null;
      if (this.entanglementGraphics) {
        this.entanglementGraphics.destroy();
        this.entanglementGraphics = null;
      }
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      soundManager.stopBgm();
      this.quantumEffects?.destroy();
      this.quantumEffects = null;
      if (this.entanglementGraphics) {
        this.entanglementGraphics.destroy();
        this.entanglementGraphics = null;
      }
    });
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

    const backButton = this.add.text(10, 6, '◄', {
      fontFamily: 'VT323',
      fontSize: '28px',
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

    // Sound toggle button
    const getSoundLabel = () => (useGameStore.getState().isMuted ? 'SND:OFF' : 'SND:ON');
    const soundButton = this.add.text(46, 8, getSoundLabel(), {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#00ffcc'
    });
    soundButton.setScrollFactor(0);
    soundButton.setDepth(101);
    soundButton.setInteractive({ useHandCursor: true });
    soundButton.on('pointerdown', () => {
      useGameStore.getState().toggleMute();
      soundButton.setText(getSoundLabel());
    });

    // Haptic feedback toggle button
    const getHapticLabel = () => (useGameStore.getState().hapticsEnabled ? 'HAP:ON' : 'HAP:OFF');
    const hapticButton = this.add.text(118, 8, getHapticLabel(), {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#00ffcc'
    });
    hapticButton.setScrollFactor(0);
    hapticButton.setDepth(101);
    hapticButton.setInteractive({ useHandCursor: true });
    hapticButton.on('pointerdown', () => {
      useGameStore.getState().toggleHaptics();
      hapticButton.setText(getHapticLabel());
    });

    // Visual effects toggle button (FX:HI / FX:LO)
    const getFxLabel = () => (useGameStore.getState().reducedEffects ? 'FX:LO' : 'FX:HI');
    const fxButton = this.add.text(190, 8, getFxLabel(), {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#00ffcc'
    });
    fxButton.setScrollFactor(0);
    fxButton.setDepth(101);
    fxButton.setInteractive({ useHandCursor: true });
    fxButton.on('pointerdown', () => {
      useGameStore.getState().toggleReducedEffects();
      fxButton.setText(getFxLabel());
    });

    // Ghost replay toggle button [GHOST]
    const getGhostAlpha = () => (useGameStore.getState().ghostEnabled ? 1 : 0.35);
    this.ghostButton = this.add.text(252, 8, '[GHOST]', {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#38bdf8'
    });
    this.ghostButton.setScrollFactor(0);
    this.ghostButton.setDepth(101);
    this.ghostButton.setAlpha(getGhostAlpha());
    this.ghostButton.setVisible(this.ghostFrames.length > 0);
    this.ghostButton.setInteractive({ useHandCursor: true });
    this.ghostButton.on('pointerdown', () => {
      useGameStore.getState().toggleGhost();
      const isEnabled = useGameStore.getState().ghostEnabled;
      this.ghostButton?.setAlpha(getGhostAlpha());
      if (this.ghostHero) {
        this.ghostHero.setVisible(isEnabled && this.ghostFrames.length > 0);
      }
      if (this.splitDeltaText) {
        this.splitDeltaText.setVisible(isEnabled && this.ghostFrames.length > 0);
      }
    });

    const unsubStore = useGameStore.subscribe(() => {
      if (soundButton.active) {
        soundButton.setText(getSoundLabel());
      }
      if (hapticButton.active) {
        hapticButton.setText(getHapticLabel());
      }
      if (fxButton.active) {
        fxButton.setText(getFxLabel());
      }
      if (this.ghostButton?.active) {
        const isEnabled = useGameStore.getState().ghostEnabled;
        this.ghostButton.setAlpha(getGhostAlpha());
        this.ghostButton.setVisible(this.ghostFrames.length > 0);
        if (this.ghostHero) {
          this.ghostHero.setVisible(isEnabled && this.ghostFrames.length > 0);
        }
        if (this.splitDeltaText) {
          this.splitDeltaText.setVisible(isEnabled && this.ghostFrames.length > 0);
        }
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubStore();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      unsubStore();
    });

    this.timerText = this.add.text(this.cameras.main.width - 15, 2, '00:00:00', {
      fontFamily: 'VT323',
      fontSize: '26px',
      color: '#ffffff'
    });
    this.timerText.setOrigin(1, 0);
    this.timerText.setScrollFactor(0);
    this.timerText.setDepth(101);

    this.splitDeltaText = this.add.text(this.cameras.main.width - 15, 24, '--', {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#94a3b8'
    });
    this.splitDeltaText.setOrigin(1, 0);
    this.splitDeltaText.setScrollFactor(0);
    this.splitDeltaText.setDepth(101);
    this.splitDeltaText.setVisible(
      useGameStore.getState().ghostEnabled && this.ghostFrames.length > 0
    );
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

    if (this.isEntangled) {
      gameEvents.emit('hero:death', { remaining: 0, entangledCollapse: true });
      this.scene.restart();
      return;
    }

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

  private handleEntangledPortalArrival(
    hero: Hero,
    portal: Phaser.Physics.Arcade.Sprite,
    isBetaPortal: boolean
  ): void {
    if (hero.enteredPortal || this.isLevelCompleted) return;

    const entanglement = this.levelData.entanglement;
    const isDual = entanglement?.portalMode === 'dual' || Boolean(entanglement?.betaDoor);

    if (isDual) {
      if (hero.isBeta && !isBetaPortal) return;
      if (!hero.isBeta && isBetaPortal) return;
    }

    hero.enteredPortal = true;
    if (hero.body) {
      (hero.body as Phaser.Physics.Arcade.Body).enable = false;
      hero.setVelocity(0, 0);
    }
    hero.setPosition(portal.x + 48, portal.y + 96);
    hero.setAlpha(0.7);

    if (hero.isBeta) {
      this.betaEnteredPortal = true;
    } else {
      this.alphaEnteredPortal = true;
    }

    gameEvents.emit('hero:portal_docked', { isBeta: hero.isBeta });

    if (this.alphaEnteredPortal && this.betaEnteredPortal) {
      this.time.delayedCall(120, () => {
        this.completeLevel();
      });
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
    gameEvents.emit('level:complete', { level: Number(this.levelData.id) || 0 });

    const elapsedMs = Math.max(0, this.time.now - this.startTime);
    const store = useGameStore.getState();

    // Record final frame at portal
    const focusedHero = this.heroes.find((h) => h.isFocused) || this.heroes[0];
    if (focusedHero) {
      this.ghostRecorder.recordFrame(
        elapsedMs,
        focusedHero.x,
        focusedHero.y,
        focusedHero.flipX,
        'idle',
        focusedHero.flipY,
        true
      );
    }
    const trajectory = this.ghostRecorder.getSerialized();

    if (store.sharedLevel) {
      // Record score for shared level under slot 0
      store.recordScore(0, elapsedMs, trajectory);
    } else {
      const currentLvl = Number(this.levelData.id);
      store.recordScore(currentLvl, elapsedMs, trajectory);
      const nextLevel = currentLvl + 1;
      store.updateCurrentLevel(nextLevel);
      if (currentLvl >= 110) {
        if (store.maxEntanglementLevel < nextLevel) {
          store.updateMaxEntanglementLevel(nextLevel);
        }
      } else {
        if (store.maxLevel < nextLevel) {
          store.updateMaxLevel(nextLevel);
        }
      }
    }

    try {
      this.game.destroy(true);
    } catch {
      // safe
    }
    window.game = null;
    push('/done');
  }

  private drawEntanglementBeam(time: number): void {
    if (!this.entanglementGraphics) return;
    this.entanglementGraphics.clear();

    const alpha = this.heroes.find((h) => !h.isBeta);
    const beta = this.heroes.find((h) => h.isBeta);
    if (!alpha || !beta || !alpha.active || !beta.active) return;

    const ax = alpha.x;
    const ay = alpha.y;
    const bx = beta.x;
    const by = beta.y;

    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.hypot(dx, dy);
    if (dist < 5) return;

    const nx = -dy / dist;
    const ny = dx / dist;

    const isReduced = useGameStore.getState().reducedEffects;
    if (isReduced) {
      const pulse = 0.5 + 0.3 * Math.sin(time * 0.006);
      this.entanglementGraphics.lineStyle(3, 0x00ffff, pulse);
      this.entanglementGraphics.beginPath();
      this.entanglementGraphics.moveTo(ax, ay);
      this.entanglementGraphics.lineTo(bx, by);
      this.entanglementGraphics.strokePath();

      this.entanglementGraphics.lineStyle(1.5, 0xec4899, pulse * 0.8);
      this.entanglementGraphics.beginPath();
      this.entanglementGraphics.moveTo(ax, ay);
      this.entanglementGraphics.lineTo(bx, by);
      this.entanglementGraphics.strokePath();
      return;
    }

    const steps = Math.max(24, Math.min(80, Math.floor(dist / 12)));
    const waveSpeed = time * 0.009;
    const waveFreq = 0.035;
    const baseAmp = 8 + 4 * Math.sin(time * 0.004);

    // Pass 1: Magenta outer glow (representing Beta's quantum field)
    this.entanglementGraphics.lineStyle(5, 0xec4899, 0.4);
    this.entanglementGraphics.beginPath();
    this.entanglementGraphics.moveTo(ax, ay);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const env = Math.sin(t * Math.PI);
      const offset = Math.sin(t * dist * waveFreq - waveSpeed) * baseAmp * env;
      const px = ax + dx * t + nx * offset;
      const py = ay + dy * t + ny * offset;
      this.entanglementGraphics.lineTo(px, py);
    }
    this.entanglementGraphics.strokePath();

    // Pass 2: Cyan wave (representing Alpha's quantum field)
    this.entanglementGraphics.lineStyle(3, 0x00e5ff, 0.7);
    this.entanglementGraphics.beginPath();
    this.entanglementGraphics.moveTo(ax, ay);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const env = Math.sin(t * Math.PI);
      const offset =
        Math.sin(t * dist * waveFreq - waveSpeed + Math.PI / 4) * (baseAmp * 0.75) * env;
      const px = ax + dx * t + nx * offset;
      const py = ay + dy * t + ny * offset;
      this.entanglementGraphics.lineTo(px, py);
    }
    this.entanglementGraphics.strokePath();

    // Pass 3: Bright white core line
    this.entanglementGraphics.lineStyle(1.5, 0xffffff, 0.9);
    this.entanglementGraphics.beginPath();
    this.entanglementGraphics.moveTo(ax, ay);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const env = Math.sin(t * Math.PI);
      const offset = Math.sin(t * dist * waveFreq - waveSpeed) * (baseAmp * 0.5) * env;
      const px = ax + dx * t + nx * offset;
      const py = ay + dy * t + ny * offset;
      this.entanglementGraphics.lineTo(px, py);
    }
    this.entanglementGraphics.strokePath();
  }

  update(time: number, delta: number): void {
    if (!this.timerStarted) {
      this.startTime = time;
      this.timerStarted = true;
      if (this.ghostHero) {
        this.ghostHero.updateReplay(0);
      }
    }
    const elapsedMs = Math.max(0, time - this.startTime);

    // Update timer
    if (this.timerText) {
      this.timerText.setText(formatScore(elapsedMs));
    }

    // Dynamic camera framing for entangled heroes
    if (this.isEntangled && this.heroes.length >= 2) {
      const alpha = this.heroes.find((h) => !h.isBeta);
      const beta = this.heroes.find((h) => h.isBeta);
      if (alpha && beta && alpha.active && beta.active) {
        const cx = (alpha.x + beta.x) / 2;
        const cy = (alpha.y + beta.y) / 2;
        const dx = Math.abs(alpha.x - beta.x);
        const dy = Math.abs(alpha.y - beta.y);

        const viewW = this.cameras.main.width;
        const viewH = this.cameras.main.height;
        const paddingX = 240;
        const paddingY = 200;

        const requiredZoomX = viewW / (dx + paddingX);
        const requiredZoomY = viewH / (dy + paddingY);
        const targetZoom = Phaser.Math.Clamp(Math.min(requiredZoomX, requiredZoomY), 0.6, 1.0);

        const currentZoom = this.cameras.main.zoom;
        const newZoom = Phaser.Math.Linear(currentZoom, targetZoom, 0.08);
        this.cameras.main.setZoom(newZoom);

        const currentMid = this.cameras.main.midPoint;
        const newCamX = Phaser.Math.Linear(currentMid.x, cx, 0.1);
        const newCamY = Phaser.Math.Linear(currentMid.y, cy, 0.1);
        this.cameras.main.centerOn(newCamX, newCamY);
      }
    }

    // Entanglement boundary check & laser beam
    if (this.isEntangled) {
      for (const h of this.heroes) {
        if (h.active && !h.enteredPortal) {
          if (
            h.y > this.levelData.height + 60 ||
            h.y < -60 ||
            h.x < -60 ||
            h.x > this.levelData.width + 60
          ) {
            this.killHero(h);
            return;
          }
        }
      }
      this.drawEntanglementBeam(time);
    }

    // Update ghost replay
    if (this.ghostHero && useGameStore.getState().ghostEnabled) {
      this.ghostHero.updateReplay(elapsedMs);
    }

    // Record main player frame and update live speedrun split delta
    const focusedHero = this.heroes.find((h) => h.isFocused) || this.heroes[0];
    if (focusedHero && focusedHero.active && !this.isLevelCompleted) {
      this.ghostRecorder.recordFrame(
        elapsedMs,
        focusedHero.x,
        focusedHero.y,
        focusedHero.flipX,
        focusedHero.getAnimState(),
        focusedHero.flipY
      );

      if (
        this.splitDeltaText &&
        this.ghostFrames.length > 0 &&
        useGameStore.getState().ghostEnabled
      ) {
        const deltaSec = calculateSplitDelta(
          this.ghostFrames,
          focusedHero.x,
          focusedHero.y,
          elapsedMs
        );
        const { text, color } = formatSplitDelta(deltaSec);
        this.splitDeltaText.setText(text);
        this.splitDeltaText.setColor(color);
      }
    }

    // Update quantum visual effects (de Broglie waves & spacetime vortex)
    if (this.quantumEffects) {
      this.quantumEffects.update(time, delta, this.heroes, this.portalSprite);
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
