import Phaser from 'phaser';
import { soundManager } from '../audio/SoundManager';
import { getNarrativeForLevel } from '../data/cosmicNarrative';
import * as defaultLevels from '../data/levels';
import { getMoleculeById } from '../data/molecules';
import { getAtomicMass, getElementSpectroscopy } from '../data/spectroscopy';
import { BohrBackgroundRenderer } from '../effects/BohrBackgroundRenderer';
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
import { MobileTouchController } from '../input/MobileTouchController';
import { PHYSICS } from '../physics/constants';
import {
  applyToroidalScreenWrap,
  canFuseClones,
  computeFissionVelocities,
  findHookedTetherPylon,
  getScreenWrapAxes,
  getScreenWrapGhostPositions,
  isParticleSweptByTether,
  resolveTetherPylonConstraint,
  shouldBreakCrackedPlatform
} from '../physics/entanglementTether';
import {
  applyLowGravity,
  computeLookAheadOffset,
  isHeroOnPressurePlate
} from '../physics/stepHeroPhysics';
import {
  type PinnablePlatformRef,
  type QuantumPinningState,
  buildBroglieScaffoldSegments,
  canGhostSurf,
  computeWormholeExit,
  createQuantumPinningState,
  findNearestPinnablePlatform,
  findPinnablePlatformAtPoint,
  getGhostSurfVelocity,
  getLiquidEmergeVelocity,
  getPlasmaBounceVelocity,
  isHeroInWormholeInlet,
  isHeroOverlappingRect,
  normalizeMatterState,
  shouldPlungeIntoLiquid,
  stepGasUpdraft,
  stepLiquidBuoyancy,
  stepQuantumPinning
} from '../physics/matterStates';
import { push } from '../shims/navigation';
import { SessionSwarmBuffer, getSwarmSpectrumTint } from '../services/GhostManager';
import { calculateIsotopeMedal, getMedalDisplayInfo } from '../services/MedalService';
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
import { isGodMode } from '../tools/godMode';
import { decodeLevelFromUrl } from '../tools/levelCodec';
import type {
  CollapseConfig,
  GhostMode,
  IsotopeMedal,
  LevelData,
  MatterState,
  ParticleType,
  PlatformPhase,
  TetherPylon
} from '../types';
import { GhostHero } from './GhostHero';
import Hero from './Hero';

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
  autoSwitchOnTrigger?: boolean;
}

interface MovingPlatform {
  rect: Phaser.GameObjects.Rectangle;
  movesTo: { x?: number; y?: number };
  direction: { x: 'left' | 'right' | null; y: 'top' | 'bottom' | null };
  initialDirection: { x: 'left' | 'right' | null; y: 'top' | 'bottom' | null };
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
  private spikeGfx: Phaser.GameObjects.Graphics | null = null;
  private unsubJump: (() => void) | null = null;
  private unsubHudStore: (() => void) | null = null;

  private entanglementGraphics: Phaser.GameObjects.Graphics | null = null;
  private alphaEnteredPortal = false;
  private betaEnteredPortal = false;
  private ghostRecorder: GhostRecorder = new GhostRecorder();
  private ghostFrames: GhostFrame[] = [];
  public swarmBuffer: SessionSwarmBuffer = new SessionSwarmBuffer();
  public swarmGhosts: GhostHero[] = [];
  private swarmPlaybackActive = false;
  private swarmPlaybackElapsedMs = 0;
  private swarmPlaybackSpeed = 2;
  private swarmPlaybackMaxMs = 0;
  public jumpCount = 0;
  public switchCount = 0;
  private splitDeltaText: Phaser.GameObjects.Text | null = null;
  private ghostButton: Phaser.GameObjects.Text | null = null;
  private movingPlatforms: MovingPlatform[] = [];
  private molecules: MoleculeParticle[] = [];
  public bohrBackground: BohrBackgroundRenderer | null = null;
  public muralObjects: Phaser.GameObjects.GameObject[] = [];
  public discoveryBoxObjects: Phaser.GameObjects.GameObject[] = [];
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: { [key: string]: Phaser.Input.Keyboard.Key } | null = null;
  private touchController: MobileTouchController = new MobileTouchController();
  private uiPointerConsumed = false;
  private thumbRibbonGraphics: Phaser.GameObjects.Graphics | null = null;
  private diveTrailGraphics: Phaser.GameObjects.Graphics | null = null;
  private focusArcGraphics: Phaser.GameObjects.Graphics | null = null;
  private focusBulletTimeUntil = 0;
  private edgePips: Array<{
    bg: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    hitArea: Phaser.GameObjects.Zone;
  }> = [];
  private startTime = 0;
  private dilatedElapsedMs = 0;
  private timerStarted = false;
  private timerText!: Phaser.GameObjects.Text;
  private lastTimerString = '';
  private lastTimerColor = '';
  private lastSplitString = '';
  private lastSplitColor = '';
  private lastSplitUpdateMs = 0;
  private phaseIndicatorText: Phaser.GameObjects.Text | null = null;
  private dilationIndicatorText: Phaser.GameObjects.Text | null = null;
  private isLevelCompleted = false;
  private isRespawning = false;
  private isTransitioningLevel = false;
  private canAdvanceLevel = false;
  private nextLevelNumberPending: number | null = null;
  private lastShownLevelId: string | null = null;
  private deathEchoes: Phaser.GameObjects.Sprite[] = [];
  private levelCompleteOverlay: Phaser.GameObjects.Container | null = null;
  private quantumEffects: QuantumEffectsManager | null = null;
  private crackedPlatforms: Phaser.GameObjects.Rectangle[] = [];
  private hookedTetherPylon: TetherPylon | null = null;
  private tetherPylonGraphics: Phaser.GameObjects.Graphics | null = null;
  private screenWrapGraphics: Phaser.GameObjects.Graphics | null = null;
  private screenWrapGhosts: Phaser.GameObjects.Sprite[] = [];
  private fusionHaloGraphics: Phaser.GameObjects.Graphics | null = null;
  private liquidPlatforms: Array<{ rect: Phaser.GameObjects.Rectangle; startY: number }> = [];
  private gasPlatforms: Phaser.GameObjects.Rectangle[] = [];
  private pinnablePlatforms: Array<
    PinnablePlatformRef & {
      rect: Phaser.GameObjects.Rectangle;
      phase?: PlatformPhase;
      decayState?: DecayPlatformState;
    }
  > = [];
  private quantumPinningState: QuantumPinningState = createQuantumPinningState();
  private quantumPinGraphics: Phaser.GameObjects.Graphics | null = null;
  private wormholeGraphics: Phaser.GameObjects.Graphics | null = null;
  private broglieCrystals: Array<{ rect: Phaser.GameObjects.Rectangle; expiresAtMs: number }> = [];
  private hasCondenseAbility = false;
  private fKey: Phaser.Input.Keyboard.Key | null = null;
  private activePinPointerWorld: { x: number; y: number } | null = null;
  private alphaArrivalTimeMs: number | null = null;
  private betaArrivalTimeMs: number | null = null;
  private bubbleHarvestHits: Array<{ molIndex: number; x: number; y: number; timeMs: number }> = [];
  private antigravityBubbles: Array<{
    x: number;
    y: number;
    radius: number;
    expiresAtMs: number;
    graphic: Phaser.GameObjects.Arc;
  }> = [];
  public ephemeralPlatforms: Phaser.GameObjects.Rectangle[] = [];
  private entanglementRevealed = false;
  private constellationGraphics: Phaser.GameObjects.Graphics | null = null;
  private periodicTableGraphics: Phaser.GameObjects.Graphics | null = null;
  private previousCompletedLevelId: number | null = null;

  constructor() {
    super('Game');
  }

  init(): void {
    this.isLevelCompleted = false;
    this.isRespawning = false;
    this.isTransitioningLevel = false;
    this.canAdvanceLevel = false;
    this.nextLevelNumberPending = null;
    this.ephemeralPlatforms = [];
    this.entanglementRevealed = false;
    this.touchController.reset();
    this.uiPointerConsumed = false;
    this.ghostRecorder.reset();
    this.swarmBuffer.clear();
    this.swarmGhosts = [];
    this.swarmPlaybackActive = false;
    this.swarmPlaybackElapsedMs = 0;
    this.jumpCount = 0;
    this.switchCount = 0;
    this.startTime = 0;
    this.dilatedElapsedMs = 0;
    this.timerStarted = false;

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

    // Check if URL contains /game/molecule/:moleculeId
    if (!store.sharedLevel && typeof window !== 'undefined') {
      const molMatch = /\/game\/molecule\/([^/?#]+)/i.exec(window.location.pathname);
      if (molMatch) {
        const recipe = getMoleculeById(molMatch[1]);
        if (recipe) {
          store.setSharedLevel(recipe.levelData);
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
    const selected = this.resolveLevelData(currentLevel);
    this.levelData = selected || (defaultLevels as unknown as Record<string, LevelData>).level1;
    if (!selected) {
      store.updateCurrentLevel(1);
    }
  }

  public resolveLevelData(levelNumber: number): LevelData | undefined {
    const store = useGameStore.getState();
    const builtInLevels = defaultLevels as unknown as Record<string, LevelData>;
    const levelKey = `level${levelNumber}`;
    return store.customLevels?.[levelKey] || builtInLevels[levelKey];
  }

  create(): void {
    // One-time keyboard & pointer controls setup
    if (this.input?.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D
      }) as { [key: string]: Phaser.Input.Keyboard.Key };

      const tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
      tabKey.on('down', (_key: Phaser.Input.Keyboard.Key, event?: KeyboardEvent) => {
        event?.preventDefault?.();
        if (!this.tryInFlightFission()) {
          this.cycleFocusNext();
        }
      });

      const xKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
      xKey.on('down', () => {
        this.tryInFlightFission();
      });

      const eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      eKey.on('down', () => this.cycleFocusNext());

      const oneKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
      oneKey.on('down', () => this.switchFocusByIndex(0));

      const twoKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
      twoKey.on('down', () => this.switchFocusByIndex(1));

      const threeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
      threeKey.on('down', () => this.switchFocusByIndex(2));

      const rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      rKey.on('down', () => {
        if (!this.isLevelCompleted && !this.isTransitioningLevel) {
          this.quickRespawn();
        }
      });

      const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      spaceKey.on('down', () => {
        if (this.isLevelCompleted && this.canAdvanceLevel) {
          this.advanceToNextLevel();
        } else if (!this.isLevelCompleted && !this.isTransitioningLevel) {
          this.tryInFlightFission();
        }
      });

      const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      enterKey.on('down', () => {
        if (this.isLevelCompleted && this.canAdvanceLevel) {
          this.advanceToNextLevel();
        }
      });

      this.fKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
      const qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
      qKey.on('down', () => {
        if (!this.isLevelCompleted && !this.isTransitioningLevel) {
          this.togglePhasePlatforms();
        }
      });
      const cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
      cKey.on('down', () => {
        if (!this.isLevelCompleted && !this.isTransitioningLevel) {
          this.tryCrystallizeBroglieTrail();
        }
      });
    }

    this.setupPointerControls();

    this.events.on('hero-clicked', (clickedHero: Hero) => {
      this.uiPointerConsumed = true;
      this.switchFocusTo(clickedHero);
    });

    // Audio & Haptics (initialized once)
    soundManager.init();
    hapticFeedback.init();

    const cleanupScene = () => {
      soundManager.stopBgm();
      this.clearLevelObjects();
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanupScene);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanupScene);

    this.buildLevel();
  }

  private buildLevel(): void {
    this.heroes = [];
    this.gatesMap.clear();
    this.pressurePlatesList = [];
    this.movingPlatforms = [];
    this.molecules = [];
    this.phasePlatforms = [];
    this.decayPlatforms = [];
    this.crackedPlatforms = [];
    this.hookedTetherPylon = null;
    this.tetherPylonGraphics = null;
    this.screenWrapGraphics = null;
    this.screenWrapGhosts = [];
    this.fusionHaloGraphics = null;
    this.liquidPlatforms = [];
    this.gasPlatforms = [];
    this.pinnablePlatforms = [];
    this.quantumPinningState = createQuantumPinningState();
    this.quantumPinGraphics = null;
    this.wormholeGraphics = null;
    this.broglieCrystals = [];
    this.hasCondenseAbility = false;
    this.activePinPointerWorld = null;
    this.edgePips = [];
    this.isLevelCompleted = false;
    this.isRespawning = false;
    this.isTransitioningLevel = false;
    this.canAdvanceLevel = false;
    this.nextLevelNumberPending = null;
    this.quantumEffects = null;
    this.bohrBackground = null;
    this.muralObjects = [];
    this.discoveryBoxObjects = [];
    soundManager.setAtomicNumber(this.getCurrentAtomicNumber());
    this.touchController.reset();
    this.uiPointerConsumed = false;
    this.thumbRibbonGraphics = null;
    this.diveTrailGraphics = null;
    this.focusArcGraphics = null;
    this.focusBulletTimeUntil = 0;
    this.ghostHero = null;
    this.ghostRecorder.reset();
    this.ghostFrames = [];
    this.swarmGhosts = [];
    this.swarmPlaybackActive = false;
    this.swarmPlaybackElapsedMs = 0;
    this.jumpCount = 0;
    this.switchCount = 0;
    this.hasAnyGhost = false;
    this.authorTrajectory = undefined;
    this.personalTrajectory = undefined;
    this.startTime = 0;
    this.dilatedElapsedMs = 0;
    this.timerStarted = false;
    this.lastTimerString = '';
    this.lastTimerColor = '';
    this.lastSplitString = '';
    this.lastSplitColor = '';
    this.lastSplitUpdateMs = 0;
    this.splitDeltaText = null;
    this.ghostButton = null;
    this.hudContainer = null;
    this.levelCompleteOverlay = null;
    this.phaseIndicatorText = null;
    this.dilationIndicatorText = null;
    this.isEntangled = false;
    this.betaHero = null;
    this.betaPortalSprite = null;
    this.alphaEnteredPortal = false;
    this.betaEnteredPortal = false;
    this.alphaArrivalTimeMs = null;
    this.betaArrivalTimeMs = null;
    this.bubbleHarvestHits = [];
    this.antigravityBubbles = [];
    this.isPauliActive = false;
    this.isTimeDilationActive = false;
    this.timeDilationUntil = 0;
    this.currentPhase = 'cyan';
    this.hasPhasePlatforms = false;
    this.collapseTopSpikes = null;
    this.collapseBottomSpikes = null;
    this.collapseConfig = undefined;
    this.pauliGraphics = null;
    this.spikeGfx = null;
    if (this.unsubJump) {
      this.unsubJump();
      this.unsubJump = null;
    }

    // 1. Physics & Bounds
    this.physics.world.gravity.y = PHYSICS.GRAVITY_Y;
    this.physics.world.timeScale = 1.0;
    this.physics.world.setBounds(0, 0, this.levelData.width, this.levelData.height);
    this.physics.world.setBoundsCollision(false, false, false, false);
    this.cameras.main.setBounds(0, 0, this.levelData.width, this.levelData.height);
    this.cameras.main.setBackgroundColor(this.levelData.hue);
    this.cameras.main.setZoom(1);
    this.cameras.main.followOffset.set(0, 0);

    // Dedicated scene boundary walls (left, right, ceiling) for exclusive boundary bouncing
    this.sceneBounds = this.physics.add.staticGroup();
    const wrapAxes = getScreenWrapAxes(this.levelData.screenWrap);

    if (!wrapAxes.horizontal) {
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
    }

    if (!wrapAxes.vertical) {
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
    }

    if (wrapAxes.horizontal || wrapAxes.vertical) {
      this.screenWrapGraphics = this.add.graphics();
      this.screenWrapGraphics.setDepth(22);
    }

    // 2. Background ambient molecules
    this.createMolecules();

    // 3. Platforms
    this.platforms = this.physics.add.staticGroup();
    this.movingPlatformsGroup = this.physics.add.group({
      allowGravity: false,
      immovable: true,
      frictionX: 1
    });
    const antiHueColor = Phaser.Display.Color.HexStringToColor(this.levelData.antiHue).color;

    this.hasPhasePlatforms = this.levelData.platforms.some((p) => Boolean(p.phase));
    if (this.hasPhasePlatforms) {
      this.currentPhase = 'cyan';
    }
    this.unsubJump = gameEvents.on('hero:jump', () => {
      if (!this.isLevelCompleted && !this.isRespawning && !this.isTransitioningLevel) {
        this.jumpCount += 1;
      }
      if (this.hasPhasePlatforms) {
        this.toggleLevelPhase();
      }
    });

    for (let platIdx = 0; platIdx < this.levelData.platforms.length; platIdx++) {
      const p = this.levelData.platforms[platIdx];
      const width = p.width ?? 200;
      const height = p.height ?? 20;
      const matterState = normalizeMatterState(p.matterState);

      const isWall = p.kind === 'wall';
      const isEphemeral = Boolean(p.ephemeral || p.color?.toLowerCase() === '#f1c40f');
      let fillColor = antiHueColor;
      let fillAlpha = 1;
      if (isWall) {
        fillColor = 0x00e5ff;
      } else if (isEphemeral) {
        fillColor = 0xf1c40f;
      } else if (p.phase === 'cyan') {
        fillColor = 0x00e5ff;
      } else if (p.phase === 'magenta') {
        fillColor = 0xff00e5;
      } else if (matterState === 'liquid') {
        fillColor = 0x0ea5e9;
        fillAlpha = 0.68;
      } else if (matterState === 'gas') {
        fillColor = 0xa855f7;
        fillAlpha = 0.35;
      } else if (matterState === 'cryo') {
        fillColor = 0xbae6fd;
      } else if (matterState === 'plasma') {
        fillColor = 0xf43f5e;
      }

      const rect = this.add.rectangle(
        p.x + width / 2,
        p.y + height / 2,
        width,
        height,
        fillColor,
        fillAlpha
      );
      rect.setData('matterState', matterState);
      if (isEphemeral) {
        rect.setData('ephemeral', true);
        rect.setStrokeStyle(2, 0xfef08a, 0.95);
        this.ephemeralPlatforms.push(rect);
      }

      if (isWall) {
        rect.setStrokeStyle(2, 0xffffff);
        rect.setData('kind', 'wall');
      } else if (matterState === 'liquid') {
        rect.setStrokeStyle(2, 0x38bdf8, 0.9);
        this.liquidPlatforms.push({ rect, startY: p.y + height / 2 });
      } else if (matterState === 'gas') {
        rect.setStrokeStyle(1.5, 0xc084fc, 0.75);
        this.gasPlatforms.push(rect);
      } else if (matterState === 'cryo') {
        rect.setStrokeStyle(2, 0xe0f2fe, 0.95);
      } else if (matterState === 'plasma') {
        rect.setStrokeStyle(2, 0xfbbf24, 0.95);
      }

      if (p.phase) {
        rect.setData('phase', p.phase);
        this.phasePlatforms.push({ rect, phase: p.phase });
      }

      if (p.cracked) {
        rect.setData('cracked', true);
        rect.setStrokeStyle(2, 0xfbbf24, 0.85);
        this.crackedPlatforms.push(rect);
      }

      let decayStateRef: DecayPlatformState | undefined;
      if (p.decayMs && p.decayMs > 0) {
        const decayState: DecayPlatformState = {
          timerMs: 0,
          decayMs: p.decayMs,
          triggered: false,
          collapsed: false,
          respawnTimerMs: 0
        };
        decayStateRef = decayState;
        rect.setData('decayState', decayState);
        this.decayPlatforms.push({
          rect,
          state: decayState,
          startX: p.x + width / 2,
          startY: p.y + height / 2
        });
      }

      if (p.phase || (p.decayMs && p.decayMs > 0)) {
        const pinId = `plat_${platIdx}`;
        rect.setData('pinId', pinId);
        this.pinnablePlatforms.push({
          id: pinId,
          x: p.x + width / 2,
          y: p.y + height / 2,
          width,
          height,
          rect,
          phase: p.phase,
          decayState: decayStateRef
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
          initialDirection: { x: dirX, y: dirY },
          width,
          height,
          startX: p.x + width / 2,
          startY: p.y + height / 2
        });
      } else {
        rect.setData('baseY', rect.y);
        this.physics.add.existing(rect, true);
        if (matterState === 'gas') {
          const gasBody = rect.body as Phaser.Physics.Arcade.StaticBody | null;
          if (gasBody) {
            gasBody.checkCollision.none = true;
          }
        }
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
    this.spikeGfx = spikeGfx;

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
        PHYSICS.COLLAPSE_TOP_START_Y / 2,
        this.levelData.width + 40,
        PHYSICS.COLLAPSE_TOP_START_Y,
        0xef4444,
        0.55
      );
      this.collapseTopSpikes.setStrokeStyle(3, 0xffaa00);
      this.collapseTopSpikes.setDepth(15);
      this.physics.add.existing(this.collapseTopSpikes, true);
      this.spikes.add(this.collapseTopSpikes);

      this.collapseBottomSpikes = this.add.rectangle(
        this.levelData.width / 2,
        this.levelData.height - PHYSICS.COLLAPSE_BOTTOM_MARGIN_Y + 80,
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
      timeDilation: 'cyan',
      condense: 'cyan'
    };

    for (const part of this.levelData.particles) {
      const textureKey = assetMap[part.type] || 'blue';
      const sprite = this.physics.add.sprite(part.x, part.y, textureKey);
      sprite.setScale(0.2, 0.2);
      sprite.setData('type', part.type);
      sprite.setData('startX', part.x);
      sprite.setData('startY', part.y);
      if (part.restoresEphemeral) {
        sprite.setData('restoresEphemeral', true);
      }
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
    const entanglement = this.levelData.entanglement;
    this.isEntangled = Boolean(entanglement);

    if (entanglement) {
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
    }

    this.spawnHeroes();

    // Collisions and Overlaps
    this.physics.add.collider(this.heroGroup, this.gatesGroup);
    if (
      entanglement &&
      (entanglement.allowHeroCollision === true ||
        entanglement.mode === 'inverted_gravity' ||
        entanglement.mode === 'mirror_and_gravity')
    ) {
      this.physics.add.collider(this.heroGroup, this.heroGroup);
    }
    this.physics.add.collider(
      this.heroGroup,
      this.platforms,
      (heroObj, platObj) => {
        const hero = heroObj as Hero;
        const plat = platObj as Phaser.GameObjects.Rectangle;

        // 0. Ephemeral Cage Platform (vanishes on contact)
        if (plat.getData('ephemeral') === true) {
          this.vanishEphemeralPlatform(plat);
        }

        // 1. Neon Wall Rebound (kind === 'wall')
        if (plat.getData('kind') === 'wall') {
          if (hero.x < plat.x) {
            hero.bounceOffRightWall(true);
          } else {
            hero.bounceOffLeftWall(true);
          }
          gameEvents.emit('hero:wall_bounce', { x: hero.x, y: hero.y });
        }

        const touchingTop =
          hero.upsideDown === 1
            ? hero.body?.touching.down || hero.body?.blocked.down
            : hero.body?.touching.up || hero.body?.blocked.up;

        const matterState = plat.getData('matterState') as MatterState | undefined;

        if (touchingTop && matterState === 'plasma') {
          hero.setVelocityY(getPlasmaBounceVelocity(hero.upsideDown));
          hero.isDiving = false;
          gameEvents.emit('platform:plasma_bounce', { x: hero.x, y: hero.y });
        }

        if (touchingTop && matterState === 'cryo') {
          hero.onCryo = true;
        }

        if (touchingTop && (!hero.wasTouchingGround || hero.lastLandedPlatform !== plat)) {
          hero.lastLandedPlatform = plat;
          this.triggerSynthPlatformImpact(hero, plat, true);
        }

        // 2. Radioactive Half-Life Platform Decay Trigger
        const decayState = plat.getData('decayState') as DecayPlatformState | undefined;
        if (decayState && !decayState.triggered && touchingTop) {
          decayState.triggered = true;
        }

        // 3. Cracked Platform Shatter (Super-Quanta fusionStack >= 2)
        if (
          plat.getData('cracked') === true &&
          shouldBreakCrackedPlatform(hero.fusionStack, Boolean(touchingTop), hero.isDiving)
        ) {
          this.shatterCrackedPlatform(plat);
        }
      },
      (heroObj, platObj) => {
        const hero = heroObj as Hero;
        const plat = platObj as Phaser.GameObjects.Rectangle;
        const matterState = plat.getData('matterState') as MatterState | undefined;

        if (matterState === 'gas') {
          return false;
        }

        if (matterState === 'liquid') {
          const diveInput =
            (this.cursors?.down?.isDown ?? false) ||
            (this.wasd?.S?.isDown ?? false) ||
            Boolean(this.touchController.state.diveRequested);
          const vy = hero.body ? hero.body.velocity.y : 0;
          if (
            hero.inLiquid ||
            shouldPlungeIntoLiquid(vy, hero.upsideDown, hero.isDiving, diveInput)
          ) {
            if (!hero.inLiquid) {
              hero.inLiquid = true;
              gameEvents.emit('platform:liquid_plunge', { x: hero.x, y: hero.y });
            }
            return false;
          }
        }

        return true;
      }
    );

    this.physics.add.collider(this.heroGroup, this.movingPlatformsGroup, (heroObj, platObj) => {
      const hero = heroObj as Hero;
      const plat = platObj as Phaser.GameObjects.Rectangle;
      const touchingTop =
        hero.upsideDown === 1
          ? hero.body?.touching.down || hero.body?.blocked.down
          : hero.body?.touching.up || hero.body?.blocked.up;
      if (touchingTop && (!hero.wasTouchingGround || hero.lastLandedPlatform !== plat)) {
        hero.lastLandedPlatform = plat;
        this.triggerSynthPlatformImpact(hero, plat, false);
      }
      const decayState = plat.getData('decayState') as DecayPlatformState | undefined;
      if (decayState && !decayState.triggered && touchingTop) {
        decayState.triggered = true;
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
            gameEvents.emit('hero:death', { remaining: 0, entangledCollapse: this.isEntangled });
            this.quickRespawn({ x: hero.x, y: hero.y });
          } else {
            this.killHero(hero);
          }
        } else {
          hero.bounceOffCeiling();
        }
      }
    });
    this.physics.add.overlap(this.heroGroup, this.spikes, (_heroObj) => {
      if (isGodMode()) return;
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

    // 9. HUD and Timer
    this.createHUD();

    // 10. Level Title Overlay (only on first entry to this level)
    this.showLevelTitle();

    // 11. Audio clone modulation
    soundManager.setClonesCount(this.heroes.length);

    // 12. Quantum Visual Effects (de Broglie waves & spacetime vortex)
    this.quantumEffects = new QuantumEffectsManager(this);
    this.diveTrailGraphics = this.add.graphics();
    this.diveTrailGraphics.setDepth(18);
    this.focusArcGraphics = this.add.graphics();
    this.focusArcGraphics.setDepth(26);
    this.fusionHaloGraphics = this.add.graphics();
    this.fusionHaloGraphics.setDepth(19);
    this.quantumPinGraphics = this.add.graphics();
    this.quantumPinGraphics.setDepth(24);
    this.wormholeGraphics = this.add.graphics();
    this.wormholeGraphics.setDepth(17);
    if (this.levelData.tetherPylons && this.levelData.tetherPylons.length > 0) {
      this.tetherPylonGraphics = this.add.graphics();
      this.tetherPylonGraphics.setDepth(16);
      this.drawTetherPylons();
    }

    const builtLvlNum = Number(this.levelData.id);
    if (builtLvlNum === 27 && this.previousCompletedLevelId === 26) {
      this.triggerSupernovaShockwave();
    }
    if (builtLvlNum === 118) {
      this.renderOganessonConstellation();
    }
  }

  private spawnHeroes(): void {
    if (this.heroGroup) {
      this.heroGroup.clear(true, true);
    } else {
      for (const h of this.heroes) {
        h.destroy();
      }
    }
    this.heroes = [];
    this.betaHero = null;
    this.alphaEnteredPortal = false;
    this.betaEnteredPortal = false;
    this.alphaArrivalTimeMs = null;
    this.betaArrivalTimeMs = null;
    this.bubbleHarvestHits = [];
    for (const b of this.antigravityBubbles) {
      b.graphic.destroy();
    }
    this.antigravityBubbles = [];

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
        bBody?.setGravityY?.(-2 * PHYSICS.GRAVITY_Y);
      }

      if (entanglement.revealAtX !== undefined) {
        this.entanglementRevealed = false;
        this.cameras.main.setZoom(1);
        this.cameras.main.followOffset?.set?.(0, 0);
        this.cameras.main.centerOn(initialHero.x, initialHero.y);
        this.cameras.main.startFollow(initialHero, true, 0.1, 0.1);
      } else {
        const cx = (initialHero.x + this.betaHero.x) / 2;
        const cy = (initialHero.y + this.betaHero.y) / 2;
        const dx = Math.abs(initialHero.x - this.betaHero.x);
        const dy = Math.abs(initialHero.y - this.betaHero.y);
        const initZoomX = this.cameras.main.width / (dx + 240);
        const initZoomY = this.cameras.main.height / (dy + 200);
        const initZoom = Phaser.Math.Clamp(Math.min(initZoomX, initZoomY), 0.28, 1.0);
        this.cameras.main.setZoom(initZoom);
        this.cameras.main.centerOn(cx, cy);
      }
    } else {
      this.cameras.main.setZoom(1);
      this.cameras.main.followOffset?.set?.(0, 0);
      this.cameras.main.centerOn(initialHero.x, initialHero.y);
      this.cameras.main.startFollow(initialHero, true, 0.1, 0.1);
    }

    soundManager.setClonesCount(this.heroes.length);
  }

  private clearLevelObjects(): void {
    this.tweens?.killAll?.();
    this.physics?.world?.colliders?.destroy?.();

    this.quantumEffects?.destroy();
    this.quantumEffects = null;

    this.bohrBackground?.destroy();
    this.bohrBackground = null;

    for (const mural of this.muralObjects) {
      mural.destroy();
    }
    this.muralObjects = [];

    for (const obj of this.discoveryBoxObjects) {
      obj.destroy();
    }
    this.discoveryBoxObjects = [];

    if (this.entanglementGraphics) {
      this.entanglementGraphics.destroy();
      this.entanglementGraphics = null;
    }
    if (this.pauliGraphics) {
      this.pauliGraphics.destroy();
      this.pauliGraphics = null;
    }
    if (this.spikeGfx) {
      this.spikeGfx.destroy();
      this.spikeGfx = null;
    }
    if (this.diveTrailGraphics) {
      this.diveTrailGraphics.destroy();
      this.diveTrailGraphics = null;
    }
    if (this.focusArcGraphics) {
      this.focusArcGraphics.destroy();
      this.focusArcGraphics = null;
    }
    if (this.thumbRibbonGraphics) {
      this.thumbRibbonGraphics.destroy();
      this.thumbRibbonGraphics = null;
    }
    if (this.tetherPylonGraphics) {
      this.tetherPylonGraphics.destroy();
      this.tetherPylonGraphics = null;
    }
    if (this.screenWrapGraphics) {
      this.screenWrapGraphics.destroy();
      this.screenWrapGraphics = null;
    }
    if (this.fusionHaloGraphics) {
      this.fusionHaloGraphics.destroy();
      this.fusionHaloGraphics = null;
    }
    if (this.quantumPinGraphics) {
      this.quantumPinGraphics.destroy();
      this.quantumPinGraphics = null;
    }
    if (this.wormholeGraphics) {
      this.wormholeGraphics.destroy();
      this.wormholeGraphics = null;
    }
    for (const crystal of this.broglieCrystals) {
      crystal.rect.destroy();
    }
    this.broglieCrystals = [];
    this.liquidPlatforms = [];
    this.gasPlatforms = [];
    this.pinnablePlatforms = [];
    this.activePinPointerWorld = null;
    for (const ghost of this.screenWrapGhosts) {
      ghost.destroy();
    }
    this.screenWrapGhosts = [];
    this.crackedPlatforms = [];
    this.ephemeralPlatforms = [];
    this.entanglementRevealed = false;
    if (this.constellationGraphics) {
      this.constellationGraphics.destroy();
      this.constellationGraphics = null;
    }
    if (this.periodicTableGraphics) {
      this.periodicTableGraphics.destroy();
      this.periodicTableGraphics = null;
    }
    this.hookedTetherPylon = null;
    if (this.unsubJump) {
      this.unsubJump();
      this.unsubJump = null;
    }
    if (this.unsubHudStore) {
      this.unsubHudStore();
      this.unsubHudStore = null;
    }

    for (const pip of this.edgePips) {
      pip.bg.destroy();
      pip.label.destroy();
      pip.hitArea.destroy();
    }
    this.edgePips = [];

    if (this.hudContainer) {
      this.hudContainer.destroy(true);
      this.hudContainer = null;
    }
    if (this.levelCompleteOverlay) {
      this.levelCompleteOverlay.destroy(true);
      this.levelCompleteOverlay = null;
    }
    if (this.ghostHero) {
      this.ghostHero.destroy();
      this.ghostHero = null;
    }
    this.destroySwarmGhosts();
    if (this.betaPortalSprite) {
      this.betaPortalSprite.destroy();
      this.betaPortalSprite = null;
    }
    if (this.portalSprite) {
      this.portalSprite.destroy();
    }

    for (const echo of this.deathEchoes) {
      echo.destroy();
    }
    this.deathEchoes = [];

    for (const item of this.pressurePlatesList) {
      item.baseRect.destroy();
      item.padRect.destroy();
    }
    this.pressurePlatesList = [];

    for (const mol of this.molecules) {
      mol.circle.destroy();
    }
    this.molecules = [];
    this.bubbleHarvestHits = [];
    for (const b of this.antigravityBubbles) {
      b.graphic.destroy();
    }
    this.antigravityBubbles = [];

    this.heroGroup?.clear?.(true, true);
    this.platforms?.clear?.(true, true);
    this.movingPlatformsGroup?.clear?.(true, true);
    this.sceneBounds?.clear?.(true, true);
    this.spikes?.clear?.(true, true);
    this.particles?.clear?.(true, true);
    this.gatesGroup?.clear?.(true, true);

    this.heroes = [];
    this.betaHero = null;
    this.gatesMap.clear();
    this.movingPlatforms = [];
    this.phasePlatforms = [];
    this.decayPlatforms = [];
  }

  private getCurrentAtomicNumber(): number {
    const raw =
      this.levelData?.symbol ||
      this.levelData?.id ||
      useGameStore.getState().currentLevel ||
      1;
    return getElementSpectroscopy(raw).z;
  }

  private createMolecules(): void {
    const z = this.getCurrentAtomicNumber();
    const viewW = this.cameras.main?.width || 800;
    const viewH = this.cameras.main?.height || 600;
    this.bohrBackground = new BohrBackgroundRenderer(this, z, viewW / 2, viewH / 2);

    // Holographic Mural Inscription in background (depth: 2, alpha: 0.35)
    const spec = getElementSpectroscopy(z);
    const mass = getAtomicMass(z);
    const narrativeLines = getNarrativeForLevel(z);
    const verse = narrativeLines[0] || spec.description;

    const muralX = Math.min(this.levelData.width * 0.5, viewW * 0.5);
    const muralY = Math.min(this.levelData.height * 0.45, viewH * 0.44);

    const symbolText = this.add.text(muralX, muralY - 24, spec.symbol, {
      fontFamily: 'Orbitron',
      fontSize: '96px',
      color: spec.antiHue,
      fontStyle: 'bold'
    });
    symbolText.setOrigin(0.5);
    symbolText.setAlpha(0.35);
    symbolText.setDepth(2);
    symbolText.setScrollFactor(0.35);
    this.muralObjects.push(symbolText);

    const metaText = this.add.text(
      muralX,
      muralY + 38,
      `Z=${spec.z} • ${spec.name.toUpperCase()} • ${mass} u`,
      {
        fontFamily: 'Orbitron',
        fontSize: '14px',
        color: spec.antiHue
      }
    );
    metaText.setOrigin(0.5);
    metaText.setAlpha(0.35);
    metaText.setDepth(2);
    metaText.setScrollFactor(0.35);
    this.muralObjects.push(metaText);

    const verseText = this.add.text(muralX, muralY + 62, verse, {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#ffffff'
    });
    verseText.setOrigin(0.5);
    verseText.setAlpha(0.35);
    verseText.setDepth(2);
    verseText.setScrollFactor(0.35);
    this.muralObjects.push(verseText);

    const numMolecules = 25;
    for (let i = 0; i < numMolecules; i++) {
      const rx = Phaser.Math.Between(0, this.levelData.width);
      const ry = Phaser.Math.Between(0, this.levelData.height);
      const radius = Phaser.Math.Between(12, 42);
      const color = Phaser.Display.Color.HexStringToColor(this.levelData.antiHue).color;
      const circle = this.add.circle(rx, ry, radius, color, Phaser.Math.FloatBetween(0.04, 0.1));
      circle.setDepth(1);
      this.molecules.push({
        circle,
        vx: Phaser.Math.FloatBetween(-0.5, 0.5),
        vy: Phaser.Math.FloatBetween(-0.5, 0.5)
      });
    }

    this.renderSafeDiscoveryBox();
  }

  /**
   * Spec-12: Renders a minimalist 2-step holographic pictogram in the background (depth: 2)
   * of milestone levels without any blocking modal.
   */
  public renderSafeDiscoveryBox(): void {
    const discovery = this.levelData?.discoveryBox;
    if (!discovery?.enabled || !this.add) return;

    const anchorX = Math.max(200, (this.levelData.player?.position?.x ?? 120) + 150);
    const anchorY = Math.max(130, (this.levelData.player?.position?.y ?? 500) - 110);
    const colorHex = this.levelData.antiHue || '#00f5d4';
    const colorNum = Phaser.Display.Color.HexStringToColor(colorHex).color;

    if (typeof this.add.graphics === 'function') {
      const g = this.add.graphics();
      g.setDepth(2);
      g.setAlpha(0.45);
      g.lineStyle(2, colorNum, 0.85);
      // Step 1 holographic frame
      if (typeof g.strokeRoundedRect === 'function') {
        g.strokeRoundedRect(anchorX - 165, anchorY - 34, 138, 56, 8);
      } else if (typeof g.strokeRect === 'function') {
        g.strokeRect(anchorX - 165, anchorY - 34, 138, 56);
      }
      // Connecting arrow (Step 1 -> Step 2)
      if (typeof g.lineBetween === 'function') {
        g.lineBetween(anchorX - 20, anchorY - 6, anchorX + 20, anchorY - 6);
        g.lineBetween(anchorX + 12, anchorY - 12, anchorX + 20, anchorY - 6);
        g.lineBetween(anchorX + 12, anchorY, anchorX + 20, anchorY - 6);
      }
      // Step 2 holographic frame
      if (typeof g.strokeRoundedRect === 'function') {
        g.strokeRoundedRect(anchorX + 27, anchorY - 34, 138, 56, 8);
      } else if (typeof g.strokeRect === 'function') {
        g.strokeRect(anchorX + 27, anchorY - 34, 138, 56);
      }
      this.discoveryBoxObjects.push(g);
    }

    if (typeof this.add.text === 'function') {
      const [step1, step2] = discovery.hintSteps;
      const t1 = this.add.text(anchorX - 96, anchorY - 6, `1. ${step1}`, {
        fontFamily: 'Orbitron',
        fontSize: '11px',
        color: colorHex,
        align: 'center'
      });
      t1.setOrigin(0.5);
      t1.setDepth(2);
      t1.setAlpha(0.55);
      this.discoveryBoxObjects.push(t1);

      const t2 = this.add.text(anchorX + 96, anchorY - 6, `2. ${step2}`, {
        fontFamily: 'Orbitron',
        fontSize: '11px',
        color: colorHex,
        align: 'center'
      });
      t2.setOrigin(0.5);
      t2.setDepth(2);
      t2.setAlpha(0.55);
      this.discoveryBoxObjects.push(t2);
    }
  }

  private getPointerWorldCoords(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    const cam = this.cameras?.main;
    if (cam?.getWorldPoint) {
      const wp = cam.getWorldPoint(pointer.x, pointer.y);
      return { x: wp.x, y: wp.y };
    }
    return { x: pointer.x, y: pointer.y };
  }

  private setupPointerControls(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.uiPointerConsumed) {
        this.uiPointerConsumed = false;
        return;
      }
      if (this.isLevelCompleted) {
        if (this.canAdvanceLevel) {
          this.advanceToNextLevel();
        }
        return;
      }
      if (pointer.y <= 54) {
        return;
      }

      // 2-finger tap: Broglie Wave-Trail Solidification
      if (this.input.pointer1?.isDown && this.input.pointer2?.isDown) {
        this.tryCrystallizeBroglieTrail();
      }

      // Quantum Pinning: holding pointer directly on a decayMs or phase platform
      const worldPt = this.getPointerWorldCoords(pointer);
      if (findPinnablePlatformAtPoint(worldPt.x, worldPt.y, this.pinnablePlatforms)) {
        this.activePinPointerWorld = worldPt;
      }

      const { doubleTap } = this.touchController.onPointerDown(
        pointer.x,
        pointer.y,
        this.time.now
      );
      if (doubleTap) {
        if (this.tryInFlightFission()) {
          return;
        }
        if (this.heroes.length > 1 && !this.isEntangled) {
          this.cycleFocusNext();
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const worldPt = this.getPointerWorldCoords(pointer);
      if (!this.isLevelCompleted && !this.isTransitioningLevel) {
        this.trackBubblePointerMove(worldPt.x, worldPt.y, this.time?.now ?? Date.now());
      }
      if (pointer.isDown) {
        if (findPinnablePlatformAtPoint(worldPt.x, worldPt.y, this.pinnablePlatforms)) {
          this.activePinPointerWorld = worldPt;
        } else if (this.activePinPointerWorld) {
          this.activePinPointerWorld = null;
        }
      }
      if (!this.touchController.isPointerDown) return;
      const focused = this.heroes.find((h) => h.isFocused) || this.heroes[0];
      const touchingGround = focused?.body
        ? focused.upsideDown === 1
          ? focused.body.touching.down || focused.body.blocked.down
          : focused.body.touching.up || focused.body.blocked.up
        : false;
      this.touchController.onPointerMove(pointer.x, pointer.y, this.time.now, touchingGround);
    });

    this.input.on('pointerup', () => {
      this.activePinPointerWorld = null;
      this.touchController.onPointerUp();
    });
  }

  public destroySwarmGhosts(): void {
    for (const ghost of this.swarmGhosts) {
      ghost.destroy();
    }
    this.swarmGhosts = [];
    this.swarmPlaybackActive = false;
    this.swarmPlaybackElapsedMs = 0;
  }

  public spawnSwarmGhosts(speed = 1): void {
    this.destroySwarmGhosts();
    const attempts = this.swarmBuffer.getAttempts();
    if (attempts.length === 0) return;

    const baseHex = this.levelData?.antiHue || this.levelData?.hue || '#00e5ff';
    const total = attempts.length;

    for (let i = 0; i < total; i++) {
      const attempt = attempts[i];
      if (!attempt.frames || attempt.frames.length === 0) continue;
      const tint = getSwarmSpectrumTint(baseHex, i, total, attempt.isVictory);
      const ghost = new GhostHero(this, attempt.frames, {
        alpha: 0.22,
        finishedAlpha: 0.08,
        tint
      });
      ghost.setVisible(true);
      this.swarmGhosts.push(ghost);
    }

    this.swarmPlaybackSpeed = speed;
    this.swarmPlaybackElapsedMs = 0;
    this.swarmPlaybackMaxMs = this.swarmBuffer.getMaxDurationMs();
    this.swarmPlaybackActive = this.swarmGhosts.length > 0;
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

    if (mode === 'swarm') {
      this.ghostFrames = [];
      if (this.swarmBuffer.size > 0) {
        this.spawnSwarmGhosts(1);
      }
    } else {
      if (!this.isLevelCompleted) {
        this.destroySwarmGhosts();
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
    }

    if (this.ghostButton?.active) {
      const label =
        mode === 'off'
          ? '[GHOST: OFF]'
          : mode === 'optimal'
            ? '[GHOST: OPTIMAL]'
            : mode === 'best'
              ? '[GHOST: BEST]'
              : '[GHOST: SWARM]';
      this.ghostButton.setText(label);
      this.ghostButton.setAlpha(mode !== 'off' ? 1 : 0.45);
      this.ghostButton.setVisible(this.hasAnyGhost || this.swarmBuffer.size > 0);
    }

    if (this.splitDeltaText?.active) {
      this.splitDeltaText.setVisible(mode !== 'off' && this.ghostFrames.length > 0);
    }
  }

  private createHUD(): void {
    const camW = this.cameras.main.width;
    const camH = this.cameras.main.height;
    const hudHeight = 54;

    this.hudContainer = this.add.container(0, 0);
    this.hudContainer.setScrollFactor(0);
    this.hudContainer.setDepth(100);

    this.thumbRibbonGraphics = this.add.graphics();
    this.hudContainer.add(this.thumbRibbonGraphics);

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
      this.uiPointerConsumed = true;
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
      this.uiPointerConsumed = true;
      if (!this.isLevelCompleted && !this.isTransitioningLevel) {
        this.quickRespawn();
      }
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
      this.uiPointerConsumed = true;
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
      this.uiPointerConsumed = true;
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
      this.uiPointerConsumed = true;
      useGameStore.getState().toggleReducedEffects();
      fxButton.setText(getFxLabel());
    });
    this.hudContainer.add(fxButton);

    // Row 2: Ghost replay toggle button [GHOST: OFF] / [GHOST: OPTIMAL] / [GHOST: BEST] / [GHOST: SWARM]
    const currentMode =
      useGameStore.getState().ghostMode ??
      (useGameStore.getState().ghostEnabled ? 'optimal' : 'off');
    const ghostLabel =
      currentMode === 'off'
        ? '[GHOST: OFF]'
        : currentMode === 'optimal'
          ? '[GHOST: OPTIMAL]'
          : currentMode === 'best'
            ? '[GHOST: BEST]'
            : '[GHOST: SWARM]';
    this.ghostButton = this.add.text(44, 29, ghostLabel, {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#38bdf8'
    });
    this.ghostButton.setScrollFactor(0);
    this.ghostButton.setAlpha(currentMode !== 'off' ? 1 : 0.45);
    this.ghostButton.setVisible(this.hasAnyGhost || this.swarmBuffer.size > 0);
    this.ghostButton.setInteractive({ useHandCursor: true });
    this.ghostButton.on('pointerdown', () => {
      this.uiPointerConsumed = true;
      const hasBest = Boolean(this.personalTrajectory);
      useGameStore.getState().toggleGhost(hasBest, this.swarmBuffer.size > 0);
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
      this.phaseIndicatorText.setInteractive({
        useHandCursor: true,
        hitArea: new Phaser.Geom.Rectangle(-8, -8, 120, 36),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains
      });
      this.phaseIndicatorText.on('pointerdown', () => {
        this.uiPointerConsumed = true;
        this.togglePhasePlatforms();
      });
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

    if (isGodMode()) {
      const godBadge = this.add.text(274, 5, '[GOD]', {
        fontFamily: 'VT323',
        fontSize: '18px',
        color: '#fbbf24'
      });
      this.hudContainer.add(godBadge);
    }

    if (this.unsubHudStore) {
      this.unsubHudStore();
    }
    this.unsubHudStore = useGameStore.subscribe(() => {
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

    // Thumb-Zone Quick Restart button (bottom-right: 48x48 px, alpha 0.35)
    const thumbRestartBg = this.add.rectangle(camW - 36, camH - 36, 48, 48, 0x0b0f19, 0.35);
    thumbRestartBg.setStrokeStyle(1.5, 0xfbbf24, 0.35);
    const thumbRestartLabel = this.add.text(camW - 36, camH - 36, '↻', {
      fontFamily: 'VT323',
      fontSize: '28px',
      color: '#fbbf24'
    });
    thumbRestartLabel.setOrigin(0.5);
    thumbRestartLabel.setAlpha(0.35);
    const thumbRestartZone = this.add.zone(camW - 36, camH - 36, 48, 48);
    thumbRestartZone.setInteractive({ useHandCursor: true });
    thumbRestartZone.on('pointerdown', () => {
      this.uiPointerConsumed = true;
      if (!this.isLevelCompleted && !this.isTransitioningLevel) {
        this.quickRespawn();
      }
    });
    this.hudContainer.add(thumbRestartBg);
    this.hudContainer.add(thumbRestartLabel);
    this.hudContainer.add(thumbRestartZone);

    this.updateEdgePips();
    this.syncHudTransform();
  }

  private updateEdgePips(): void {
    for (const pip of this.edgePips) {
      pip.bg.destroy();
      pip.label.destroy();
      pip.hitArea.destroy();
    }
    this.edgePips = [];

    if (!this.hudContainer || this.isEntangled || this.heroes.length <= 1) {
      return;
    }

    const camH = this.cameras.main.height;
    const pipY = camH - 70;
    const subscripts = ['ψ₁', 'ψ₂', 'ψ₃'];

    this.heroes.slice(0, 3).forEach((hero, index) => {
      const pipX = 40 + index * 70;
      const isFocused = hero.isFocused;
      const bg = this.add.rectangle(
        pipX,
        pipY,
        64,
        64,
        isFocused ? 0x083344 : 0x0b0f19,
        isFocused ? 0.85 : 0.45
      );
      bg.setStrokeStyle(2, isFocused ? 0x00e5ff : 0x64748b, isFocused ? 0.95 : 0.5);

      const label = this.add.text(pipX, pipY, subscripts[index] ?? `ψ${index + 1}`, {
        fontFamily: 'VT323',
        fontSize: '24px',
        color: isFocused ? '#00e5ff' : '#94a3b8'
      });
      label.setOrigin(0.5);

      const hitArea = this.add.zone(pipX, pipY, 64, 64);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        this.uiPointerConsumed = true;
        this.switchFocusTo(hero);
      });

      this.hudContainer?.add(bg);
      this.hudContainer?.add(label);
      this.hudContainer?.add(hitArea);
      this.edgePips.push({ bg, label, hitArea });
    });
  }

  public switchFocusTo(targetHero: Hero): void {
    if (this.isEntangled || this.heroes.length <= 1) return;
    if (!targetHero || !targetHero.active) return;

    const prevHero = this.heroes.find((h) => h.isFocused) || this.heroes[0];
    if (targetHero === prevHero) return;

    for (const h of this.heroes) {
      h.setFocus(h === targetHero);
    }
    this.cameras.main.startFollow(targetHero, true, 0.1, 0.1);

    // Micro-Bullet-Time d'Orientation (180 ms at 0.2x)
    this.switchCount += 1;
    this.focusBulletTimeUntil = this.time.now + 180;
    if (prevHero?.active) {
      this.drawFocusSwitchArc(prevHero.x, prevHero.y, targetHero.x, targetHero.y);
      gameEvents.emit('hero:focus_switch', { fromId: prevHero.id, toId: targetHero.id });
    }
    this.updateEdgePips();
  }

  public cycleFocusNext(): void {
    if (this.isEntangled || this.heroes.length <= 1) return;
    const currentIdx = this.heroes.findIndex((h) => h.isFocused);
    const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % this.heroes.length : 0;
    this.switchFocusTo(this.heroes[nextIdx]);
  }

  public switchFocusByIndex(index: number): void {
    if (this.isEntangled || this.heroes.length <= 1) return;
    if (index >= 0 && index < this.heroes.length) {
      this.switchFocusTo(this.heroes[index]);
    }
  }

  private drawFocusSwitchArc(x1: number, y1: number, x2: number, y2: number): void {
    if (!this.focusArcGraphics) return;
    const g = this.focusArcGraphics;
    g.clear();

    const isReduced = useGameStore.getState().reducedEffects;
    g.lineStyle(isReduced ? 2 : 3, 0x00e5ff, 0.9);
    g.beginPath();
    g.moveTo(x1, y1);
    if (!isReduced) {
      const midX = (x1 + x2) / 2 + (Math.random() * 28 - 14);
      const midY = (y1 + y2) / 2 + (Math.random() * 28 - 14);
      g.lineTo(midX, midY);
    }
    g.lineTo(x2, y2);
    g.strokePath();

    this.time.delayedCall(180, () => {
      if (this.focusArcGraphics) {
        this.focusArcGraphics.clear();
      }
    });
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
    if (this.lastShownLevelId === this.levelData.id) {
      return;
    }
    this.lastShownLevelId = this.levelData.id;

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

  private spawnDeathEcho(x: number, y: number): void {
    if (!this.add?.sprite) return;
    const antiHueColor = Phaser.Display.Color.HexStringToColor(this.levelData.antiHue).color;
    const clampedY = Phaser.Math.Clamp(y, 16, Math.max(16, this.levelData.height - 16));
    const echo = this.add.sprite(x, clampedY, 'hero', 0);
    echo.setAlpha(0.16);
    echo.setTint(antiHueColor);
    echo.setDepth(8);
    this.deathEchoes.push(echo);
  }

  public quickRespawn(deathPosition?: { x: number; y: number }): void {
    if (this.isRespawning || this.isLevelCompleted || this.isTransitioningLevel) {
      return;
    }
    this.isRespawning = true;

    if (deathPosition) {
      this.spawnDeathEcho(deathPosition.x, deathPosition.y);
    }

    // 1. Reset physics world & active power-up states
    if (this.physics?.world) {
      this.physics.world.gravity.y = PHYSICS.GRAVITY_Y;
      this.physics.world.timeScale = 1.0;
    }
    this.isPauliActive = false;
    this.isTimeDilationActive = false;
    this.timeDilationUntil = 0;
    this.focusBulletTimeUntil = 0;
    this.pauliGraphics?.clear();
    this.diveTrailGraphics?.clear();
    this.focusArcGraphics?.clear();
    this.fusionHaloGraphics?.clear();
    this.quantumPinGraphics?.clear();
    this.quantumPinningState = createQuantumPinningState();
    this.activePinPointerWorld = null;
    this.hasCondenseAbility = false;
    for (const crystal of this.broglieCrystals) {
      crystal.rect.destroy();
    }
    this.broglieCrystals = [];
    this.hookedTetherPylon = null;
    for (const ghost of this.screenWrapGhosts) {
      ghost.setVisible(false);
    }
    if (this.dilationIndicatorText?.active) {
      this.dilationIndicatorText.setVisible(false);
    }

    // 2. Respawn heroes at initial spawn (destroys secondary clones)
    this.spawnHeroes();
    this.updateEdgePips();

    // 3. Reactivate all collected particles at their original coordinates
    if (this.particles?.getChildren) {
      for (const child of this.particles.getChildren()) {
        const sprite = child as Phaser.Physics.Arcade.Sprite;
        const px = (sprite.getData('startX') as number | undefined) ?? sprite.x;
        const py = (sprite.getData('startY') as number | undefined) ?? sprite.y;
        if (typeof sprite.enableBody === 'function') {
          sprite.enableBody(true, px, py, true, true);
        } else {
          sprite.setActive?.(true);
          sprite.setVisible?.(true);
          sprite.setPosition?.(px, py);
          if (sprite.body) {
            (sprite.body as Phaser.Physics.Arcade.Body).enable = true;
          }
        }
      }
    }

    // 4. Restore phase platforms to 'cyan'
    if (this.hasPhasePlatforms) {
      this.currentPhase = 'cyan';
      this.applyPhase('cyan');
      if (this.phaseIndicatorText?.active) {
        this.phaseIndicatorText.setText('[PHASE: CYAN]');
        this.phaseIndicatorText.setColor('#00ffff');
      }
    }

    // 5. Restore half-life decay platforms & cracked platforms
    for (const dp of this.decayPlatforms) {
      dp.state.timerMs = 0;
      dp.state.triggered = false;
      dp.state.collapsed = false;
      dp.state.respawnTimerMs = 0;
      dp.rect.setAlpha(1);
      dp.rect.setPosition(dp.startX, dp.startY);
      const body = dp.rect.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.checkCollision.none = false;
        body.updateFromGameObject?.();
      }
    }
    for (const cp of this.crackedPlatforms) {
      cp.setAlpha(1);
      cp.setVisible(true);
      const body = cp.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.checkCollision.none = false;
        body.enable = true;
        body.updateFromGameObject?.();
      }
    }
    this.restoreEphemeralPlatforms();

    if (this.levelData.entanglement?.revealAtX !== undefined) {
      this.entanglementRevealed = false;
      this.cameras?.main?.setZoom?.(1);
      if (this.heroes[0]) {
        this.cameras?.main?.startFollow?.(this.heroes[0], true, 0.1, 0.1);
      }
    }

    // 6. Restore moving platforms
    for (const mp of this.movingPlatforms) {
      mp.rect.setPosition(mp.startX, mp.startY);
      mp.direction = { ...mp.initialDirection };
      const body = mp.rect.body as Phaser.Physics.Arcade.Body | null;
      if (body) {
        body.setVelocity(0, 0);
        body.reset?.(mp.startX, mp.startY);
      }
    }

    // 7. Restore pressure plates & gates
    for (const item of this.pressurePlatesList) {
      item.isPressed = false;
      item.padRect.setY(item.startY);
      item.padRect.setFillStyle(0x10b981);
    }
    for (const [, gateEntry] of this.gatesMap) {
      gateEntry.rect.setAlpha(1);
      const body = gateEntry.rect.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.enable = true;
      }
    }

    // 8. Restore gravitational collapse jaws
    if (this.collapseConfig && this.collapseTopSpikes && this.collapseBottomSpikes) {
      this.collapseTopSpikes.y = PHYSICS.COLLAPSE_TOP_START_Y / 2;
      this.collapseBottomSpikes.y = this.levelData.height - PHYSICS.COLLAPSE_BOTTOM_MARGIN_Y + 80;
      (this.collapseTopSpikes.body as Phaser.Physics.Arcade.StaticBody | null)?.updateFromGameObject?.();
      (this.collapseBottomSpikes.body as Phaser.Physics.Arcade.StaticBody | null)?.updateFromGameObject?.();
    }

    // 9. Reset timer, split delta, ghost replay & touch state
    this.timerStarted = false;
    this.startTime = 0;
    this.dilatedElapsedMs = 0;
    this.lastTimerString = '';
    this.lastTimerColor = '';
    this.lastSplitString = '';
    this.lastSplitColor = '';
    this.lastSplitUpdateMs = 0;
    if (this.timerText?.active) {
      this.timerText.setText('00:00:00');
      this.timerText.setColor('#ffffff');
    }
    if (this.splitDeltaText?.active) {
      this.splitDeltaText.setText('--');
      this.splitDeltaText.setColor('#94a3b8');
    }
    const failedFrames = this.ghostRecorder.getFrames();
    if (failedFrames.length > 0) {
      this.swarmBuffer.addAttempt(failedFrames, false);
    }
    this.jumpCount = 0;
    this.switchCount = 0;

    this.ghostRecorder.reset();
    if (this.ghostHero) {
      this.ghostHero.updateReplay(0);
    }
    if (this.ghostButton?.active) {
      this.ghostButton.setVisible(this.hasAnyGhost || this.swarmBuffer.size > 0);
    }
    const currentGhostMode =
      useGameStore.getState().ghostMode ??
      (useGameStore.getState().ghostEnabled ? 'optimal' : 'off');
    if (currentGhostMode === 'swarm' && this.swarmBuffer.size > 0) {
      this.spawnSwarmGhosts(1);
    }
    this.touchController.reset();

    // 10. Quantum implosion flash (120 ms)
    const startX = this.levelData.player.position.x;
    const startY = this.levelData.player.position.y;
    if (this.add?.circle && this.tweens?.add) {
      const implosionRing = this.add.circle(startX, startY, 34, 0x00e5ff, 0.65);
      implosionRing.setDepth(30);
      this.tweens.add({
        targets: implosionRing,
        scale: 0.1,
        alpha: 0,
        duration: 120,
        ease: 'Quad.easeIn',
        onComplete: () => implosionRing.destroy()
      });
    }
    this.cameras?.main?.flash?.(120, 0, 229, 255, false);

    if (this.time?.delayedCall) {
      this.time.delayedCall(120, () => {
        this.isRespawning = false;
      });
    } else {
      this.isRespawning = false;
    }
  }

  private killHero(hero: Hero): void {
    if (!hero || !hero.active || this.isRespawning || this.isLevelCompleted) return;

    const deathPos = { x: hero.x, y: hero.y };

    if (this.isEntangled) {
      gameEvents.emit('hero:death', { remaining: 0, entangledCollapse: true });
      this.quickRespawn(deathPos);
      return;
    }

    hero.destroy();
    this.heroes = this.heroes.filter((h) => h !== hero && h.active);
    gameEvents.emit('hero:death', { remaining: this.heroes.length });

    if (this.heroes.length === 0) {
      this.quickRespawn(deathPos);
    } else {
      const anyFocused = this.heroes.some((h) => h.isFocused);
      if (!anyFocused && this.heroes.length > 0) {
        this.heroes[0].setFocus(true);
        this.cameras.main.startFollow(this.heroes[0], true, 0.1, 0.1);
      }
      this.updateEdgePips();
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

    const nowMs = this.time?.now ?? Date.now();
    if (hero.isBeta) {
      this.betaEnteredPortal = true;
      this.betaArrivalTimeMs = nowMs;
    } else {
      this.alphaEnteredPortal = true;
      this.alphaArrivalTimeMs = nowMs;
    }

    gameEvents.emit('hero:portal_docked', { isBeta: hero.isBeta });

    if (this.alphaArrivalTimeMs !== null && this.betaArrivalTimeMs !== null) {
      const deltaMs = Math.abs(this.alphaArrivalTimeMs - this.betaArrivalTimeMs);
      if (deltaMs <= 50) {
        const levelNum = Number(this.levelData.id);
        gameEvents.emit('bell:violation', { level: levelNum, deltaMs });
        if (!Number.isNaN(levelNum) && levelNum > 0) {
          useGameStore.getState().unlockBellSync(levelNum);
        }
        this.cameras?.main?.flash?.(400, 255, 215, 0, false);
        this.showRetroToast('BELL SYNC ! (ISOTOPE D\'OR)');
      }
    }

    if (this.alphaEnteredPortal && this.betaEnteredPortal) {
      this.time.delayedCall(120, () => {
        this.completeLevel();
      });
    }
  }

  private collectParticle(hero: Hero, particle: Phaser.Physics.Arcade.Sprite): void {
    if (!particle.active) return;
    const type = particle.getData('type') as ParticleType;
    if (typeof particle.disableBody === 'function') {
      particle.disableBody(true, true);
    } else {
      particle.setActive(false);
      particle.setVisible(false);
      if (particle.body) {
        (particle.body as Phaser.Physics.Arcade.Body).enable = false;
      }
    }
    gameEvents.emit('particle:collect', { type });

    const powerUpNames: Record<ParticleType, string> = {
      antiGravity: 'ANTI GRAVITY !',
      lowGravity: 'LOW GRAVITY !',
      speed: 'HIGH SPEED !',
      duplicate: 'CLONING !',
      tunnel: 'TUNNELING CHARGE !',
      pauli: 'PAULI BLAST !',
      timeDilation: 'TIME DILATION !',
      condense: 'BROGLIE CONDENSE !'
    };

    switch (type) {
      case 'condense': {
        this.hasCondenseAbility = true;
        break;
      }
      case 'duplicate': {
        const uncertainty = this.levelData.uncertainty ?? 3;
        if (this.heroes.length < uncertainty) {
          const spawnX = Phaser.Math.Clamp(hero.x - 45, 32, this.levelData.width - 32);
          const clonedHero = new Hero(this, spawnX, hero.y - 10, false);
          clonedHero.createdAtMs = this.time?.now ?? 0;
          clonedHero.velocityMultiplier = hero.velocityMultiplier;
          clonedHero.setGravityInverted(this.physics.world.gravity.y < 0);
          clonedHero.pauliGraceUntil = this.time.now + 500;
          clonedHero.setTint(0x38bdf8);
          this.heroes.push(clonedHero);
          this.heroGroup.add(clonedHero);
          this.updateEdgePips();
          gameEvents.emit('hero:duplicate', { count: this.heroes.length });
        }
        break;
      }
      case 'speed': {
        hero.velocityMultiplier = PHYSICS.HERO_SPEED_BOOST;
        break;
      }
      case 'lowGravity': {
        const sign = this.physics.world.gravity.y < 0 ? -1 : 1;
        const currentMult = Math.abs(this.physics.world.gravity.y) / PHYSICS.GRAVITY_Y;
        const nextMult = applyLowGravity(currentMult);
        this.physics.world.gravity.y = sign * PHYSICS.GRAVITY_Y * nextMult;
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
        this.timeDilationUntil = this.time.now + PHYSICS.TIME_DILATION_DURATION_MS;
        gameEvents.emit('time:dilation', {
          active: true,
          durationMs: PHYSICS.TIME_DILATION_DURATION_MS
        });
        break;
      }
    }

    if (particle.getData('restoresEphemeral') === true || this.ephemeralPlatforms.length > 0) {
      const restored = this.restoreEphemeralPlatforms();
      if (restored > 0) {
        this.showRetroToast('CONSERVATION ! CAGE RESTORED');
      }
    }

    this.bohrBackground?.addValenceElectron();
    this.showRetroToast(powerUpNames[type] || '');
  }

  public showRetroToast(message: string): void {
    if (!message) return;
    const anchorHero = this.heroes.find((h) => h.isFocused && h.active) || this.heroes[0];
    const startX = anchorHero ? anchorHero.x : (this.cameras.main?.width || 800) / 2;
    const startY = anchorHero ? anchorHero.y - 36 : (this.cameras.main?.height || 600) / 2 - 36;

    const toast = this.add.text(startX, startY, message, {
      fontFamily: 'VT323',
      fontSize: '24px',
      color: this.levelData?.antiHue || '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    toast.setOrigin(0.5);
    toast.setAlpha(0.95);
    toast.setDepth(25);

    this.tweens.add({
      targets: toast,
      y: startY - 44,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => toast.destroy()
    });
  }

  public togglePhasePlatforms(): void {
    if (!this.hasPhasePlatforms) return;
    this.toggleLevelPhase();
    if (this.phaseIndicatorText?.active) {
      this.phaseIndicatorText.setScale(1.25);
      this.phaseIndicatorText.setAlpha(1);
      if (this.tweens?.add) {
        this.tweens.add({
          targets: this.phaseIndicatorText,
          scaleX: 1,
          scaleY: 1,
          duration: 180,
          ease: 'Cubic.easeOut'
        });
      }
    }
  }

  public trackBubblePointerMove(worldX: number, worldY: number, nowMs: number): boolean {
    if (this.molecules.length === 0) return false;
    this.bubbleHarvestHits = this.bubbleHarvestHits.filter((hit) => nowMs - hit.timeMs <= 800);

    for (let i = 0; i < this.molecules.length; i++) {
      const mol = this.molecules[i];
      if (!mol.circle?.active) continue;
      if (this.bubbleHarvestHits.some((h) => h.molIndex === i)) continue;
      const dist = Math.hypot(worldX - mol.circle.x, worldY - mol.circle.y);
      if (dist < 35) {
        this.bubbleHarvestHits.push({
          molIndex: i,
          x: mol.circle.x,
          y: mol.circle.y,
          timeMs: nowMs
        });
        if (this.bubbleHarvestHits.length >= 3) {
          const hits = this.bubbleHarvestHits.slice(0, 3);
          const bx = (hits[0].x + hits[1].x + hits[2].x) / 3;
          const by = (hits[0].y + hits[1].y + hits[2].y) / 3;
          for (const hit of hits) {
            const m = this.molecules[hit.molIndex];
            if (m?.circle && this.tweens?.add) {
              this.tweens.add({
                targets: m.circle,
                x: bx,
                y: by,
                scaleX: 0.2,
                scaleY: 0.2,
                duration: 180,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                  if (m.circle?.active) {
                    m.circle.setScale(1);
                    m.circle.setPosition(
                      Phaser.Math.Between(0, this.levelData.width),
                      Phaser.Math.Between(0, this.levelData.height)
                    );
                  }
                }
              });
            }
          }
          this.bubbleHarvestHits = [];
          this.spawnAntigravityBubble(bx, by, nowMs);
          return true;
        }
      }
    }
    return false;
  }

  public spawnAntigravityBubble(x: number, y: number, nowMs: number): void {
    const radius = 36;
    const duration = 4000;
    const graphic = this.add.circle(x, y, radius, 0x38bdf8, 0.26);
    graphic.setStrokeStyle?.(2, 0xe879f9, 0.9);
    graphic.setDepth?.(12);

    if (this.tweens?.add) {
      this.tweens.add({
        targets: graphic,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 450,
        yoyo: true,
        repeat: -1
      });
    }

    this.antigravityBubbles.push({
      x,
      y,
      radius,
      expiresAtMs: nowMs + duration,
      graphic
    });
    gameEvents.emit('bubble:harvest', { x, y });
  }

  public toggleLevelPhase(): void {
    if (!this.hasPhasePlatforms) return;
    this.currentPhase = togglePhase(this.currentPhase);
    this.applyPhase(this.currentPhase);
    gameEvents.emit('phase:shift', { phase: this.currentPhase });
    if (this.phaseIndicatorText?.active) {
      this.phaseIndicatorText.setText(`[PHASE: ${this.currentPhase.toUpperCase()}]`);
      this.phaseIndicatorText.setColor(this.currentPhase === 'cyan' ? '#00ffff' : '#ec4899');
    }
  }

  public applyPhase(phase: PlatformPhase): void {
    const pinnedId = this.quantumPinningState.pinnedPlatformId;
    for (const { rect, phase: pPhase } of this.phasePlatforms) {
      if (pinnedId && rect.getData('pinId') === pinnedId) {
        continue;
      }
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
    if (this.isLevelCompleted || this.isTransitioningLevel) return;
    this.isLevelCompleted = true;
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
    const winningFrames = this.ghostRecorder.getFrames();
    if (winningFrames.length > 0) {
      this.swarmBuffer.addAttempt(winningFrames, true);
    }

    const medal = calculateIsotopeMedal({
      timeMs: elapsedMs,
      jumpCount: this.jumpCount,
      level: this.levelData
    });

    const isShared = Boolean(store.sharedLevel);
    const currentLvl = Number(this.levelData.id);
    if (!Number.isNaN(currentLvl)) {
      this.previousCompletedLevelId = currentLvl;
    }
    if (currentLvl === 26) {
      this.triggerIronCoreCollapse();
    } else if (currentLvl === 118) {
      this.revealPeriodicTableSilhouette();
    }
    const prevBest = isShared
      ? (store.scores[0]?.best ?? 0)
      : (store.scores[currentLvl]?.best ?? 0);

    let nextLevelNumber: number | null = null;
    if (isShared) {
      store.recordScore(0, elapsedMs, trajectory, {
        jumpCount: this.jumpCount,
        switchCount: this.switchCount,
        medal
      });
    } else {
      store.recordScore(currentLvl, elapsedMs, trajectory, {
        jumpCount: this.jumpCount,
        switchCount: this.switchCount,
        medal
      });
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
      if (this.resolveLevelData(nextLevel)) {
        nextLevelNumber = nextLevel;
      }
    }
    this.nextLevelNumberPending = nextLevelNumber;

    const newBest = isShared
      ? (useGameStore.getState().scores[0]?.best ?? elapsedMs)
      : (useGameStore.getState().scores[currentLvl]?.best ?? elapsedMs);

    // 1. Vortex suction animation (280 ms: scale 1 -> 0, rotation 360 deg)
    for (const hero of this.heroes) {
      if (!hero.active) continue;
      if (hero.body) {
        (hero.body as Phaser.Physics.Arcade.Body).enable = false;
        hero.setVelocity(0, 0);
      }
      const targetPortal =
        hero.isBeta && this.betaPortalSprite ? this.betaPortalSprite : this.portalSprite;
      if (this.tweens?.add && targetPortal) {
        this.tweens.add({
          targets: hero,
          x: targetPortal.x,
          y: targetPortal.y,
          scaleX: 0,
          scaleY: 0,
          angle: 360,
          alpha: 0.2,
          duration: 280,
          ease: 'Cubic.easeIn'
        });
      }
    }

    // 1b. Swarm Victory Celebration (2x speed replay of up to 25 session attempts)
    if (this.swarmBuffer.size > 0) {
      this.spawnSwarmGhosts(2);
    }

    // 2. Show in-canvas Element Synthesized HUD banner & narrative overlay
    this.showLevelCompleteOverlay(elapsedMs, newBest, prevBest, nextLevelNumber, medal);

    if (this.time?.delayedCall) {
      this.time.delayedCall(280, () => {
        this.canAdvanceLevel = true;
      });
    } else {
      this.canAdvanceLevel = true;
    }
  }

  private showLevelCompleteOverlay(
    elapsedMs: number,
    bestMs: number,
    prevBestMs: number,
    nextLevelNumber: number | null,
    medal: IsotopeMedal = 'bronze'
  ): void {
    if (!this.add?.container || !this.cameras?.main) return;

    const camW = this.cameras.main.width;
    const camH = this.cameras.main.height;

    const overlay = this.add.container(0, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(200);
    overlay.setAlpha(0);
    this.levelCompleteOverlay = overlay;

    const backdrop = this.add.rectangle(camW / 2, camH / 2, camW, camH, 0x050814, 0.72);
    backdrop.setInteractive();
    backdrop.on('pointerdown', () => {
      if (this.canAdvanceLevel && nextLevelNumber !== null) {
        this.advanceToNextLevel();
      }
    });
    overlay.add(backdrop);

    const cardW = Math.min(620, camW - 48);
    const cardH = 264;
    const cardBg = this.add.rectangle(camW / 2, camH / 2, cardW, cardH, 0x0b0f19, 0.94);
    cardBg.setStrokeStyle(2, 0x00e5ff, 0.9);
    overlay.add(cardBg);

    const symbol = this.levelData.symbol || '?';
    const atom = this.levelData.atom || 'Element';
    const headerText = this.add.text(
      camW / 2,
      camH / 2 - 96,
      `ELEMENT SYNTHESIZED — ${symbol} ${atom.toUpperCase()}`,
      {
        fontFamily: 'VT323',
        fontSize: '28px',
        color: '#00e5ff',
        align: 'center'
      }
    );
    headerText.setOrigin(0.5);
    overlay.add(headerText);

    let deltaLabel = 'NEW RECORD';
    if (prevBestMs > 0) {
      const diffSec = (elapsedMs - prevBestMs) / 1000;
      const sign = diffSec <= 0 ? '-' : '+';
      deltaLabel = `${sign}${Math.abs(diffSec).toFixed(2)}s`;
    }

    const medalInfo = getMedalDisplayInfo(medal);
    const statsText = this.add.text(
      camW / 2,
      camH / 2 - 60,
      `${formatScore(elapsedMs)}  •  REC ${formatScore(bestMs)}  •  ${deltaLabel}`,
      {
        fontFamily: 'VT323',
        fontSize: '22px',
        color: prevBestMs === 0 || elapsedMs <= prevBestMs ? '#34d399' : '#f8fafc',
        align: 'center'
      }
    );
    statsText.setOrigin(0.5);
    overlay.add(statsText);

    const medalText = this.add.text(
      camW / 2,
      camH / 2 - 34,
      `${medalInfo.symbol} ${medalInfo.label.toUpperCase()}  •  JUMPS: ${this.jumpCount}`,
      {
        fontFamily: 'VT323',
        fontSize: '19px',
        color: medalInfo.color,
        align: 'center'
      }
    );
    medalText.setOrigin(0.5);
    overlay.add(medalText);

    const currentLvl = Number(this.levelData.id) || 1;
    const narrativeLines =
      this.levelData.explanations && this.levelData.explanations.length > 0
        ? this.levelData.explanations.slice(0, 2)
        : getNarrativeForLevel(currentLvl).slice(0, 2);

    const narrativeText = this.add.text(camW / 2, camH / 2 + 2, narrativeLines.join('\n'), {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#cbd5e1',
      align: 'center',
      wordWrap: { width: cardW - 48 }
    });
    narrativeText.setOrigin(0.5);
    overlay.add(narrativeText);

    const nextLevelData =
      nextLevelNumber !== null ? this.resolveLevelData(nextLevelNumber) : undefined;
    const primaryLabel = nextLevelData
      ? `[SPACE / TAP] NEXT: ${nextLevelData.symbol} ${nextLevelData.atom}`
      : '[LEVELS]';

    const nextBtn = this.add.text(camW / 2 - 115, camH / 2 + 78, primaryLabel, {
      fontFamily: 'VT323',
      fontSize: '22px',
      color: '#00ffcc',
      backgroundColor: '#083344',
      padding: { x: 12, y: 6 }
    });
    nextBtn.setOrigin(0.5);
    nextBtn.setInteractive({ useHandCursor: true });
    nextBtn.on('pointerdown', () => {
      this.uiPointerConsumed = true;
      if (nextLevelNumber !== null) {
        this.advanceToNextLevel();
      } else {
        soundManager.stopBgm();
        try {
          this.game.destroy(true);
        } catch {
          // safe
        }
        window.game = null;
        push('/levels');
      }
    });
    overlay.add(nextBtn);

    const codexBtn = this.add.text(camW / 2 + 135, camH / 2 + 78, '[SPECTROSCOPIE / CODEX]', {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#fbbf24',
      backgroundColor: '#1e293b',
      padding: { x: 10, y: 6 }
    });
    codexBtn.setOrigin(0.5);
    codexBtn.setInteractive({ useHandCursor: true });
    codexBtn.on('pointerdown', () => {
      this.uiPointerConsumed = true;
      soundManager.stopBgm();
      try {
        this.game.destroy(true);
      } catch {
        // safe
      }
      window.game = null;
      push('/explanation');
    });
    overlay.add(codexBtn);

    if (this.tweens?.add) {
      this.tweens.add({
        targets: overlay,
        alpha: 1,
        duration: 280,
        ease: 'Sine.easeOut'
      });
    } else {
      overlay.setAlpha(1);
    }
  }

  public advanceToNextLevel(): void {
    if (!this.isLevelCompleted || this.isTransitioningLevel) return;
    if (this.nextLevelNumberPending === null) return;

    const nextData = this.resolveLevelData(this.nextLevelNumberPending);
    if (!nextData) return;

    this.isTransitioningLevel = true;
    this.canAdvanceLevel = false;

    if (this.cameras?.main?.fadeOut && this.cameras?.main?.once) {
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.rebuildForLevel(nextData);
        this.cameras.main.fadeIn(300, 0, 0, 0);
      });
      this.cameras.main.fadeOut(300, 0, 0, 0);
    } else {
      this.rebuildForLevel(nextData);
    }
  }

  public rebuildForLevel(nextLevelData: LevelData): void {
    this.clearLevelObjects();
    this.swarmBuffer.clear();
    this.levelData = nextLevelData;
    this.buildLevel();
  }

  private drawEntanglementBeam(time: number): void {
    if (!this.entanglementGraphics) return;
    this.entanglementGraphics.clear();

    const alpha = this.heroes.find((h) => !h.isBeta);
    const beta = this.heroes.find((h) => h.isBeta);
    if (!alpha || !beta || !alpha.active || !beta.active) return;

    if (this.hookedTetherPylon) {
      this.drawBeamSegment(
        alpha.x,
        alpha.y,
        this.hookedTetherPylon.x,
        this.hookedTetherPylon.y,
        time
      );
      this.drawBeamSegment(
        this.hookedTetherPylon.x,
        this.hookedTetherPylon.y,
        beta.x,
        beta.y,
        time
      );
      this.entanglementGraphics.lineStyle(2.5, 0x00e5ff, 0.9);
      this.entanglementGraphics.strokeCircle(
        this.hookedTetherPylon.x,
        this.hookedTetherPylon.y,
        this.hookedTetherPylon.radius + 4
      );
    } else {
      this.drawBeamSegment(alpha.x, alpha.y, beta.x, beta.y, time);
    }
  }

  private drawBeamSegment(ax: number, ay: number, bx: number, by: number, time: number): void {
    if (!this.entanglementGraphics) return;
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

  private drawTetherPylons(): void {
    if (!this.tetherPylonGraphics || !this.levelData.tetherPylons) return;
    const g = this.tetherPylonGraphics;
    g.clear();
    for (const pylon of this.levelData.tetherPylons) {
      g.fillStyle(0x0f172a, 0.9);
      g.fillCircle(pylon.x, pylon.y, pylon.radius);
      g.lineStyle(2.5, 0x22d3ee, 0.95);
      g.strokeCircle(pylon.x, pylon.y, pylon.radius);
      g.fillStyle(0xec4899, 0.9);
      g.fillCircle(pylon.x, pylon.y, Math.max(4, pylon.radius * 0.35));
    }
  }

  private spawnTetherSweepSparks(
    px: number,
    py: number,
    alpha: { x: number; y: number },
    beta: { x: number; y: number }
  ): void {
    if (!this.add?.circle || !this.tweens?.add) return;
    const targets = [
      { x: alpha.x, y: alpha.y, color: 0x00e5ff },
      { x: beta.x, y: beta.y, color: 0xec4899 }
    ];
    for (const target of targets) {
      for (let i = 0; i < 4; i++) {
        const spark = this.add.circle(px, py, 3, target.color, 0.95);
        spark.setDepth(23);
        this.tweens.add({
          targets: spark,
          x: target.x,
          y: target.y,
          alpha: 0,
          scale: 0.3,
          duration: 180 + i * 35,
          ease: 'Quad.easeOut',
          onComplete: () => spark.destroy()
        });
      }
    }
  }

  public updateEntanglementTether(_time: number): void {
    if (!this.isEntangled) return;
    const alpha = this.heroes.find((h) => !h.isBeta && h.active);
    const beta = this.heroes.find((h) => h.isBeta && h.active);
    if (!alpha || !beta) return;

    const tetherEnabled = this.levelData.entanglement?.tetherPhysical !== false;

    // 1. Magnetic Tether Pylon Pivot & Pulley Constraint
    const pylons = this.levelData.tetherPylons;
    if (pylons && pylons.length > 0) {
      if (!this.hookedTetherPylon) {
        const found = findHookedTetherPylon(alpha, beta, pylons);
        if (found) {
          this.hookedTetherPylon = found;
          gameEvents.emit('tether:pylon_hook', { x: found.x, y: found.y });
        }
      }

      if (this.hookedTetherPylon) {
        const maxLen =
          this.hookedTetherPylon.maxLength ??
          this.levelData.entanglement?.tetherMaxLength ??
          PHYSICS.TETHER_DEFAULT_MAX_LENGTH;
        const betaBody = beta.body as Phaser.Physics.Arcade.Body | null;
        const betaVel = betaBody?.velocity ?? { x: 0, y: 0 };
        const constraint = resolveTetherPylonConstraint(
          alpha,
          beta,
          betaVel,
          this.hookedTetherPylon,
          maxLen
        );
        if (constraint.constrained) {
          beta.x = constraint.betaPos.x;
          beta.y = constraint.betaPos.y;
          if (betaBody) {
            beta.setVelocity(constraint.betaVel.x, constraint.betaVel.y);
          }
        }
      }
    }

    // 2. Lasso Particle Sweep (distToSegment < 22 px)
    if (tetherEnabled && this.particles?.getChildren) {
      for (const child of this.particles.getChildren()) {
        const sprite = child as Phaser.Physics.Arcade.Sprite;
        if (!sprite.active) continue;
        const swept = this.hookedTetherPylon
          ? isParticleSweptByTether(sprite, alpha, this.hookedTetherPylon) ||
            isParticleSweptByTether(sprite, this.hookedTetherPylon, beta)
          : isParticleSweptByTether(sprite, alpha, beta);
        if (swept) {
          const sx = sprite.x;
          const sy = sprite.y;
          const pType = sprite.getData('type') as ParticleType;
          this.collectParticle(alpha, sprite);
          this.spawnTetherSweepSparks(sx, sy, alpha, beta);
          gameEvents.emit('tether:collect', { x: sx, y: sy, type: pType });
        }
      }
    }
  }

  public shatterCrackedPlatform(plat: Phaser.GameObjects.Rectangle): void {
    if (!plat.active) return;
    const body = plat.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) {
      body.checkCollision.none = true;
      body.enable = false;
    }
    plat.setAlpha(0);
    plat.setVisible(false);
    gameEvents.emit('platform:cracked_break', { x: plat.x, y: plat.y });

    if (this.add?.circle && this.tweens?.add) {
      for (let i = 0; i < 6; i++) {
        const shard = this.add.circle(
          plat.x + (i - 2.5) * 10,
          plat.y,
          4,
          0xfbbf24,
          0.95
        );
        shard.setDepth(21);
        this.tweens.add({
          targets: shard,
          x: shard.x + (i - 2.5) * 18,
          y: shard.y + 28 + (i % 2) * 16,
          alpha: 0,
          duration: 240,
          ease: 'Quad.easeOut',
          onComplete: () => shard.destroy()
        });
      }
    }
  }

  public vanishEphemeralPlatform(plat: Phaser.GameObjects.Rectangle): void {
    if (!plat.visible) return;
    const body = plat.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) {
      body.checkCollision.none = true;
      body.enable = false;
    }
    plat.setAlpha(0);
    plat.setVisible(false);
    gameEvents.emit('platform:ephemeral_vanish', { x: plat.x, y: plat.y });
  }

  public restoreEphemeralPlatforms(): number {
    let restoredCount = 0;
    for (const ep of this.ephemeralPlatforms) {
      if (!ep.visible || ep.alpha === 0) {
        restoredCount++;
      }
      ep.setAlpha(1);
      ep.setVisible(true);
      const body = ep.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.checkCollision.none = false;
        body.enable = true;
        body.updateFromGameObject?.();
      }
    }
    if (restoredCount > 0) {
      gameEvents.emit('platform:ephemeral_restore', { count: restoredCount });
    }
    return restoredCount;
  }

  private triggerIronCoreCollapse(): void {
    // Silent 150ms white flash on Iron Core (Z=26) collapse
    this.cameras?.main?.flash?.(150, 255, 255, 255, false);
    if (this.collapseTopSpikes && this.collapseBottomSpikes) {
      const midY = this.levelData.height / 2;
      if (this.tweens?.add) {
        this.tweens.add({
          targets: this.collapseTopSpikes,
          y: midY - 40,
          duration: 140,
          ease: 'Cubic.easeIn'
        });
        this.tweens.add({
          targets: this.collapseBottomSpikes,
          y: midY + 40,
          duration: 140,
          ease: 'Cubic.easeIn'
        });
      }
    }
    gameEvents.emit('wow:iron_collapse', { level: 26 });
  }

  private triggerSupernovaShockwave(): void {
    const hero = this.heroes[0];
    const cx = hero ? hero.x : this.levelData.player.position.x;
    const cy = hero ? hero.y : this.levelData.player.position.y;

    if (this.add?.circle && this.tweens?.add) {
      const ring = this.add.circle(cx, cy, 24, 0x3b82f6, 0.35);
      ring.setStrokeStyle(4, 0xfbbf24, 0.95);
      ring.setDepth(30);
      this.tweens.add({
        targets: ring,
        scaleX: 28,
        scaleY: 28,
        alpha: 0,
        duration: 650,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy()
      });

      // Assemble Level 27 platforms around the hero in real-time
      const platChildren =
        (this.platforms as unknown as { getChildren?: () => Phaser.GameObjects.Rectangle[] })?.getChildren?.() ?? [];
      for (const plat of platChildren) {
        if (!plat) continue;
        plat.setAlpha(0);
        plat.setScale(0.85, 0.85);
        this.tweens.add({
          targets: plat,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 380,
          ease: 'Back.easeOut'
        });
      }
    }
    gameEvents.emit('wow:supernova_shockwave', { level: 27 });
  }

  private renderOganessonConstellation(): void {
    if (!this.add?.graphics) return;
    if (this.constellationGraphics) {
      this.constellationGraphics.destroy();
    }
    const g = this.add.graphics();
    g.setDepth(2);
    g.setScrollFactor(0.5);
    g.setAlpha(0.25);
    this.constellationGraphics = g;

    const scores = useGameStore.getState().scores;
    const colors = [0x00e5ff, 0xfbbf24, 0xec4899, 0x38bdf8, 0xa855f7];
    let colorIdx = 0;

    for (let z = 1; z < 118; z++) {
      const raw = scores[z]?.ghostTrajectory;
      if (!raw) continue;
      const frames = decompressTrajectory(raw);
      if (frames.length < 2) continue;

      g.lineStyle(2, colors[colorIdx % colors.length], 0.85);
      colorIdx++;
      g.beginPath();
      g.moveTo(frames[0].x, frames[0].y);
      for (let i = 1; i < frames.length; i += 2) {
        g.lineTo(frames[i].x, frames[i].y);
      }
      g.strokePath();
    }
  }

  private revealPeriodicTableSilhouette(): void {
    if (this.cameras?.main) {
      const cam = this.cameras.main as unknown as {
        zoomTo?: (zoom: number, duration?: number, ease?: string) => void;
        setZoom: (zoom: number) => void;
      };
      if (typeof cam.zoomTo === 'function') {
        cam.zoomTo(0.35, 1200, 'Sine.easeInOut');
      } else {
        cam.setZoom(0.35);
      }
    }

    if (this.add?.graphics) {
      if (this.periodicTableGraphics) {
        this.periodicTableGraphics.destroy();
      }
      const g = this.add.graphics();
      g.setDepth(3);
      g.setScrollFactor(0.2);
      this.periodicTableGraphics = g;

      const startX = 120;
      const startY = 80;
      const cellW = 28;
      const cellH = 28;
      const gap = 4;

      g.lineStyle(1.5, 0x38bdf8, 0.65);
      g.fillStyle(0x00e5ff, 0.16);

      // 18 columns x 7 rows periodic table silhouette
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 18; col++) {
          const skipRow0 = row === 0 && col > 0 && col < 17;
          const skipRow12 = (row === 1 || row === 2) && col > 1 && col < 12;
          if (skipRow0 || skipRow12) continue;
          const x = startX + col * (cellW + gap);
          const y = startY + row * (cellH + gap);
          g.fillRect(x, y, cellW, cellH);
          g.strokeRect(x, y, cellW, cellH);
        }
      }
    }

    gameEvents.emit('wow:oganesson_constellation', { level: 118 });
  }

  public tryCloneFusion(nowMs = this.time?.now ?? 0): boolean {
    if (this.heroes.length < 2 || this.isEntangled || this.isPauliActive) return false;
    if (this.levelData.allowCloneFusion === false) return false;

    const focused = this.heroes.find((h) => h.isFocused && h.active);
    if (!focused) return false;

    const target = this.heroes.find(
      (h) =>
        h !== focused &&
        h.active &&
        canFuseClones(focused, h, nowMs, {
          isEntangled: this.isEntangled,
          isPauliActive: this.isPauliActive,
          allowCloneFusion: this.levelData.allowCloneFusion
        })
    );
    if (!target) return false;

    const nextStack = Math.min(3, focused.fusionStack + target.fusionStack);
    target.destroy();
    this.heroes = this.heroes.filter((h) => h !== target && h.active);
    focused.setFusionStack(nextStack);
    this.updateEdgePips();
    this.showRetroToast('SUPER-QUANTA !');
    gameEvents.emit('hero:fusion', {
      x: focused.x,
      y: focused.y,
      fusionStack: focused.fusionStack
    });
    return true;
  }

  public tryInFlightFission(): boolean {
    if (this.isEntangled) return false;
    const focused = this.heroes.find((h) => h.isFocused && h.active);
    if (!focused || focused.fusionStack < 2 || !focused.body) return false;

    const touchingGround =
      focused.upsideDown === 1
        ? focused.body.touching.down || focused.body.blocked.down
        : focused.body.touching.up || focused.body.blocked.up;
    if (touchingGround) return false;

    const nowMs = this.time?.now ?? 0;
    const { upperVy, lowerVy } = computeFissionVelocities(focused.upsideDown);

    focused.setFusionStack(focused.fusionStack - 1);
    focused.setVelocityY(upperVy);

    const lowerClone = new Hero(
      this,
      focused.x,
      focused.y + 16 * focused.upsideDown,
      false
    );
    lowerClone.createdAtMs = nowMs;
    lowerClone.velocityMultiplier = focused.velocityMultiplier;
    lowerClone.setGravityInverted(focused.upsideDown === -1);
    lowerClone.pauliGraceUntil = nowMs + 500;
    lowerClone.setTint(0x38bdf8);
    lowerClone.setVelocity(focused.body.velocity.x * 0.5, lowerVy);
    this.heroes.push(lowerClone);
    this.heroGroup.add(lowerClone);

    this.updateEdgePips();
    this.showRetroToast('FISSION !');
    gameEvents.emit('hero:fission', { x: focused.x, y: focused.y });
    return true;
  }

  public updateScreenWrap(time: number): void {
    const wrapAxes = getScreenWrapAxes(this.levelData.screenWrap);
    if (!wrapAxes.horizontal && !wrapAxes.vertical) return;

    const w = this.levelData.width;
    const h = this.levelData.height;

    for (const hero of this.heroes) {
      if (!hero.active) continue;
      const wrapped = applyToroidalScreenWrap(
        { x: hero.x, y: hero.y },
        w,
        h,
        this.levelData.screenWrap
      );
      if (wrapped.wrappedX) {
        hero.x = wrapped.x;
        if (hero.body && 'x' in hero.body) {
          const b = hero.body as Phaser.Physics.Arcade.Body;
          b.x = wrapped.x - (b.width || 0) / 2;
        }
        gameEvents.emit('hero:screen_wrap', { axis: 'x', x: hero.x, y: hero.y });
      }
      if (wrapped.wrappedY) {
        hero.y = wrapped.y;
        if (hero.body && 'y' in hero.body) {
          const b = hero.body as Phaser.Physics.Arcade.Body;
          b.y = wrapped.y - (b.height || 0) / 2;
        }
        gameEvents.emit('hero:screen_wrap', { axis: 'y', x: hero.x, y: hero.y });
      }
    }

    // Spectral border lines (violet/cyan undulating edge)
    if (this.screenWrapGraphics) {
      const g = this.screenWrapGraphics;
      g.clear();
      const pulse = 0.45 + 0.25 * Math.sin(time * 0.006);
      if (wrapAxes.horizontal) {
        g.lineStyle(3, 0xa855f7, pulse);
        g.lineBetween(1.5, 0, 1.5, h);
        g.lineBetween(w - 1.5, 0, w - 1.5, h);
        g.lineStyle(1.5, 0x00e5ff, pulse * 0.9);
        g.lineBetween(4, 0, 4, h);
        g.lineBetween(w - 4, 0, w - 4, h);
      }
      if (wrapAxes.vertical) {
        g.lineStyle(3, 0xa855f7, pulse);
        g.lineBetween(0, 1.5, w, 1.5);
        g.lineBetween(0, h - 1.5, w, h - 1.5);
      }
    }

    // Opposite-edge phantom projection within < 32 px
    if (this.add?.sprite) {
      const ghostCoords: Array<{ pos: { x: number; y: number }; hero: Hero }> = [];
      for (const hero of this.heroes) {
        if (!hero.active) continue;
        const positions = getScreenWrapGhostPositions(
          { x: hero.x, y: hero.y },
          w,
          h,
          this.levelData.screenWrap
        );
        for (const pos of positions) {
          ghostCoords.push({ pos, hero });
        }
      }

      while (this.screenWrapGhosts.length < ghostCoords.length) {
        const ghost = this.add.sprite(0, 0, 'hero');
        ghost.setAlpha(0.55);
        ghost.setTint(0x22d3ee);
        ghost.setDepth(18);
        this.screenWrapGhosts.push(ghost);
      }

      for (let i = 0; i < this.screenWrapGhosts.length; i++) {
        const ghost = this.screenWrapGhosts[i];
        if (i < ghostCoords.length) {
          const { pos, hero } = ghostCoords[i];
          ghost.setVisible(true);
          ghost.setPosition(pos.x, pos.y);
          ghost.setFlipX(hero.flipX);
          ghost.setFlipY(hero.flipY);
          ghost.setScale(hero.scaleX, hero.scaleY);
        } else {
          ghost.setVisible(false);
        }
      }
    }
  }

  private triggerSynthPlatformImpact(
    hero: Hero,
    plat: Phaser.GameObjects.Rectangle,
    isStatic: boolean
  ): void {
    if (!plat.active) return;
    gameEvents.emit('synth:land', { x: hero.x, y: hero.y });

    // 1. Vertical elastic flexion (+3 * hero.upsideDown px, yoyo back in 160 ms Sine.easeOut)
    if (isStatic && plat.getData('kind') !== 'wall') {
      const baseY = (plat.getData('baseY') as number | undefined) ?? plat.y;
      if (!plat.getData('synthTweenActive')) {
        plat.setData('synthTweenActive', true);
        plat.y = baseY;
        this.tweens.add({
          targets: plat,
          y: baseY + 3 * hero.upsideDown,
          duration: 80,
          yoyo: true,
          ease: 'Sine.easeOut',
          onComplete: () => {
            if (plat.active) {
              plat.y = baseY;
              plat.setData('synthTweenActive', false);
            }
          }
        });
      }
    }

    // 2. Specular light wave propagating left and right from impact hero.x in 200 ms
    const halfW = plat.width / 2;
    const leftX = plat.x - halfW;
    const rightX = plat.x + halfW;
    const impactX = Phaser.Math.Clamp(hero.x, leftX, rightX);
    const impactY = hero.upsideDown === 1 ? plat.y - plat.height / 2 : plat.y + plat.height / 2;

    const leftWave = this.add.rectangle(impactX, impactY, 6, 3, 0xffffff, 0.95);
    leftWave.setDepth(14);
    this.tweens.add({
      targets: leftWave,
      x: leftX,
      alpha: 0,
      duration: 200,
      ease: 'Sine.easeOut',
      onComplete: () => leftWave.destroy()
    });

    const rightWave = this.add.rectangle(impactX, impactY, 6, 3, 0xffffff, 0.95);
    rightWave.setDepth(14);
    this.tweens.add({
      targets: rightWave,
      x: rightX,
      alpha: 0,
      duration: 200,
      ease: 'Sine.easeOut',
      onComplete: () => rightWave.destroy()
    });
  }

  public tryCrystallizeBroglieTrail(): boolean {
    const hasCondenseInLevel = this.levelData?.particles?.some((p) => p.type === 'condense');
    if (this.heroes.length <= 1 && !this.hasCondenseAbility && !hasCondenseInLevel) {
      return false;
    }

    const focused = this.heroes.find((h) => h.isFocused && h.active) || this.heroes[0];
    if (!focused || !focused.body) return false;

    const touchingGround =
      focused.upsideDown === 1
        ? focused.body.touching.down || focused.body.blocked.down
        : focused.body.touching.up || focused.body.blocked.up;
    if (touchingGround) return false;

    const points =
      focused.trailPoints.length > 0
        ? focused.trailPoints
        : [{ x: focused.x, y: focused.y }];
    const segments = buildBroglieScaffoldSegments(points, 22 * focused.upsideDown);
    if (segments.length === 0) return false;

    const expiresAtMs = (this.time?.now ?? 0) + PHYSICS.BROGLIE_SCAFFOLD_DURATION_MS;
    for (const seg of segments) {
      const crystalRect = this.add.rectangle(
        seg.x,
        seg.y,
        seg.width,
        seg.height,
        0x00e5ff,
        0.85
      );
      crystalRect.setStrokeStyle(1.5, 0xffffff, 0.95);
      crystalRect.setDepth(16);
      this.physics.add.existing(crystalRect, true);
      this.platforms.add(crystalRect);
      this.broglieCrystals.push({ rect: crystalRect, expiresAtMs });
    }

    gameEvents.emit('hero:broglie_crystallize', {
      count: segments.length,
      durationMs: PHYSICS.BROGLIE_SCAFFOLD_DURATION_MS
    });
    this.showRetroToast('BROGLIE CRYSTAL !');
    return true;
  }

  private updateBroglieCrystals(time: number): void {
    if (this.broglieCrystals.length === 0) return;
    const remaining: Array<{ rect: Phaser.GameObjects.Rectangle; expiresAtMs: number }> = [];
    for (const item of this.broglieCrystals) {
      if (time >= item.expiresAtMs) {
        item.rect.destroy();
      } else {
        const timeLeft = item.expiresAtMs - time;
        if (timeLeft < 500) {
          item.rect.setAlpha(Math.max(0.15, (timeLeft / 500) * 0.85));
        }
        remaining.push(item);
      }
    }
    this.broglieCrystals = remaining;
  }

  private updateMatterStates(time: number, delta: number): void {
    const dt = delta / 1000;

    // Gentle wave undulation on liquid platforms
    for (let i = 0; i < this.liquidPlatforms.length; i++) {
      const lp = this.liquidPlatforms[i];
      if (lp.rect.active) {
        lp.rect.y = lp.startY + Math.sin(time * 0.004 + i) * 1.5;
      }
    }

    for (const hero of this.heroes) {
      if (!hero.active || !hero.body) continue;

      // 1. Liquid immersion buoyancy & dolphin emerge
      if (this.liquidPlatforms.length > 0) {
        let overlappingLiquid: { rect: Phaser.GameObjects.Rectangle; startY: number } | null = null;
        for (const lp of this.liquidPlatforms) {
          if (isHeroOverlappingRect(hero.x, hero.y, lp.rect, true)) {
            overlappingLiquid = lp;
            break;
          }
        }

        if (overlappingLiquid && hero.inLiquid) {
          const nextVy = stepLiquidBuoyancy(hero.body.velocity.y, hero.upsideDown, dt);
          hero.setVelocityY(nextVy);
          hero.isDiving = false;

          const topSurface = overlappingLiquid.rect.y - overlappingLiquid.rect.height / 2;
          const bottomSurface = overlappingLiquid.rect.y + overlappingLiquid.rect.height / 2;
          const emerging =
            hero.upsideDown === 1
              ? nextVy < 0 && hero.y <= topSurface + 8
              : nextVy > 0 && hero.y >= bottomSurface - 8;
          if (emerging) {
            hero.inLiquid = false;
            hero.setVelocityY(getLiquidEmergeVelocity(hero.upsideDown));
            gameEvents.emit('platform:liquid_emerge', { x: hero.x, y: hero.y });
          }
        } else if (!overlappingLiquid && hero.inLiquid) {
          hero.inLiquid = false;
          if (hero.body.velocity.y * hero.upsideDown < 0) {
            hero.setVelocityY(getLiquidEmergeVelocity(hero.upsideDown));
            gameEvents.emit('platform:liquid_emerge', { x: hero.x, y: hero.y });
          }
        }
      }

      // 2. Noble Gas updraft
      if (this.gasPlatforms.length > 0) {
        for (const gp of this.gasPlatforms) {
          if (gp.active && isHeroOverlappingRect(hero.x, hero.y, gp, true)) {
            hero.setVelocityY(stepGasUpdraft(hero.body.velocity.y, dt, hero.upsideDown));
            hero.isDiving = false;
            break;
          }
        }
      }
    }
  }

  private updateQuantumPinning(time: number, delta: number): void {
    if (this.pinnablePlatforms.length === 0) return;

    const prevPinnedId = this.quantumPinningState.pinnedPlatformId;
    let targetPinId: string | null = null;

    if (this.fKey?.isDown) {
      const focused = this.heroes.find((h) => h.isFocused && h.active) || this.heroes[0];
      if (focused) {
        const nearest = findNearestPinnablePlatform(
          focused.x,
          focused.y,
          this.pinnablePlatforms,
          PHYSICS.QUANTUM_PIN_RADIUS
        );
        if (nearest) {
          targetPinId = nearest.id;
        }
      }
    } else if (this.activePinPointerWorld) {
      const underPointer = findPinnablePlatformAtPoint(
        this.activePinPointerWorld.x,
        this.activePinPointerWorld.y,
        this.pinnablePlatforms
      );
      if (underPointer) {
        targetPinId = underPointer.id;
      }
    }

    this.quantumPinningState = stepQuantumPinning(this.quantumPinningState, targetPinId, delta);
    const nextPinnedId = this.quantumPinningState.pinnedPlatformId;

    for (const pp of this.pinnablePlatforms) {
      if (pp.decayState) {
        pp.decayState.decayPaused = pp.id === nextPinnedId;
      }
    }

    if (prevPinnedId !== nextPinnedId) {
      if (nextPinnedId) {
        gameEvents.emit('quantum:pin', {
          platformId: nextPinnedId,
          pinned: true,
          cooldownMs: 0
        });
      } else if (prevPinnedId) {
        gameEvents.emit('quantum:pin', {
          platformId: prevPinnedId,
          pinned: false,
          cooldownMs: this.quantumPinningState.cooldownRemainingMs
        });
      }
    }

    if (this.quantumPinGraphics) {
      const g = this.quantumPinGraphics;
      g.clear();
      if (nextPinnedId) {
        const pinned = this.pinnablePlatforms.find((p) => p.id === nextPinnedId);
        if (pinned) {
          const pulse = 0.7 + 0.25 * Math.sin(time * 0.01);
          g.lineStyle(3, 0xfbbf24, pulse);
          g.strokeRect(
            pinned.x - pinned.width / 2 - 4,
            pinned.y - pinned.height / 2 - 4,
            pinned.width + 8,
            pinned.height + 8
          );
          g.lineStyle(2, 0xfef08a, pulse);
          g.strokeCircle(pinned.x, pinned.y, 12);
          g.fillStyle(0xfbbf24, pulse);
          g.fillCircle(pinned.x, pinned.y, 4);
        }
      }
    }
  }

  private updateWormholes(time: number): void {
    const wormholes = this.levelData?.wormholes;
    if (!wormholes || wormholes.length === 0) return;

    if (this.wormholeGraphics) {
      const g = this.wormholeGraphics;
      g.clear();
      const pulse = 0.65 + 0.25 * Math.sin(time * 0.008);
      for (const wh of wormholes) {
        const colorNum = wh.color
          ? Phaser.Display.Color.HexStringToColor(wh.color).color
          : 0x22d3ee;
        // Inlet ring
        g.lineStyle(3, colorNum, pulse);
        g.strokeCircle(wh.inX, wh.inY, PHYSICS.WORMHOLE_RADIUS);
        g.fillStyle(colorNum, 0.22);
        g.fillCircle(wh.inX, wh.inY, PHYSICS.WORMHOLE_RADIUS * 0.65);

        // Outlet ring + normal direction vector
        g.lineStyle(3, 0xe879f9, pulse);
        g.strokeCircle(wh.outX, wh.outY, PHYSICS.WORMHOLE_RADIUS);
        const outRad = (wh.outNormalAngleDeg * Math.PI) / 180;
        g.lineStyle(2.5, 0xffffff, 0.9);
        g.lineBetween(
          wh.outX,
          wh.outY,
          wh.outX + Math.cos(outRad) * (PHYSICS.WORMHOLE_RADIUS + 10),
          wh.outY + Math.sin(outRad) * (PHYSICS.WORMHOLE_RADIUS + 10)
        );
      }
    }

    for (const hero of this.heroes) {
      if (!hero.active || !hero.body || time < hero.wormholeCooldownUntil) continue;
      for (const wh of wormholes) {
        if (isHeroInWormholeInlet(hero.x, hero.y, wh)) {
          const exit = computeWormholeExit(hero.body.velocity.x, hero.body.velocity.y, wh);
          hero.setPosition(exit.x, exit.y);
          if ('x' in hero.body) {
            const b = hero.body as Phaser.Physics.Arcade.Body;
            b.x = exit.x - (b.width || 0) / 2;
            b.y = exit.y - (b.height || 0) / 2;
          }
          hero.setVelocity(exit.vx, exit.vy);
          hero.isDiving = false;
          hero.wormholeCooldownUntil = time + PHYSICS.WORMHOLE_COOLDOWN_MS;
          gameEvents.emit('hero:wormhole', {
            wormholeId: wh.id,
            outX: exit.x,
            outY: exit.y,
            speed: exit.speed
          });
          break;
        }
      }
    }
  }

  private updateGhostSurfing(isGhostActive: boolean): void {
    if (!isGhostActive || !this.ghostHero || !this.ghostHero.visible || !this.ghostHero.active) {
      return;
    }

    for (const hero of this.heroes) {
      if (!hero.active || !hero.body) continue;
      const surfOk = canGhostSurf(
        {
          x: hero.x,
          y: hero.y,
          vy: hero.body.velocity.y,
          upsideDown: hero.upsideDown,
          hasSurfedThisJump: hero.hasSurfedThisJump
        },
        this.ghostHero
      );
      if (surfOk) {
        hero.setVelocityY(getGhostSurfVelocity(hero.upsideDown));
        hero.hasSurfedThisJump = true;
        hero.isDiving = false;
        gameEvents.emit('hero:ghost_surf', { x: hero.x, y: hero.y });
        if (this.add?.circle && this.tweens?.add) {
          const ring = this.add.circle(hero.x, hero.y + 12 * hero.upsideDown, 10, 0xfbbf24, 0.75);
          ring.setDepth(22);
          this.tweens.add({
            targets: ring,
            scale: 2.6,
            alpha: 0,
            duration: 240,
            ease: 'Sine.easeOut',
            onComplete: () => ring.destroy()
          });
        }
      }
    }
  }

  update(time: number, delta: number): void {
    if (this.isLevelCompleted || this.isTransitioningLevel || this.isRespawning) {
      if (this.isLevelCompleted && this.swarmPlaybackActive && this.swarmGhosts.length > 0) {
        this.swarmPlaybackElapsedMs += delta * this.swarmPlaybackSpeed;
        if (this.swarmPlaybackMaxMs > 0 && this.swarmPlaybackElapsedMs > this.swarmPlaybackMaxMs + 600) {
          this.swarmPlaybackElapsedMs = 0;
        }
        for (const sg of this.swarmGhosts) {
          sg.updateReplay(this.swarmPlaybackElapsedMs);
        }
      }
      if (this.quantumEffects) {
        this.quantumEffects.update(
          time,
          delta,
          this.heroes,
          this.portalSprite,
          this.isTimeDilationActive
        );
      }
      return;
    }

    if (!this.timerStarted) {
      this.startTime = time;
      this.dilatedElapsedMs = 0;
      this.timerStarted = true;
      if (this.ghostHero) {
        this.ghostHero.updateReplay(0);
      }
    }

    // Time Dilation & Focus Micro-Bullet-Time active check
    if (this.isTimeDilationActive && time >= this.timeDilationUntil) {
      this.isTimeDilationActive = false;
      gameEvents.emit('time:dilation', { active: false, durationMs: 0 });
    }
    const isFocusBulletTime = time < this.focusBulletTimeUntil;
    const timeDilationFactor = isFocusBulletTime ? 0.2 : this.isTimeDilationActive ? 0.25 : 1.0;
    if (this.physics?.world) {
      this.physics.world.timeScale = isFocusBulletTime ? 5.0 : 1.0;
    }

    this.dilatedElapsedMs += delta * timeDilationFactor;
    const elapsedMs = Math.max(0, time - this.startTime);

    // Update timer (slowed during time dilation)
    if (this.timerText) {
      const nextTimerStr = formatScore(this.dilatedElapsedMs);
      if (nextTimerStr !== this.lastTimerString) {
        this.lastTimerString = nextTimerStr;
        this.timerText.setText(nextTimerStr);
      }
      const nextTimerColor = this.isTimeDilationActive ? '#22d3ee' : '#ffffff';
      if (nextTimerColor !== this.lastTimerColor) {
        this.lastTimerColor = nextTimerColor;
        this.timerText.setColor(nextTimerColor);
      }
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
    } else {
      const lookHero = this.heroes.find((h) => h.isFocused) || this.heroes[0];
      if (lookHero?.active && lookHero.body) {
        const targetOffset = computeLookAheadOffset(
          lookHero.body.velocity.x,
          lookHero.body.velocity.y
        );
        const lerpFactor = 1 - Math.exp(-8 * (delta / 1000));
        this.cameras.main.followOffset.x = Phaser.Math.Linear(
          this.cameras.main.followOffset.x,
          targetOffset.x,
          lerpFactor
        );
        this.cameras.main.followOffset.y = Phaser.Math.Linear(
          this.cameras.main.followOffset.y,
          targetOffset.y,
          lerpFactor
        );
      }
    }

    // Entanglement boundary check, physical tether & laser beam
    const wrapAxes = getScreenWrapAxes(this.levelData.screenWrap);
    if (this.isEntangled) {
      for (const h of this.heroes) {
        if (h.active && !h.enteredPortal) {
          const outY = !wrapAxes.vertical && (h.y > this.levelData.height + 60 || h.y < -60);
          const outX = !wrapAxes.horizontal && (h.x < -60 || h.x > this.levelData.width + 60);
          if (outY || outX) {
            this.killHero(h);
            return;
          }
        }
      }
      this.updateEntanglementTether(time);
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
    if (currentGhostMode === 'swarm' && this.swarmGhosts.length > 0) {
      for (const sg of this.swarmGhosts) {
        sg.updateReplay(elapsedMs);
      }
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

      if (
        this.splitDeltaText &&
        this.ghostFrames.length > 0 &&
        isGhostActive &&
        time - this.lastSplitUpdateMs >= 100
      ) {
        this.lastSplitUpdateMs = time;
        const deltaSec = calculateSplitDelta(
          this.ghostFrames,
          focusedHero.x,
          focusedHero.y,
          elapsedMs
        );
        const { text, color } = formatSplitDelta(deltaSec);
        if (text !== this.lastSplitString) {
          this.lastSplitString = text;
          this.splitDeltaText.setText(text);
        }
        if (color !== this.lastSplitColor) {
          this.lastSplitColor = color;
          this.splitDeltaText.setColor(color);
        }
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

    // Update Floating Thumb-Ribbon visual feedback
    if (this.thumbRibbonGraphics) {
      this.thumbRibbonGraphics.clear();
      if (this.touchController.isPointerDown && !useGameStore.getState().reducedEffects) {
        const ax = this.touchController.anchorX;
        const ay = this.touchController.anchorY;
        const px = this.touchController.pointerX;
        const py = this.touchController.pointerY;
        this.thumbRibbonGraphics.lineStyle(2, 0x00e5ff, 0.22);
        this.thumbRibbonGraphics.beginPath();
        this.thumbRibbonGraphics.moveTo(ax, ay);
        this.thumbRibbonGraphics.lineTo(px, py);
        this.thumbRibbonGraphics.strokePath();
        this.thumbRibbonGraphics.fillStyle(0x00e5ff, 0.22);
        this.thumbRibbonGraphics.fillCircle(ax, ay, 4);
        this.thumbRibbonGraphics.strokeCircle(px, py, 7);
      }
    }

    // Update heroes
    for (const hero of [...this.heroes]) {
      if (hero.active) {
        hero.updateControl(this.cursors, this.wasd, this.touchController.state, delta);
        // Restart if hero falls out through the bottom (or top when gravity is inverted)
        if (
          !wrapAxes.vertical &&
          (hero.y > this.levelData.height + 20 || (hero.upsideDown === -1 && hero.y < -10))
        ) {
          if (hero.isFocused || this.heroes.length <= 1) {
            gameEvents.emit('hero:death', { remaining: 0, entangledCollapse: this.isEntangled });
            this.quickRespawn({ x: hero.x, y: hero.y });
            return;
          }
          this.killHero(hero);
        }
      }
    }
    this.touchController.consumeFrameFlags();

    this.updateMatterStates(time, delta);
    this.updateQuantumPinning(time, delta);
    this.updateWormholes(time);
    this.updateBroglieCrystals(time);
    this.updateGhostSurfing(isGhostActive);

    if (this.levelData.screenWrap) {
      this.updateScreenWrap(time);
    }

    if (this.heroes.length >= 2 && !this.isEntangled && !this.isPauliActive) {
      this.tryCloneFusion(time);
    }

    if (this.fusionHaloGraphics) {
      this.fusionHaloGraphics.clear();
      const pulse = 0.55 + 0.25 * Math.sin(time * 0.008);
      for (const hero of this.heroes) {
        if (hero.active && hero.fusionStack >= 2) {
          this.fusionHaloGraphics.lineStyle(3, 0xfbbf24, pulse);
          this.fusionHaloGraphics.strokeCircle(hero.x, hero.y, 28);
          this.fusionHaloGraphics.lineStyle(1.5, 0x00e5ff, pulse * 0.9);
          this.fusionHaloGraphics.strokeCircle(hero.x, hero.y, 33);
        }
      }
    }

    // Render cyan vertical dive trail for diving heroes
    if (this.diveTrailGraphics) {
      this.diveTrailGraphics.clear();
      const isReduced = useGameStore.getState().reducedEffects;
      for (const hero of this.heroes) {
        if (hero.active && hero.isDiving) {
          const trailLen = isReduced ? 28 : 48;
          const tailY = hero.y - trailLen * hero.upsideDown;
          this.diveTrailGraphics.lineStyle(isReduced ? 2 : 4, 0x00e5ff, 0.75);
          this.diveTrailGraphics.beginPath();
          this.diveTrailGraphics.moveTo(hero.x, hero.y);
          this.diveTrailGraphics.lineTo(hero.x, tailY);
          this.diveTrailGraphics.strokePath();
          if (!isReduced) {
            this.diveTrailGraphics.lineStyle(1.5, 0xffffff, 0.85);
            this.diveTrailGraphics.beginPath();
            this.diveTrailGraphics.moveTo(hero.x, hero.y);
            this.diveTrailGraphics.lineTo(hero.x, hero.y - 26 * hero.upsideDown);
            this.diveTrailGraphics.strokePath();
          }
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
          if (isHeroOnPressurePlate(h.x, h.y, pl)) {
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
            gameEvents.emit('plate:trigger', { plateId: pl.id, gateId: pl.targetGateId });

            // If hero stepping on plate is focused (or autoSwitchOnTrigger is set) and there are multiple heroes, switch focus to another hero
            if ((triggeringHero?.isFocused || pl.autoSwitchOnTrigger) && this.heroes.length > 1) {
              const otherHero = this.heroes.find((hero) => hero !== triggeringHero && hero.active);
              if (otherHero) {
                triggeringHero?.setFocus(false);
                otherHero.setFocus(true);
                this.cameras.main.startFollow(otherHero, true, 0.1, 0.1);
                this.updateEdgePips();
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

    // WOW #1: Entanglement reveal zoom-out when Alpha reaches revealAtX
    const revealAtX = this.levelData.entanglement?.revealAtX;
    if (this.isEntangled && revealAtX !== undefined && !this.entanglementRevealed) {
      const alphaHero = this.heroes.find((h) => !h.isBeta && h.active);
      if (alphaHero && alphaHero.x >= revealAtX) {
        this.entanglementRevealed = true;
        const cam = this.cameras?.main as unknown as {
          zoomTo?: (zoom: number, duration?: number, ease?: string) => void;
          setZoom?: (zoom: number) => void;
          centerOn?: (x: number, y: number) => void;
          stopFollow?: () => void;
        };
        if (typeof cam?.zoomTo === 'function') {
          cam.zoomTo(0.45, 900, 'Sine.easeInOut');
        } else {
          cam?.setZoom?.(0.45);
        }
        if (this.betaHero) {
          cam?.stopFollow?.();
          cam?.centerOn?.((alphaHero.x + this.betaHero.x) / 2, (alphaHero.y + this.betaHero.y) / 2);
        }
        gameEvents.emit('entanglement:reveal', { revealAtX });
        this.showRetroToast('ENTANGLEMENT REVEALED !');
      }
    }

    // Quantum Tunneling check (platforms + screen frame edges)
    for (const hero of this.heroes) {
      if (hero.active && hero.tunnelCharges > 0 && hero.body) {
        const rawLeft =
          (this.cursors?.left?.isDown ?? false) ||
          (this.wasd?.A?.isDown ?? false) ||
          this.touchController.state.left;
        const rawRight =
          (this.cursors?.right?.isDown ?? false) ||
          (this.wasd?.D?.isDown ?? false) ||
          this.touchController.state.right;
        const dir = rawLeft ? 'left' : rawRight ? 'right' : null;
        if (dir) {
          let tunneled = false;
          for (const p of this.levelData.platforms) {
            const result = checkTunnelObstacle(hero.x, hero.y, 40, 40, dir, p);
            if (result?.canTunnel) {
              hero.x = result.exitX;
              hero.body.x = hero.x - hero.body.width / 2;
              hero.tunnelCharges--;
              gameEvents.emit('tunnel:use', { remaining: hero.tunnelCharges });
              this.showRetroToast(`TUNNELING ! (${hero.tunnelCharges} LEFT)`);
              tunneled = true;
              break;
            }
          }
          if (!tunneled) {
            const edgeResult = checkTunnelObstacle(
              hero.x,
              hero.y,
              40,
              40,
              dir,
              null,
              this.levelData.width
            );
            if (edgeResult?.canTunnel) {
              hero.x = edgeResult.exitX;
              hero.body.x = hero.x - hero.body.width / 2;
              hero.tunnelCharges--;
              gameEvents.emit('tunnel:use', { remaining: hero.tunnelCharges, screenEdge: true });
              this.showRetroToast(`FRAME TUNNELING ! (${hero.tunnelCharges} LEFT)`);
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
        body.setVelocityX(PHYSICS.MOVING_PLATFORM_SPEED_X * timeDilationFactor);
        if (mp.rect.x >= maxX) {
          mp.direction.x = 'left';
        }
      } else if (mp.direction.x === 'left') {
        body.setVelocityX(-PHYSICS.MOVING_PLATFORM_SPEED_X * timeDilationFactor);
        if (mp.rect.x <= minX) {
          mp.direction.x = 'right';
        }
      }

      if (mp.direction.y === 'bottom') {
        body.setVelocityY(PHYSICS.MOVING_PLATFORM_SPEED_Y * timeDilationFactor);
        if (mp.rect.y >= maxY) {
          mp.direction.y = 'top';
        }
      } else if (mp.direction.y === 'top') {
        body.setVelocityY(-PHYSICS.MOVING_PLATFORM_SPEED_Y * timeDilationFactor);
        if (mp.rect.y <= minY) {
          mp.direction.y = 'bottom';
        }
      }
    }

    // Update Bohr orbital background
    this.bohrBackground?.update(time, delta);

    // Update ambient molecules
    for (const mol of this.molecules) {
      mol.circle.x += mol.vx;
      mol.circle.y += mol.vy;
      if (mol.circle.x < 0) mol.circle.x = this.levelData.width;
      if (mol.circle.x > this.levelData.width) mol.circle.x = 0;
      if (mol.circle.y < 0) mol.circle.y = this.levelData.height;
      if (mol.circle.y > this.levelData.height) mol.circle.y = 0;
    }

    this.updateAntigravityBubbles(time);
  }

  public updateAntigravityBubbles(nowMs: number): void {
    for (let i = this.antigravityBubbles.length - 1; i >= 0; i--) {
      const bubble = this.antigravityBubbles[i];
      if (nowMs >= bubble.expiresAtMs) {
        bubble.graphic.destroy();
        this.antigravityBubbles.splice(i, 1);
        continue;
      }
      for (const hero of this.heroes) {
        if (!hero.active || hero.enteredPortal) continue;
        const dist = Math.hypot(hero.x - bubble.x, hero.y - bubble.y);
        if (dist <= bubble.radius + 16) {
          hero.levitateUntilMs = nowMs + 2000;
        }
      }
    }

    for (const hero of this.heroes) {
      if (!hero.active || hero.enteredPortal) continue;
      if (nowMs < hero.levitateUntilMs) {
        hero.setVelocityY(-180);
      }
    }
  }
}
