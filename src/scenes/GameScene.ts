import Phaser from 'phaser';
import { soundManager } from '../audio/SoundManager';
import * as defaultLevels from '../data/levels';
import { QuantumEffectsManager } from '../effects/QuantumEffectsManager';
import { assembleCampaignLevel, assemblePacedLevel } from '../generator/chunkAssembler';
import {
  type DecayPlatformState,
  calculateCollapse,
  checkPauliRepulsion,
  checkTunnelObstacle,
  togglePhase,
  updateDecayPlatform
} from '../mechanics/quantumMechanics';
import { PHYSICS } from '../physics/constants';
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
import type { CollapseConfig, GhostMode, LevelData, ParticleType, PlatformPhase } from '../types';
import { GhostHero } from './GhostHero';
import Hero, { type TouchInputState } from './Hero';

export interface Gate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PressurePlate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetGateId: string;
  requireLock?: boolean; // quand un héros se place dessus, la barrière s'ouvre
}

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
  public gatesGroup!: Phaser.Physics.Arcade.StaticGroup;
  public gatesMap: Map<string, { rect: Phaser.GameObjects.Rectangle; data: Gate }> = new Map();
  public pressurePlatesList: Array<{
    baseRect: Phaser.GameObjects.Rectangle;
    padRect: Phaser.GameObjects.Rectangle;
    data: PressurePlate;
    isPressed: boolean;
    startY: number;
  }> = [];
  public movingPlatformsGroup!: Phaser.Physics.Arcade.Group;
  public sceneBounds!: Phaser.Physics.Arcade.StaticGroup;
  public spikes!: Phaser.Physics.Arcade.StaticGroup;
  public particles!: Phaser.Physics.Arcade.Group;
  public ghostHero: GhostHero | null = null;
  public isEntangled = false;
  public betaHero: Hero | null = null;
  public betaPortalSprite: Phaser.Physics.Arcade.Sprite | null = null;

  public hasAnyGhost = false;
  private authorTrajectory?: string;
  private personalTrajectory?: string;

  public isPauliActive = false;
  public isTimeDilationActive = false;
  public timeDilationUntil = 0;
  public currentPhase: PlatformPhase = 'cyan';
  public hasPhasePlatforms = false;
  public hudContainer: Phaser.GameObjects.Container | null = null;

  private phasePlatforms: Array<{ rect: Phaser.GameObjects.Rectangle; phase: PlatformPhase }> = [];
  private decayPlatforms: Array<{
    rect: Phaser.GameObjects.Rectangle;
    state: DecayPlatformState;
    startX: number;
    startY: number;
  }> = [];
  private collapseTopSpikes: Phaser.GameObjects.Rectangle | null = null;
  private collapseBottomSpikes: Phaser.GameObjects.Rectangle | null = null;
  private collapseConfig?: CollapseConfig;
  private pauliGraphics: Phaser.GameObjects.Graphics | null = null;
  private unsubJump: (() => void) | null = null;

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
  private dilatedElapsedMs = 0;
  private timerStarted = false;
  private timerText!: Phaser.GameObjects.Text;
  private phaseIndicatorText: Phaser.GameObjects.Text | null = null;
  private dilationIndicatorText: Phaser.GameObjects.Text | null = null;
  private isLevelCompleted = false;
  private quantumEffects: QuantumEffectsManager | null = null;

  constructor() {
    super('Game');
  }

  init(): void {
    this.heroes = [];
    this.gatesMap.clear();
    this.pressurePlatesList = [];
    this.movingPlatforms = [];
    this.molecules = [];
    this.isLevelCompleted = false;
    this.quantumEffects = null;
    this.ghostHero = null;
    this.ghostRecorder.reset();
    this.ghostFrames = [];
    this.hasAnyGhost = false;
    this.authorTrajectory = undefined;
    this.personalTrajectory = undefined;
    this.startTime = 0;
    this.dilatedElapsedMs = 0;
    this.timerStarted = false;
    this.splitDeltaText = null;
    this.ghostButton = null;
    this.hudContainer = null;
    this.phaseIndicatorText = null;
    this.dilationIndicatorText = null;
    this.isEntangled = false;
    this.betaHero = null;
    this.betaPortalSprite = null;
    this.alphaEnteredPortal = false;
    this.betaEnteredPortal = false;
    this.isPauliActive = false;
    this.isTimeDilationActive = false;
    this.timeDilationUntil = 0;
    this.currentPhase = 'cyan';
    this.hasPhasePlatforms = false;
    this.phasePlatforms = [];
    this.decayPlatforms = [];
    this.collapseTopSpikes = null;
    this.collapseBottomSpikes = null;
    this.collapseConfig = undefined;
    this.pauliGraphics = null;
    if (this.unsubJump) {
      this.unsubJump();
      this.unsubJump = null;
    }

    const store = useGameStore.getState();

    // Check if URL contains procedural seed parameter (?seed=... or ?levelSeed=...)
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
      );
      const seedParam =
        searchParams.get('seed') ||
        searchParams.get('levelSeed') ||
        hashParams.get('seed') ||
        hashParams.get('levelSeed');

      if (seedParam !== null && seedParam !== '') {
        const seedVal = Number.parseInt(seedParam, 10);
        if (!Number.isNaN(seedVal)) {
          const atomParam = searchParams.get('atom') || hashParams.get('atom');
          const atomVal = atomParam ? Number.parseInt(atomParam, 10) : store.currentLevel || 1;
          const paced =
            atomVal <= 10
              ? assembleCampaignLevel(atomVal, seedVal)
              : assemblePacedLevel({ atom: atomVal, seed: seedVal });
          this.levelData = paced.levelData;
          return;
        }
      }
    }

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
    const builtInLevels = defaultLevels as unknown as Record<string, LevelData>;
    const levelKey = `level${currentLevel}`;
    const selected = store.customLevels?.[levelKey] || builtInLevels[levelKey];
    this.levelData = selected || builtInLevels.level1;
    if (!selected) {
      store.updateCurrentLevel(1);
    }
  }

  create(): void {
    // 1. Physics & Bounds
    this.physics.world.gravity.y = PHYSICS.GRAVITY_Y;
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

    this.hasPhasePlatforms = this.levelData.platforms.some((p) => Boolean(p.phase));
    if (this.hasPhasePlatforms) {
      this.currentPhase = 'cyan';
      this.unsubJump = gameEvents.on('hero:jump', () => {
        this.toggleLevelPhase();
      });
    }

    for (const p of this.levelData.platforms) {
      const width = p.width ?? 200;
      const height = p.height ?? 20;

      const isWall = p.kind === 'wall';
      let fillColor = antiHueColor;
      if (isWall) {
        fillColor = 0x00e5ff;
      } else if (p.phase === 'cyan') {
        fillColor = 0x00e5ff;
      } else if (p.phase === 'magenta') {
        fillColor = 0xff00e5;
      }

      const rect = this.add.rectangle(p.x + width / 2, p.y + height / 2, width, height, fillColor);

      if (isWall) {
        rect.setStrokeStyle(2, 0xffffff);
        rect.setData('kind', 'wall');
      }

      if (p.phase) {
        rect.setData('phase', p.phase);
        this.phasePlatforms.push({ rect, phase: p.phase });
      }

      if (p.decayMs && p.decayMs > 0) {
        const decayState: DecayPlatformState = {
          timerMs: 0,
          decayMs: p.decayMs,
          triggered: false,
          collapsed: false,
          respawnTimerMs: 0
        };
        rect.setData('decayState', decayState);
        this.decayPlatforms.push({
          rect,
          state: decayState,
          startX: p.x + width / 2,
          startY: p.y + height / 2
        });
      }

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

    if (this.hasPhasePlatforms) {
      this.applyPhase(this.currentPhase);
    }

    // 4. Spikes & Gravitational Collapse
    this.spikes = this.physics.add.staticGroup();
    const spikeGfx = this.add.graphics();
    spikeGfx.setDepth(12);

    for (const s of this.levelData.spikes) {
      const width = s.width ?? 200;
      const height = s.height ?? 20;
      const spikeRect = this.add.rectangle(
        s.x + width / 2,
        s.y + height / 2,
        width,
        height,
        0xff2244,
        0.15
      );
      this.physics.add.existing(spikeRect, true);
      this.spikes.add(spikeRect);

      // Draw crisp, unmistakable neon red/amber sawtooth spikes
      const toothWidth = width <= 40 ? Math.max(10, Math.round(width / 2)) : 16;
      const count = Math.max(1, Math.floor(width / toothWidth));
      const actualToothW = width / count;
      spikeGfx.fillStyle(0xff2a55, 0.95);
      spikeGfx.lineStyle(1.5, 0xffaa00, 0.95);
      for (let i = 0; i < count; i++) {
        const x0 = s.x + i * actualToothW;
        const xMid = x0 + actualToothW / 2;
        const x1 = x0 + actualToothW;
        const yBase = s.y + height;
        const yTip = s.y;
        spikeGfx.fillTriangle(x0, yBase, xMid, yTip, x1, yBase);
        spikeGfx.strokeTriangle(x0, yBase, xMid, yTip, x1, yBase);
      }
    }

    if (this.levelData.collapse) {
      this.collapseConfig = this.levelData.collapse;
      this.collapseTopSpikes = this.add.rectangle(
        this.levelData.width / 2,
        140,
        this.levelData.width + 40,
        280,
        0xef4444,
        0.55
      );
      this.collapseTopSpikes.setStrokeStyle(3, 0xffaa00);
      this.collapseTopSpikes.setDepth(15);
      this.physics.add.existing(this.collapseTopSpikes, true);
      this.spikes.add(this.collapseTopSpikes);

      this.collapseBottomSpikes = this.add.rectangle(
        this.levelData.width / 2,
        this.levelData.height - 60,
        this.levelData.width + 40,
        160,
        0xef4444,
        0.55
      );
      this.collapseBottomSpikes.setStrokeStyle(3, 0xffaa00);
      this.collapseBottomSpikes.setDepth(15);
      this.physics.add.existing(this.collapseBottomSpikes, true);
      this.spikes.add(this.collapseBottomSpikes);
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
      antiGravity: 'cyan',
      tunnel: 'yellow',
      pauli: 'red',
      timeDilation: 'cyan'
    };

    for (const part of this.levelData.particles) {
      const textureKey = assetMap[part.type] || 'blue';
      const sprite = this.physics.add.sprite(part.x, part.y, textureKey);
      sprite.setScale(0.2, 0.2);
      sprite.setData('type', part.type);
      if (part.type === 'pauli') {
        sprite.setTint(0xff6600);
      } else if (part.type === 'timeDilation') {
        sprite.setTint(0x9933ff);
      }
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

    // 6b. Gates (Solid Barriers)
    this.gatesGroup = this.physics.add.staticGroup();
    this.gatesMap.clear();
    if (this.levelData.gates && this.levelData.gates.length > 0) {
      for (const g of this.levelData.gates) {
        const gateRect = this.add.rectangle(
          g.x + g.width / 2,
          g.y + g.height / 2,
          g.width,
          g.height,
          0xef4444
        );
        gateRect.setStrokeStyle(2, 0xff7777);
        this.physics.add.existing(gateRect, true);
        this.gatesGroup.add(gateRect);
        this.gatesMap.set(g.id, { rect: gateRect, data: g });
      }
    }

    // 6c. Pressure Plates
    this.pressurePlatesList = [];
    if (this.levelData.pressurePlates && this.levelData.pressurePlates.length > 0) {
      for (const pl of this.levelData.pressurePlates) {
        const baseRect = this.add.rectangle(
          pl.x + pl.width / 2,
          pl.y + pl.height - 2,
          pl.width + 4,
          4,
          0x334155
        );
        const padRect = this.add.rectangle(
          pl.x + pl.width / 2,
          pl.y + pl.height / 2,
          pl.width,
          pl.height,
          0x10b981
        );
        padRect.setStrokeStyle(1, 0x34d399);
        this.pressurePlatesList.push({
          baseRect,
          padRect,
          data: pl,
          isPressed: false,
          startY: padRect.y
        });
      }
    }

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
      this.heroes.push(this.betaHero);
      this.heroGroup.add(this.betaHero);
      if (entanglement.mode === 'inverted_gravity' || entanglement.mode === 'mirror_and_gravity') {
        const bBody = this.betaHero.body as Phaser.Physics.Arcade.Body;
        bBody.setGravityY(-2 * PHYSICS.GRAVITY_Y);
      }

      // Create Beta Portal if dual portal mode or betaDoor specified
      if (entanglement.portalMode === 'dual' || entanglement.betaDoor) {
        const betaDoorPos = entanglement.betaDoor || this.levelData.door;
        const isBetaInverted =
          entanglement.mode === 'inverted_gravity' || entanglement.mode === 'mirror_and_gravity';
        const betaPortalX = betaDoorPos.x - 48;
        const betaPortalY = isBetaInverted ? betaDoorPos.y + 32 : betaDoorPos.y - 96;
        this.betaPortalSprite = this.physics.add.sprite(betaPortalX, betaPortalY, 'portal');
        this.betaPortalSprite.setScale(0.15, 0.2);
        if (isBetaInverted) {
          this.betaPortalSprite.setFlipY(true);
        }
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

      // Initial camera positioning for centroid & zoom so both Alpha & Beta are visible immediately
      const cx = (initialHero.x + this.betaHero.x) / 2;
      const cy = (initialHero.y + this.betaHero.y) / 2;
      const dx = Math.abs(initialHero.x - this.betaHero.x);
      const dy = Math.abs(initialHero.y - this.betaHero.y);
      const initZoomX = this.cameras.main.width / (dx + 240);
      const initZoomY = this.cameras.main.height / (dy + 200);
      const initZoom = Phaser.Math.Clamp(Math.min(initZoomX, initZoomY), 0.28, 1.0);
      this.cameras.main.setZoom(initZoom);
      this.cameras.main.centerOn(cx, cy);
    } else {
      this.cameras.main.centerOn(initialHero.x, initialHero.y);
      this.cameras.main.startFollow(initialHero, true, 0.1, 0.1);
    }

    // Collisions and Overlaps
    this.physics.add.collider(this.heroGroup, this.gatesGroup);
    this.physics.add.collider(this.heroGroup, this.platforms, (heroObj, platObj) => {
      const hero = heroObj as Hero;
      const plat = platObj as Phaser.GameObjects.Rectangle;

      // 1. Neon Wall Rebound (kind === 'wall')
      if (plat.getData('kind') === 'wall') {
        if (hero.x < plat.x) {
          hero.bounceOffRightWall(true);
        } else {
          hero.bounceOffLeftWall(true);
        }
        soundManager.playBounceSound();
        gameEvents.emit('hero:wall_bounce', { x: hero.x, y: hero.y });
      }

      // 2. Radioactive Half-Life Platform Decay Trigger
      const decayState = plat.getData('decayState') as DecayPlatformState | undefined;
      if (decayState && !decayState.triggered) {
        const touchingTop =
          hero.upsideDown === 1
            ? hero.body?.touching.down || hero.body?.blocked.down
            : hero.body?.touching.up || hero.body?.blocked.up;
        if (touchingTop) {
          decayState.triggered = true;
        }
      }
    });

    this.physics.add.collider(this.heroGroup, this.movingPlatformsGroup, (heroObj, platObj) => {
      const hero = heroObj as Hero;
      const plat = platObj as Phaser.GameObjects.Rectangle;
      const decayState = plat.getData('decayState') as DecayPlatformState | undefined;
      if (decayState && !decayState.triggered) {
        const touchingTop =
          hero.upsideDown === 1
            ? hero.body?.touching.down || hero.body?.blocked.down
            : hero.body?.touching.up || hero.body?.blocked.up;
        if (touchingTop) {
          decayState.triggered = true;
        }
      }
    });
    this.physics.add.collider(this.heroGroup, this.sceneBounds, (heroObj, boundObj) => {
      const hero = heroObj as Hero;
      const bound = boundObj as Phaser.GameObjects.Rectangle;
      const type = bound.getData('boundary');
      if (type === 'left') {
        hero.bounceOffLeftWall();
      } else if (type === 'right') {
        hero.bounceOffRightWall();
      } else if (type === 'ceiling') {
        if (hero.upsideDown === -1) {
          if (hero.isFocused || this.heroes.length <= 1) {
            this.scene.restart();
          } else {
            this.killHero(hero);
          }
        } else {
          hero.bounceOffCeiling();
        }
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
        const betaPortal = this.betaPortalSprite;
        this.physics.add.overlap(this.heroGroup, betaPortal, (_portal, heroObj) => {
          this.handleEntangledPortalArrival(heroObj as Hero, betaPortal, true);
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

    const isShared = Boolean(store.sharedLevel);
    const sharedScore = store.scores[0];
    const isReplay = Boolean(
      (scoreItem?.best && scoreItem.best > 0 && store.maxLevel > currentLvlNum) ||
        (isShared &&
          (store.sharedLevel?.authorGhost || (sharedScore?.best && sharedScore.best > 0)))
    );

    this.authorTrajectory = store.sharedLevel?.authorGhost ?? this.levelData.authorGhost;
    this.personalTrajectory = isShared
      ? store.sharedLevel?.authorGhost
        ? undefined
        : sharedScore?.ghostTrajectory
      : scoreItem?.ghostTrajectory;

    this.hasAnyGhost = isReplay && Boolean(this.authorTrajectory || this.personalTrajectory);

    this.applyGhostMode();

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
      if (this.pauliGraphics) {
        this.pauliGraphics.destroy();
        this.pauliGraphics = null;
      }
      if (this.unsubJump) {
        this.unsubJump();
        this.unsubJump = null;
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
      if (this.pauliGraphics) {
        this.pauliGraphics.destroy();
        this.pauliGraphics = null;
      }
      if (this.unsubJump) {
        this.unsubJump();
        this.unsubJump = null;
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
      const inverted = this.physics.world.gravity.y < 0;
      this.touchInput.jump = inverted ? deltaY > 20 : deltaY < -20;
    });

    this.input.on('pointerup', () => {
      this.isPointerDown = false;
      this.touchInput.left = false;
      this.touchInput.right = false;
      this.touchInput.jump = false;
    });
  }

  public applyGhostMode(): void {
    const store = useGameStore.getState();
    const mode = store.ghostMode ?? (store.ghostEnabled ? 'optimal' : 'off');

    let trajectoryToLoad: string | undefined;
    if (mode === 'optimal') {
      trajectoryToLoad = this.authorTrajectory ?? this.personalTrajectory;
    } else if (mode === 'best') {
      trajectoryToLoad = this.personalTrajectory ?? this.authorTrajectory;
    }

    if (this.ghostHero) {
      this.ghostHero.destroy();
      this.ghostHero = null;
    }

    if (this.hasAnyGhost && mode !== 'off' && trajectoryToLoad) {
      this.ghostFrames = decompressTrajectory(trajectoryToLoad);
      if (this.ghostFrames.length > 0) {
        this.ghostHero = new GhostHero(this, this.ghostFrames);
        this.ghostHero.setVisible(true);
      }
    } else {
      this.ghostFrames = [];
    }

    if (this.ghostButton?.active) {
      const label =
        mode === 'off' ? '[GHOST: OFF]' : mode === 'optimal' ? '[GHOST: OPTIMAL]' : '[GHOST: BEST]';
      this.ghostButton.setText(label);
      this.ghostButton.setAlpha(mode !== 'off' ? 1 : 0.45);
      this.ghostButton.setVisible(this.hasAnyGhost);
    }

    if (this.splitDeltaText?.active) {
      this.splitDeltaText.setVisible(mode !== 'off' && this.ghostFrames.length > 0);
    }
  }

  private createHUD(): void {
    const camW = this.cameras.main.width;
    const hudHeight = 54;

    this.hudContainer = this.add.container(0, 0);
    this.hudContainer.setScrollFactor(0);
    this.hudContainer.setDepth(100);

    const hudBar = this.add.graphics();
    hudBar.fillStyle(0x0b0f19, 0.85);
    hudBar.fillRect(36, 0, camW - 36, hudHeight);
    hudBar.fillStyle(0xe74c3c, 0.85);
    hudBar.fillRect(0, 0, 36, hudHeight);
    hudBar.lineStyle(1, 0x334155, 0.9);
    hudBar.lineBetween(0, hudHeight, camW, hudHeight);
    this.hudContainer.add(hudBar);

    const backButton = this.add.text(18, hudHeight / 2, '◄', {
      fontFamily: 'VT323',
      fontSize: '26px',
      color: '#ffffff'
    });
    backButton.setOrigin(0.5);
    backButton.setScrollFactor(0);
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
    this.hudContainer.add(backButton);

    // Restart level button
    const restartButton = this.add.text(44, 5, '[RST]', {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#fbbf24'
    });
    restartButton.setScrollFactor(0);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.on('pointerdown', () => {
      this.scene.restart();
    });
    this.hudContainer.add(restartButton);

    // Sound toggle button
    const getSoundLabel = () => (useGameStore.getState().isMuted ? 'SND:OFF' : 'SND:ON');
    const soundButton = this.add.text(92, 5, getSoundLabel(), {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#00ffcc'
    });
    soundButton.setScrollFactor(0);
    soundButton.setInteractive({ useHandCursor: true });
    soundButton.on('pointerdown', () => {
      useGameStore.getState().toggleMute();
      soundButton.setText(getSoundLabel());
    });
    this.hudContainer.add(soundButton);

    // Haptic feedback toggle button
    const getHapticLabel = () => (useGameStore.getState().hapticsEnabled ? 'HAP:ON' : 'HAP:OFF');
    const hapticButton = this.add.text(154, 5, getHapticLabel(), {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#00ffcc'
    });
    hapticButton.setScrollFactor(0);
    hapticButton.setInteractive({ useHandCursor: true });
    hapticButton.on('pointerdown', () => {
      useGameStore.getState().toggleHaptics();
      hapticButton.setText(getHapticLabel());
    });
    this.hudContainer.add(hapticButton);

    // Visual effects toggle button (FX:HI / FX:LO)
    const getFxLabel = () => (useGameStore.getState().reducedEffects ? 'FX:LO' : 'FX:HI');
    const fxButton = this.add.text(216, 5, getFxLabel(), {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#00ffcc'
    });
    fxButton.setScrollFactor(0);
    fxButton.setInteractive({ useHandCursor: true });
    fxButton.on('pointerdown', () => {
      useGameStore.getState().toggleReducedEffects();
      fxButton.setText(getFxLabel());
    });
    this.hudContainer.add(fxButton);

    // Row 2: Ghost replay toggle button [GHOST: OFF] / [GHOST: OPTIMAL] / [GHOST: BEST]
    const currentMode =
      useGameStore.getState().ghostMode ??
      (useGameStore.getState().ghostEnabled ? 'optimal' : 'off');
    const ghostLabel =
      currentMode === 'off'
        ? '[GHOST: OFF]'
        : currentMode === 'optimal'
          ? '[GHOST: OPTIMAL]'
          : '[GHOST: BEST]';
    this.ghostButton = this.add.text(44, 29, ghostLabel, {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#38bdf8'
    });
    this.ghostButton.setScrollFactor(0);
    this.ghostButton.setAlpha(currentMode !== 'off' ? 1 : 0.45);
    this.ghostButton.setVisible(this.hasAnyGhost);
    this.ghostButton.setInteractive({ useHandCursor: true });
    this.ghostButton.on('pointerdown', () => {
      const hasBest = Boolean(this.personalTrajectory);
      useGameStore.getState().toggleGhost(hasBest);
      this.applyGhostMode();
    });
    this.hudContainer.add(this.ghostButton);

    // Row 2: Subtle environmental phase indicator (only if level has phase platforms)
    if (this.hasPhasePlatforms) {
      const phaseX = this.hasAnyGhost ? 186 : 44;
      this.phaseIndicatorText = this.add.text(
        phaseX,
        29,
        `[PHASE: ${this.currentPhase.toUpperCase()}]`,
        {
          fontFamily: 'VT323',
          fontSize: '18px',
          color: this.currentPhase === 'cyan' ? '#00ffff' : '#ec4899'
        }
      );
      this.hudContainer.add(this.phaseIndicatorText);
    }

    // Row 2: Time dilation indicator (shown when active)
    const dilationX = this.hasAnyGhost ? 186 : 44;
    this.dilationIndicatorText = this.add.text(dilationX, 29, '[TIME: 0.25x]', {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#22d3ee'
    });
    this.dilationIndicatorText.setVisible(false);
    this.hudContainer.add(this.dilationIndicatorText);

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
        this.applyGhostMode();
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubStore();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      unsubStore();
    });

    // Right column: Timer (Row 1) & Split Delta (Row 2)
    this.timerText = this.add.text(camW - 10, 3, '00:00:00', {
      fontFamily: 'VT323',
      fontSize: '22px',
      color: '#ffffff'
    });
    this.timerText.setOrigin(1, 0);
    this.hudContainer.add(this.timerText);

    this.splitDeltaText = this.add.text(camW - 10, 28, '--', {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#94a3b8'
    });
    this.splitDeltaText.setOrigin(1, 0);
    this.splitDeltaText.setVisible(currentMode !== 'off' && this.ghostFrames.length > 0);
    this.hudContainer.add(this.splitDeltaText);

    this.syncHudTransform();
  }

  private syncHudTransform(): void {
    if (!this.hudContainer || !this.cameras?.main) return;
    const z = this.cameras.main.zoom;
    if (z <= 0) return;
    const inv = 1 / z;
    this.hudContainer.setScale(inv);
    this.hudContainer.setPosition(
      (this.cameras.main.width / 2) * (1 - inv),
      (this.cameras.main.height / 2) * (1 - inv)
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
      duplicate: 'CLONING !',
      tunnel: 'TUNNELING CHARGE !',
      pauli: 'PAULI BLAST !',
      timeDilation: 'TIME DILATION !'
    };

    switch (type) {
      case 'duplicate': {
        const uncertainty = this.levelData.uncertainty ?? 3;
        if (this.heroes.length < uncertainty) {
          const spawnX = Phaser.Math.Clamp(hero.x - 45, 32, this.levelData.width - 32);
          const clonedHero = new Hero(this, spawnX, hero.y - 10, false);
          clonedHero.velocityMultiplier = hero.velocityMultiplier;
          clonedHero.setGravityInverted(this.physics.world.gravity.y < 0);
          clonedHero.pauliGraceUntil = this.time.now + 500;
          clonedHero.setTint(0x38bdf8);
          this.heroes.push(clonedHero);
          this.heroGroup.add(clonedHero);
          gameEvents.emit('hero:duplicate', { count: this.heroes.length });
        }
        break;
      }
      case 'speed': {
        hero.velocityMultiplier = PHYSICS.HERO_SPEED_BOOST;
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
      case 'tunnel': {
        hero.tunnelCharges = 1;
        break;
      }
      case 'pauli': {
        this.isPauliActive = true;
        for (const h of this.heroes) {
          h.pauliGraceUntil = this.time.now + 500;
        }
        break;
      }
      case 'timeDilation': {
        this.isTimeDilationActive = true;
        this.timeDilationUntil = this.time.now + 4000;
        soundManager.playTimeDilationSound();
        gameEvents.emit('time:dilation', { active: true, durationMs: 4000 });
        break;
      }
    }

    this.showRetroToast(powerUpNames[type] || '');
  }

  public showRetroToast(message: string): void {
    if (!message) return;
    const toast = this.add.text(this.cameras.main.width, 100, message, {
      fontFamily: 'VT323',
      fontSize: '150px',
      color: '#ffffff'
    });
    toast.setAlpha(0.6);
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

  public toggleLevelPhase(): void {
    if (!this.hasPhasePlatforms) return;
    this.currentPhase = togglePhase(this.currentPhase);
    this.applyPhase(this.currentPhase);
    soundManager.playPhaseShiftSound();
    gameEvents.emit('phase:shift', { phase: this.currentPhase });
    if (this.phaseIndicatorText?.active) {
      this.phaseIndicatorText.setText(`[PHASE: ${this.currentPhase.toUpperCase()}]`);
      this.phaseIndicatorText.setColor(this.currentPhase === 'cyan' ? '#00ffff' : '#ec4899');
    }
  }

  public applyPhase(phase: PlatformPhase): void {
    for (const { rect, phase: pPhase } of this.phasePlatforms) {
      const isActive = pPhase === phase;
      rect.setAlpha(isActive ? 1.0 : 0.25);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.checkCollision.none = !isActive;
      }
    }
  }

  private drawPauliFlash(x1: number, y1: number, x2: number, y2: number): void {
    if (!this.pauliGraphics) {
      this.pauliGraphics = this.add.graphics();
      this.pauliGraphics.setDepth(25);
    }
    const g = this.pauliGraphics;
    g.clear();
    g.lineStyle(3, 0xffeb3b, 1.0);
    const midX = (x1 + x2) / 2 + (Math.random() * 20 - 10);
    const midY = (y1 + y2) / 2 + (Math.random() * 20 - 10);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(midX, midY);
    g.lineTo(x2, y2);
    g.strokePath();

    this.time.delayedCall(150, () => {
      g.clear();
    });
  }

  private completeLevel(): void {
    if (this.isLevelCompleted) return;
    this.isLevelCompleted = true;
    soundManager.stopBgm();
    gameEvents.emit('level:complete', { level: Number(this.levelData.id) || 0 });

    const elapsedMs =
      this.dilatedElapsedMs > 0
        ? this.dilatedElapsedMs
        : Math.max(0, this.time.now - this.startTime);
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
      this.dilatedElapsedMs = 0;
      this.timerStarted = true;
      if (this.ghostHero) {
        this.ghostHero.updateReplay(0);
      }
    }

    // Time Dilation active check
    if (this.isTimeDilationActive && time >= this.timeDilationUntil) {
      this.isTimeDilationActive = false;
      gameEvents.emit('time:dilation', { active: false, durationMs: 0 });
    }
    const timeDilationFactor = this.isTimeDilationActive ? 0.25 : 1.0;

    this.dilatedElapsedMs += delta * timeDilationFactor;
    const elapsedMs = Math.max(0, time - this.startTime);

    // Update timer (slowed during time dilation)
    if (this.timerText) {
      this.timerText.setText(formatScore(this.dilatedElapsedMs));
      this.timerText.setColor(this.isTimeDilationActive ? '#22d3ee' : '#ffffff');
    }
    if (this.dilationIndicatorText?.active) {
      this.dilationIndicatorText.setVisible(this.isTimeDilationActive);
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
        const targetZoom = Phaser.Math.Clamp(Math.min(requiredZoomX, requiredZoomY), 0.28, 1.0);

        const currentZoom = this.cameras.main.zoom;
        const newZoom = Phaser.Math.Linear(currentZoom, targetZoom, 0.08);
        this.cameras.main.setZoom(newZoom);
        this.syncHudTransform();

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

    const currentGhostMode =
      useGameStore.getState().ghostMode ??
      (useGameStore.getState().ghostEnabled ? 'optimal' : 'off');
    const isGhostActive = currentGhostMode !== 'off';

    // Update ghost replay
    if (this.ghostHero && isGhostActive) {
      this.ghostHero.updateReplay(elapsedMs);
    }

    // Record main player frame and update live speedrun split delta
    const focusedHero = this.heroes.find((h) => h.isFocused) || this.heroes[0];
    if (focusedHero?.active && !this.isLevelCompleted) {
      this.ghostRecorder.recordFrame(
        elapsedMs,
        focusedHero.x,
        focusedHero.y,
        focusedHero.flipX,
        focusedHero.getAnimState(),
        focusedHero.flipY
      );

      if (this.splitDeltaText && this.ghostFrames.length > 0 && isGhostActive) {
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

    // Update quantum visual effects (de Broglie waves, spacetime vortex & time dilation cyan trail)
    if (this.quantumEffects) {
      this.quantumEffects.update(
        time,
        delta,
        this.heroes,
        this.portalSprite,
        this.isTimeDilationActive
      );
    }

    // Update heroes
    for (const hero of [...this.heroes]) {
      if (hero.active) {
        hero.updateControl(this.cursors, this.wasd, this.touchInput, delta);
        // Restart if hero falls out through the bottom (or top when gravity is inverted)
        if (hero.y > this.levelData.height + 20 || (hero.upsideDown === -1 && hero.y < -10)) {
          if (hero.isFocused || this.heroes.length <= 1) {
            this.scene.restart();
            return;
          }
          this.killHero(hero);
        }
      }
    }

    // Pressure Plates & Gates interaction
    if (this.pressurePlatesList.length > 0) {
      for (const item of this.pressurePlatesList) {
        const pl = item.data;
        const pad = item.padRect;

        // Check if any active hero is overlapping the plate
        let hasHeroOnPlate = false;
        let triggeringHero: Hero | null = null;

        for (const h of this.heroes) {
          if (!h.active || !h.body) continue;
          const hLeft = h.x - 16;
          const hRight = h.x + 16;
          const hBottom = h.y + 20;
          const hTop = h.y - 20;

          const pLeft = pl.x;
          const pRight = pl.x + pl.width;
          const pTop = pl.y - 6;
          const pBottom = pl.y + pl.height + 6;

          if (hRight > pLeft && hLeft < pRight && hBottom >= pTop && hTop <= pBottom) {
            hasHeroOnPlate = true;
            triggeringHero = h;
            break;
          }
        }

        const gateEntry = this.gatesMap.get(pl.targetGateId);

        if (hasHeroOnPlate) {
          if (!item.isPressed) {
            item.isPressed = true;
            pad.setY(item.startY + 3);
            pad.setFillStyle(0x059669);
            soundManager.playMechanicalClick();
            gameEvents.emit('plate:trigger', { plateId: pl.id, gateId: pl.targetGateId });

            // If hero stepping on plate is focused and there are multiple heroes, switch focus to another hero
            if (triggeringHero?.isFocused && this.heroes.length > 1) {
              const otherHero = this.heroes.find((hero) => hero !== triggeringHero && hero.active);
              if (otherHero) {
                triggeringHero.setFocus(false);
                otherHero.setFocus(true);
                this.cameras.main.startFollow(otherHero, true, 0.1, 0.1);
              }
            }
          }

          // Open target gate
          if (gateEntry) {
            gateEntry.rect.setAlpha(0);
            const body = gateEntry.rect.body as Phaser.Physics.Arcade.StaticBody | null;
            if (body) body.enable = false;
          }
        } else {
          // No hero on plate
          if (pl.requireLock) {
            if (item.isPressed) {
              item.isPressed = false;
              pad.setY(item.startY);
              pad.setFillStyle(0x10b981);
            }
            if (gateEntry) {
              gateEntry.rect.setAlpha(1);
              const body = gateEntry.rect.body as Phaser.Physics.Arcade.StaticBody | null;
              if (body) body.enable = true;
            }
          }
        }
      }
    }

    // Quantum Tunneling check
    for (const hero of this.heroes) {
      if (hero.active && hero.tunnelCharges > 0 && hero.body) {
        const rawLeft =
          (this.cursors?.left?.isDown ?? false) ||
          (this.wasd?.A?.isDown ?? false) ||
          this.touchInput.left;
        const rawRight =
          (this.cursors?.right?.isDown ?? false) ||
          (this.wasd?.D?.isDown ?? false) ||
          this.touchInput.right;
        const dir = rawLeft ? 'left' : rawRight ? 'right' : null;
        if (dir) {
          for (const p of this.levelData.platforms) {
            const result = checkTunnelObstacle(hero.x, hero.y, 40, 40, dir, p);
            if (result?.canTunnel) {
              hero.x = result.exitX;
              hero.body.x = hero.x - hero.body.width / 2;
              hero.tunnelCharges--;
              soundManager.playTunnelSound();
              gameEvents.emit('tunnel:use', { remaining: hero.tunnelCharges });
              this.showRetroToast(`TUNNELING ! (${hero.tunnelCharges} LEFT)`);
              break;
            }
          }
        }
      }
    }

    // Pauli Exclusion Principle repulsion
    if (this.isPauliActive && this.heroes.length >= 2) {
      const activeHeroes = this.heroes.filter((h) => h.active && h.body);
      const repulsionEvents = checkPauliRepulsion(activeHeroes, time);
      for (const ev of repulsionEvents) {
        const hA = activeHeroes.find((h) => h.id === ev.heroAId);
        const hB = activeHeroes.find((h) => h.id === ev.heroBId);
        if (hA && hB && hA.body && hB.body) {
          hA.setVelocityX(ev.impulseA.vx);
          hA.setVelocityY(ev.impulseA.vy);
          hB.setVelocityX(ev.impulseB.vx);
          hB.setVelocityY(ev.impulseB.vy);
          hA.pauliGraceUntil = ev.newGraceUntil;
          hB.pauliGraceUntil = ev.newGraceUntil;
          soundManager.playPauliBlastSound();
          gameEvents.emit('pauli:blast', { hero1Id: hA.id, hero2Id: hB.id });
          this.showRetroToast('PAULI BLAST !');
          this.drawPauliFlash(hA.x, hA.y, hB.x, hB.y);
        }
      }
    }

    // Radioactive Decay Platforms update
    for (const dp of this.decayPlatforms) {
      const prevCollapsed = dp.state.collapsed;
      const decayUpdate = updateDecayPlatform(dp.state, delta, timeDilationFactor);
      dp.rect.alpha = decayUpdate.alpha;
      const body = dp.rect.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.checkCollision.none = !decayUpdate.solid;
      }
      if (decayUpdate.shaking) {
        dp.rect.x = dp.startX + (Math.random() * 4 - 2);
      } else {
        dp.rect.x = dp.startX;
      }
      if (!prevCollapsed && decayUpdate.collapsed) {
        soundManager.playDecaySound();
        gameEvents.emit('platform:decay', { x: dp.rect.x, y: dp.rect.y });
      }
    }

    // Gravitational Collapse update (narrowing spikes)
    if (this.collapseConfig && this.collapseTopSpikes && this.collapseBottomSpikes) {
      const { active, stepY } = calculateCollapse(
        this.collapseConfig,
        elapsedMs,
        delta,
        timeDilationFactor
      );
      if (active && stepY > 0) {
        this.collapseTopSpikes.y += stepY;
        this.collapseBottomSpikes.y -= stepY;
        const topBody = this.collapseTopSpikes.body as Phaser.Physics.Arcade.StaticBody | null;
        const botBody = this.collapseBottomSpikes.body as Phaser.Physics.Arcade.StaticBody | null;
        if (topBody) topBody.updateFromGameObject();
        if (botBody) botBody.updateFromGameObject();
      }
    }

    // Update moving platforms (slowed by time dilation)
    for (const mp of this.movingPlatforms) {
      const body = mp.rect.body as Phaser.Physics.Arcade.Body;
      const targetX = mp.movesTo.x !== undefined ? mp.movesTo.x + mp.width / 2 : mp.startX;
      const targetY = mp.movesTo.y !== undefined ? mp.movesTo.y + mp.height / 2 : mp.startY;
      const minX = Math.min(mp.startX, targetX);
      const maxX = Math.max(mp.startX, targetX);
      const minY = Math.min(mp.startY, targetY);
      const maxY = Math.max(mp.startY, targetY);

      if (mp.direction.x === 'right') {
        body.setVelocityX(100 * timeDilationFactor);
        if (mp.rect.x >= maxX) {
          mp.direction.x = 'left';
        }
      } else if (mp.direction.x === 'left') {
        body.setVelocityX(-100 * timeDilationFactor);
        if (mp.rect.x <= minX) {
          mp.direction.x = 'right';
        }
      }

      if (mp.direction.y === 'bottom') {
        body.setVelocityY(20 * timeDilationFactor);
        if (mp.rect.y >= maxY) {
          mp.direction.y = 'top';
        }
      } else if (mp.direction.y === 'top') {
        body.setVelocityY(-20 * timeDilationFactor);
        if (mp.rect.y <= minY) {
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
