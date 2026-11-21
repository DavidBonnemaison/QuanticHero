import Phaser from 'phaser';
import { soundManager } from '../audio/SoundManager';
import { getChronoLoopLevelById } from '../data/chronoLoopLevels';
import { getCachedLevel, preloadLevel } from '../data/levels';
import { getMoleculeById } from '../data/molecules';
import { getSchrodingerLevelById } from '../data/schrodingerLevels';
import type { BohrBackgroundRenderer } from '../effects/BohrBackgroundRenderer';
import type { QuantumEffectsManager } from '../effects/QuantumEffectsManager';
import { assembleCampaignLevel, assemblePacedLevel } from '../generator/chunkAssembler';
import { MobileTouchController } from '../input/MobileTouchController';
import { CoherenceSystem } from '../mechanics/coherenceSystem';
import { getScreenWrapAxes } from '../physics/entanglementTether';
import {
  type QuantumPinningState,
  createQuantumPinningState,
  findPinnablePlatformAtPoint
} from '../physics/matterStates';
import {
  type AggregatedMutationModifiers,
  DEFAULT_MUTATION_MODIFIERS
} from '../roguelite/mutations';
import { SessionSwarmBuffer } from '../services/GhostManager';
import { useGameStore } from '../store';
import { type GhostFrame, GhostRecorder } from '../tools/GhostRecorder';
import { hapticFeedback } from '../tools/HapticFeedback';
import { gameEvents } from '../tools/gameEvents';
import { decodeLevelFromUrl } from '../tools/levelCodec';
import type {
  CoherenceTier,
  CollapseConfig,
  IsotopeMedal,
  LevelData,
  PlatformPhase,
  TetherPylon
} from '../types';
import type { GhostHero } from './GhostHero';
import type Hero from './Hero';
import { CameraDirector } from './systems/CameraDirector';
import { GhostController } from './systems/GhostController';
import { HudController } from './systems/HudController';
import { LevelBuilder } from './systems/LevelBuilder';
import { QuantumSystems } from './systems/QuantumSystems';
import { RespawnTransitionController } from './systems/RespawnTransitionController';
import { TimeLoopSystem } from './systems/TimeLoopSystem';
import type {
  ActiveObserverFlash,
  AntigravityBubble,
  BroglieCrystal,
  BubbleHarvestHit,
  DecayPlatformEntry,
  EdgePip,
  GameSceneContext,
  GateEntry,
  LiquidPlatformEntry,
  MoleculeParticle,
  MovingPlatform,
  PhasePlatformEntry,
  PinnablePlatformEntry,
  PressurePlateEntry,
  SuperposedPlatformEntry,
  SuperposedSpikeEntry
} from './systems/types';

export type { Gate, PressurePlate } from './systems/types';

export default class GameScene extends Phaser.Scene implements GameSceneContext {
  public levelData!: LevelData;
  public portalSprite!: Phaser.Physics.Arcade.Sprite;
  public heroes: Hero[] = [];
  public heroGroup!: Phaser.Physics.Arcade.Group;
  public platforms!: Phaser.Physics.Arcade.StaticGroup;
  public gatesGroup!: Phaser.Physics.Arcade.StaticGroup;
  public gatesMap: Map<string, GateEntry> = new Map();
  public pressurePlatesList: PressurePlateEntry[] = [];
  public movingPlatformsGroup!: Phaser.Physics.Arcade.Group;
  public sceneBounds!: Phaser.Physics.Arcade.StaticGroup;
  public spikes!: Phaser.Physics.Arcade.StaticGroup;
  public particles!: Phaser.Physics.Arcade.Group;
  public ghostHero: GhostHero | null = null;
  public isEntangled = false;
  public betaHero: Hero | null = null;
  public betaPortalSprite: Phaser.Physics.Arcade.Sprite | null = null;

  public hasAnyGhost = false;
  public authorTrajectory?: string;
  public personalTrajectory?: string;

  public isPauliActive = false;
  public isTimeDilationActive = false;
  public timeDilationUntil = 0;
  public currentPhase: PlatformPhase = 'cyan';
  public hasPhasePlatforms = false;
  public hudContainer: Phaser.GameObjects.Container | null = null;

  public phasePlatforms: PhasePlatformEntry[] = [];
  public decayPlatforms: DecayPlatformEntry[] = [];
  public collapseTopSpikes: Phaser.GameObjects.Rectangle | null = null;
  public collapseBottomSpikes: Phaser.GameObjects.Rectangle | null = null;
  public collapseConfig?: CollapseConfig;
  public pauliGraphics: Phaser.GameObjects.Graphics | null = null;
  public spikeGfx: Phaser.GameObjects.Graphics | null = null;
  public unsubJump: (() => void) | null = null;
  public unsubHudStore: (() => void) | null = null;

  public entanglementGraphics: Phaser.GameObjects.Graphics | null = null;
  public alphaEnteredPortal = false;
  public betaEnteredPortal = false;
  public ghostRecorder: GhostRecorder = new GhostRecorder();
  public ghostFrames: GhostFrame[] = [];
  public swarmBuffer: SessionSwarmBuffer = new SessionSwarmBuffer();
  public swarmGhosts: GhostHero[] = [];
  public swarmPlaybackActive = false;
  public swarmPlaybackElapsedMs = 0;
  public swarmPlaybackSpeed = 2;
  public swarmPlaybackMaxMs = 0;
  public jumpCount = 0;
  public switchCount = 0;
  public splitDeltaText: Phaser.GameObjects.Text | null = null;
  public duelBadgeText: Phaser.GameObjects.Text | null = null;
  public ghostButton: Phaser.GameObjects.Text | null = null;
  public movingPlatforms: MovingPlatform[] = [];
  public molecules: MoleculeParticle[] = [];
  public bohrBackground: BohrBackgroundRenderer | null = null;
  public muralObjects: Phaser.GameObjects.GameObject[] = [];
  public discoveryBoxObjects: Phaser.GameObjects.GameObject[] = [];
  public cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  public wasd: { [key: string]: Phaser.Input.Keyboard.Key } | null = null;
  public touchController: MobileTouchController = new MobileTouchController();
  public uiPointerConsumed = false;
  public thumbRibbonGraphics: Phaser.GameObjects.Graphics | null = null;
  public diveTrailGraphics: Phaser.GameObjects.Graphics | null = null;
  public focusArcGraphics: Phaser.GameObjects.Graphics | null = null;
  public focusBulletTimeUntil = 0;
  public edgePips: EdgePip[] = [];
  public startTime = 0;
  public dilatedElapsedMs = 0;
  public timerStarted = false;
  public timerText!: Phaser.GameObjects.Text;
  public hudBarGraphics: Phaser.GameObjects.Graphics | null = null;
  public thumbRestartBg: Phaser.GameObjects.Rectangle | null = null;
  public thumbRestartLabel: Phaser.GameObjects.Text | null = null;
  public thumbRestartZone: Phaser.GameObjects.Zone | null = null;
  public condenseButtonBg: Phaser.GameObjects.Rectangle | null = null;
  public condenseButtonLabel: Phaser.GameObjects.Text | null = null;
  public condenseButtonZone: Phaser.GameObjects.Zone | null = null;
  public loopButtonBg: Phaser.GameObjects.Rectangle | null = null;
  public loopButtonLabel: Phaser.GameObjects.Text | null = null;
  public loopButtonZone: Phaser.GameObjects.Zone | null = null;
  public observeButtonBg: Phaser.GameObjects.Rectangle | null = null;
  public observeButtonLabel: Phaser.GameObjects.Text | null = null;
  public observeButtonZone: Phaser.GameObjects.Zone | null = null;
  public timeLoopIndicatorText: Phaser.GameObjects.Text | null = null;
  public superposedPlatforms: SuperposedPlatformEntry[] = [];
  public superposedSpikes: SuperposedSpikeEntry[] = [];
  public wavefunctionGraphics: Phaser.GameObjects.Graphics | null = null;
  public observerBeamGraphics: Phaser.GameObjects.Graphics | null = null;
  public activeObserverFlash: ActiveObserverFlash | null = null;
  public betaPipCamera: Phaser.Cameras.Scene2D.Camera | null = null;
  public betaPipFrame: Phaser.GameObjects.Rectangle | null = null;
  public betaPipLabel: Phaser.GameObjects.Text | null = null;
  public lastTimerString = '';
  public lastTimerColor = '';
  public lastSplitString = '';
  public lastSplitColor = '';
  public lastSplitUpdateMs = 0;
  public phaseIndicatorText: Phaser.GameObjects.Text | null = null;
  public dilationIndicatorText: Phaser.GameObjects.Text | null = null;
  public readonly coherenceSystem: CoherenceSystem = new CoherenceSystem();
  public coherenceBarGraphics: Phaser.GameObjects.Graphics | null = null;
  public coherenceTierText: Phaser.GameObjects.Text | null = null;
  public lastCoherenceValue = -1;
  public lastCoherenceTier: CoherenceTier = 'x1';
  public isLevelCompleted = false;
  public isRespawning = false;
  public isTransitioningLevel = false;
  public canAdvanceLevel = false;
  public nextLevelNumberPending: number | null = null;
  public lastShownLevelId: string | null = null;
  public deathEchoes: Phaser.GameObjects.Sprite[] = [];
  public levelCompleteOverlay: Phaser.GameObjects.Container | null = null;
  public quantumEffects: QuantumEffectsManager | null = null;
  public crackedPlatforms: Phaser.GameObjects.Rectangle[] = [];
  public hookedTetherPylon: TetherPylon | null = null;
  public tetherPylonGraphics: Phaser.GameObjects.Graphics | null = null;
  public screenWrapGraphics: Phaser.GameObjects.Graphics | null = null;
  public screenWrapGhosts: Phaser.GameObjects.Sprite[] = [];
  public fusionHaloGraphics: Phaser.GameObjects.Graphics | null = null;
  public liquidPlatforms: LiquidPlatformEntry[] = [];
  public gasPlatforms: Phaser.GameObjects.Rectangle[] = [];
  public pinnablePlatforms: PinnablePlatformEntry[] = [];
  public quantumPinningState: QuantumPinningState = createQuantumPinningState();
  public quantumPinGraphics: Phaser.GameObjects.Graphics | null = null;
  public wormholeGraphics: Phaser.GameObjects.Graphics | null = null;
  public broglieCrystals: BroglieCrystal[] = [];
  public hasCondenseAbility = false;
  public fKey: Phaser.Input.Keyboard.Key | null = null;
  public activePinPointerWorld: { x: number; y: number } | null = null;
  public activePinPointerId: number | null = null;
  public alphaArrivalTimeMs: number | null = null;
  public betaArrivalTimeMs: number | null = null;
  public bubbleHarvestHits: BubbleHarvestHit[] = [];
  public antigravityBubbles: AntigravityBubble[] = [];
  public ephemeralPlatforms: Phaser.GameObjects.Rectangle[] = [];
  public entanglementRevealed = false;
  public constellationGraphics: Phaser.GameObjects.Graphics | null = null;
  public periodicTableGraphics: Phaser.GameObjects.Graphics | null = null;
  public previousCompletedLevelId: number | null = null;
  public acceleratorMode = false;
  public acceleratorModifiers: AggregatedMutationModifiers = DEFAULT_MUTATION_MODIFIERS;
  public acceleratorShieldCharges = 0;
  public acceleratorTunnelTimerMs = 0;
  public acceleratorReflexCooldownUntil = 0;
  public acceleratorReflexDilationUntil = 0;

  public readonly levelBuilder: LevelBuilder;
  public readonly hudController: HudController;
  public readonly ghostController: GhostController;
  public readonly quantumSystems: QuantumSystems;
  public readonly cameraDirector: CameraDirector;
  public readonly respawnTransitionController: RespawnTransitionController;
  public readonly timeLoopSystem: TimeLoopSystem;

  constructor() {
    super('Game');
    this.levelBuilder = new LevelBuilder(this);
    this.hudController = new HudController(this);
    this.ghostController = new GhostController(this);
    this.quantumSystems = new QuantumSystems(this);
    this.cameraDirector = new CameraDirector(this, this.hudController);
    this.respawnTransitionController = new RespawnTransitionController(this);
    this.timeLoopSystem = new TimeLoopSystem(this);
  }

  init(): void {
    this.isLevelCompleted = false;
    this.isRespawning = false;
    this.isTransitioningLevel = false;
    this.canAdvanceLevel = false;
    this.nextLevelNumberPending = null;
    this.ephemeralPlatforms = [];
    this.entanglementRevealed = false;
    this.coherenceSystem.reset(false);
    this.lastCoherenceValue = -1;
    this.lastCoherenceTier = 'x1';
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

    if (!store.sharedLevel && typeof window !== 'undefined') {
      const chronoMatch = /\/game\/chrono\/([^/?#]+)/i.exec(window.location.pathname);
      if (chronoMatch) {
        const entry = getChronoLoopLevelById(chronoMatch[1]);
        if (entry) {
          store.setSharedLevel(entry.levelData);
        }
      }
      const schrodingerMatch = /\/game\/schrodinger\/([^/?#]+)/i.exec(window.location.pathname);
      if (schrodingerMatch) {
        const entry = getSchrodingerLevelById(schrodingerMatch[1]);
        if (entry) {
          store.setSharedLevel(entry.levelData);
        }
      }
      const molMatch = /\/game\/molecule\/([^/?#]+)/i.exec(window.location.pathname);
      if (molMatch) {
        const recipe = getMoleculeById(molMatch[1]);
        if (recipe) {
          store.setSharedLevel(recipe.levelData);
        }
      }
    }

    if (!store.sharedLevel && !store.activeDuel && typeof window !== 'undefined') {
      const hashOrSearch = window.location.hash || window.location.search;
      if (
        hashOrSearch &&
        !hashOrSearch.includes('duel=') &&
        (hashOrSearch.includes('custom=') || hashOrSearch.length > 20)
      ) {
        const decoded = decodeLevelFromUrl(hashOrSearch);
        if (decoded) {
          store.setSharedLevel(decoded);
        }
      }
    }

    if (store.sharedLevel) {
      this.levelData = store.sharedLevel;
      this.acceleratorMode = /^accelerator-/i.test(String(this.levelData.id ?? ''));
      if (!this.acceleratorMode) {
        this.acceleratorModifiers = DEFAULT_MUTATION_MODIFIERS;
      }
      return;
    }

    this.acceleratorMode = false;
    this.acceleratorModifiers = DEFAULT_MUTATION_MODIFIERS;

    const currentLevel = store.currentLevel || 1;
    const selected = this.resolveLevelData(currentLevel);
    this.levelData = selected || (getCachedLevel(1) as LevelData);
    if (!selected) {
      store.updateCurrentLevel(1);
    }
    preloadLevel(currentLevel + 1);
  }

  public resolveLevelData(levelNumber: number): LevelData | undefined {
    const store = useGameStore.getState();
    const levelKey = `level${levelNumber}`;
    return store.customLevels?.[levelKey] || getCachedLevel(levelKey);
  }

  create(): void {
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

      this.input.keyboard
        .addKey(Phaser.Input.Keyboard.KeyCodes.X)
        .on('down', () => this.tryInFlightFission());
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E).on('down', () => {
        if (
          !this.isLevelCompleted &&
          !this.isTransitioningLevel &&
          this.quantumSystems.hasWavefunctionMechanics()
        ) {
          this.triggerActiveObservation();
        } else {
          this.cycleFocusNext();
        }
      });
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT).on('down', () => {
        if (
          !this.isLevelCompleted &&
          !this.isTransitioningLevel &&
          this.quantumSystems.hasWavefunctionMechanics()
        ) {
          this.triggerActiveObservation();
        }
      });
      this.input.keyboard
        .addKey(Phaser.Input.Keyboard.KeyCodes.ONE)
        .on('down', () => this.switchFocusByIndex(0));
      this.input.keyboard
        .addKey(Phaser.Input.Keyboard.KeyCodes.TWO)
        .on('down', () => this.switchFocusByIndex(1));
      this.input.keyboard
        .addKey(Phaser.Input.Keyboard.KeyCodes.THREE)
        .on('down', () => this.switchFocusByIndex(2));

      this.input.keyboard
        .addKey(Phaser.Input.Keyboard.KeyCodes.R)
        .on('down', (_key: Phaser.Input.Keyboard.Key, event?: KeyboardEvent) => {
          if (!this.isLevelCompleted && !this.isTransitioningLevel) {
            if (this.timeLoopSystem.isActive() && !event?.shiftKey) {
              this.triggerTimeLoopRewind();
            } else {
              this.quickRespawn();
            }
          }
        });

      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => {
        if (this.isLevelCompleted && this.canAdvanceLevel) {
          this.advanceToNextLevel();
        } else if (!this.isLevelCompleted && !this.isTransitioningLevel) {
          if (!this.tryInFlightFission() && this.hasCondenseAbility) {
            this.tryCrystallizeBroglieTrail();
          }
        }
      });

      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', () => {
        if (this.isLevelCompleted && this.canAdvanceLevel) {
          this.advanceToNextLevel();
        }
      });

      this.fKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q).on('down', () => {
        if (!this.isLevelCompleted && !this.isTransitioningLevel) {
          this.togglePhasePlatforms();
        }
      });
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C).on('down', () => {
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

    soundManager.init();
    hapticFeedback.init();
    this.coherenceSystem.attach();

    this.scale?.on?.('resize', this.handleResize, this);

    const cleanupScene = () => {
      this.scale?.off?.('resize', this.handleResize, this);
      this.coherenceSystem.detach();
      soundManager.stopBgm();
      this.clearLevelObjects();
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanupScene);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanupScene);

    this.buildLevel();
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
        if (this.canAdvanceLevel && !useGameStore.getState().activeDuel) {
          this.advanceToNextLevel();
        }
        return;
      }
      if (pointer.y <= 54) return;

      const worldPt = this.getPointerWorldCoords(pointer);
      if (this.quantumSystems.hasSuperposedObjectAtPoint(worldPt.x, worldPt.y)) {
        this.triggerActiveObservation(worldPt);
      }
      const touchedPinnable = Boolean(
        findPinnablePlatformAtPoint(worldPt.x, worldPt.y, this.pinnablePlatforms)
      );

      if (
        this.touchController.isPointerDown &&
        this.touchController.activePointerId !== null &&
        this.touchController.activePointerId !== pointer.id
      ) {
        if (touchedPinnable) {
          this.activePinPointerWorld = worldPt;
          this.activePinPointerId = pointer.id;
        } else {
          this.tryCrystallizeBroglieTrail();
        }
        return;
      }

      if (touchedPinnable) {
        this.activePinPointerWorld = worldPt;
        this.activePinPointerId = pointer.id;
      }

      const { doubleTap } = this.touchController.onPointerDown(
        pointer.x,
        pointer.y,
        this.time.now,
        pointer.id
      );
      if (doubleTap) {
        if (this.tryInFlightFission()) return;
        if (this.hasCondenseAbility && this.tryCrystallizeBroglieTrail()) return;
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
      if (
        pointer.isDown &&
        (this.activePinPointerId === null || this.activePinPointerId === pointer.id)
      ) {
        if (findPinnablePlatformAtPoint(worldPt.x, worldPt.y, this.pinnablePlatforms)) {
          this.activePinPointerWorld = worldPt;
          this.activePinPointerId = pointer.id;
        } else if (this.activePinPointerId === pointer.id) {
          this.activePinPointerWorld = null;
          this.activePinPointerId = null;
        }
      }
      if (
        !this.touchController.isPointerDown ||
        (this.touchController.activePointerId !== null &&
          this.touchController.activePointerId !== pointer.id)
      ) {
        return;
      }
      const focused = this.heroes.find((h) => h.isFocused) || this.heroes[0];
      const touchingGround = focused?.body
        ? focused.upsideDown === 1
          ? focused.body.touching.down || focused.body.blocked.down
          : focused.body.touching.up || focused.body.blocked.up
        : false;
      this.touchController.onPointerMove(
        pointer.x,
        pointer.y,
        this.time.now,
        touchingGround,
        pointer.id,
        focused?.upsideDown ?? 1
      );
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.activePinPointerId === null || this.activePinPointerId === pointer.id) {
        this.activePinPointerWorld = null;
        this.activePinPointerId = null;
      }
      if (
        this.touchController.activePointerId === null ||
        this.touchController.activePointerId === pointer.id
      ) {
        this.touchController.onPointerUp(pointer.id);
      }
    });
  }

  // --- LevelBuilder delegations ---
  public buildLevel(): void {
    this.coherenceSystem.reset(true);
    this.levelBuilder.buildLevel();
  }
  public spawnHeroes(): void {
    this.levelBuilder.spawnHeroes();
  }
  public clearLevelObjects(): void {
    this.levelBuilder.clearLevelObjects();
  }
  public renderSafeDiscoveryBox(): void {
    this.levelBuilder.renderSafeDiscoveryBox();
  }

  // --- HudController delegations ---
  public createHUD(): void {
    this.hudController.createHUD();
  }
  public drawHudBar(camW: number): void {
    this.hudController.drawHudBar(camW);
  }
  public updateEdgePips(): void {
    this.hudController.updateEdgePips();
  }
  public syncHudTransform(): void {
    this.hudController.syncHudTransform();
  }
  public showLevelTitle(): void {
    this.hudController.showLevelTitle();
  }
  public showRetroToast(message: string): void {
    this.hudController.showRetroToast(message);
  }
  public showLevelCompleteOverlay(
    elapsedMs: number,
    bestMs: number,
    prevBestMs: number,
    nextLevelNumber: number | null,
    medal: IsotopeMedal = 'bronze'
  ): void {
    this.hudController.showLevelCompleteOverlay(
      elapsedMs,
      bestMs,
      prevBestMs,
      nextLevelNumber,
      medal
    );
  }

  // --- GhostController delegations ---
  public initGhostForLevel(): void {
    this.ghostController.initForLevel();
  }
  public destroySwarmGhosts(): void {
    this.ghostController.destroySwarmGhosts();
  }
  public spawnSwarmGhosts(speed = 1): void {
    this.ghostController.spawnSwarmGhosts(speed);
  }
  public applyGhostMode(): void {
    this.ghostController.applyGhostMode();
  }

  // --- CameraDirector delegations ---
  public setupInitialCameraFraming(initialHero: Hero): void {
    this.cameraDirector.setupInitialFraming(initialHero);
  }
  public switchFocusTo(targetHero: Hero): void {
    this.cameraDirector.switchFocusTo(targetHero);
  }
  public cycleFocusNext(): void {
    this.cameraDirector.cycleFocusNext();
  }
  public switchFocusByIndex(index: number): void {
    this.cameraDirector.switchFocusByIndex(index);
  }
  public handleResize(gameSize?: { width: number; height: number }): void {
    this.cameraDirector.handleResize(gameSize);
  }
  public destroyBetaPipCamera(): void {
    this.cameraDirector.destroyBetaPipCamera();
  }

  // --- RespawnTransitionController delegations ---
  public quickRespawn(deathPosition?: { x: number; y: number }): void {
    this.coherenceSystem.reset(true);
    this.respawnTransitionController.quickRespawn(deathPosition);
  }
  public killHero(hero: Hero): void {
    this.respawnTransitionController.killHero(hero);
  }
  public completeLevel(): void {
    if (this.isLevelCompleted || this.isTransitioningLevel) return;
    const store = useGameStore.getState();
    const completedLevelId = store.sharedLevel ? 0 : Number(this.levelData.id);
    const coherentRun = this.coherenceSystem.isCoherentRun();
    const styleScore = this.coherenceSystem.getStyleScore();

    this.respawnTransitionController.completeLevel();

    if (!Number.isNaN(completedLevelId) && (coherentRun || styleScore > 0)) {
      useGameStore.getState().recordCoherenceResult(completedLevelId, styleScore, coherentRun);
    }
  }
  public advanceToNextLevel(): void {
    this.respawnTransitionController.advanceToNextLevel();
  }
  public rebuildForLevel(nextLevelData: LevelData): void {
    this.respawnTransitionController.rebuildForLevel(nextLevelData);
  }

  // --- QuantumSystems delegations ---
  public handleEntangledPortalArrival(
    hero: Hero,
    portal: Phaser.Physics.Arcade.Sprite,
    isBetaPortal: boolean
  ): void {
    this.quantumSystems.entanglement.handleEntangledPortalArrival(hero, portal, isBetaPortal);
  }
  public updateEntanglementTether(time: number): void {
    this.quantumSystems.entanglement.updateEntanglementTether(time);
  }
  public drawTetherPylons(): void {
    this.quantumSystems.entanglement.drawTetherPylons();
  }
  public collectParticle(hero: Hero, particle: Phaser.Physics.Arcade.Sprite): void {
    this.quantumSystems.collectParticle(hero, particle);
  }
  public togglePhasePlatforms(): void {
    this.quantumSystems.togglePhasePlatforms();
  }
  public toggleLevelPhase(): void {
    this.quantumSystems.toggleLevelPhase();
  }
  public applyPhase(phase: PlatformPhase): void {
    this.quantumSystems.applyPhase(phase);
  }
  public trackBubblePointerMove(worldX: number, worldY: number, nowMs: number): boolean {
    return this.quantumSystems.matterAndFields.trackBubblePointerMove(worldX, worldY, nowMs);
  }
  public spawnAntigravityBubble(x: number, y: number, nowMs: number): void {
    this.quantumSystems.matterAndFields.spawnAntigravityBubble(x, y, nowMs);
  }
  public updateAntigravityBubbles(nowMs: number): void {
    this.quantumSystems.matterAndFields.updateAntigravityBubbles(nowMs);
  }
  public triggerTimeLoopRewind(): void {
    this.timeLoopSystem.triggerLoopRewind(true);
  }
  public triggerActiveObservation(targetWorldPoint?: { x: number; y: number }): number {
    return this.quantumSystems.triggerActiveObservation(targetWorldPoint);
  }

  public tryCrystallizeBroglieTrail(): boolean {
    return this.quantumSystems.matterAndFields.tryCrystallizeBroglieTrail();
  }
  public spawnBroglieWallWake(x: number, y: number, durationMs = 2000): void {
    this.quantumSystems.matterAndFields.spawnBroglieWallWake(x, y, durationMs);
  }
  public loadAcceleratorChamber(
    nextLevelData: LevelData,
    modifiers: AggregatedMutationModifiers
  ): void {
    this.acceleratorMode = true;
    this.acceleratorModifiers = modifiers;
    useGameStore.getState().setSharedLevel(nextLevelData);
    this.rebuildForLevel(nextLevelData);
  }
  public tryCloneFusion(nowMs = this.time?.now ?? 0): boolean {
    return this.quantumSystems.tryCloneFusion(nowMs);
  }
  public tryInFlightFission(): boolean {
    return this.quantumSystems.tryInFlightFission();
  }
  public updateScreenWrap(time: number): void {
    this.quantumSystems.updateScreenWrap(time);
  }
  public shatterCrackedPlatform(plat: Phaser.GameObjects.Rectangle): void {
    this.quantumSystems.setPieces.shatterCrackedPlatform(plat);
  }
  public vanishEphemeralPlatform(plat: Phaser.GameObjects.Rectangle): void {
    this.quantumSystems.setPieces.vanishEphemeralPlatform(plat);
  }
  public restoreEphemeralPlatforms(): number {
    return this.quantumSystems.setPieces.restoreEphemeralPlatforms();
  }
  public triggerSynthPlatformImpact(
    hero: Hero,
    plat: Phaser.GameObjects.Rectangle,
    isStatic: boolean
  ): void {
    this.quantumSystems.setPieces.triggerSynthPlatformImpact(hero, plat, isStatic);
  }
  public triggerIronCoreCollapse(): void {
    this.quantumSystems.setPieces.triggerIronCoreCollapse();
  }
  public triggerSupernovaShockwave(): void {
    this.quantumSystems.setPieces.triggerSupernovaShockwave();
  }
  public renderOganessonConstellation(): void {
    this.quantumSystems.setPieces.renderOganessonConstellation();
  }
  public revealPeriodicTableSilhouette(): void {
    this.quantumSystems.setPieces.revealPeriodicTableSilhouette();
  }

  update(time: number, delta: number): void {
    if (this.isLevelCompleted || this.isTransitioningLevel || this.isRespawning) {
      this.ghostController.updateSwarmVictoryPlayback(delta);
      this.quantumEffects?.update(
        time,
        delta,
        this.heroes,
        this.portalSprite,
        this.isTimeDilationActive,
        this.coherenceSystem.getValue()
      );
      return;
    }

    if (!this.timerStarted) {
      this.startTime = time;
      this.dilatedElapsedMs = 0;
      this.timerStarted = true;
      this.ghostHero?.updateReplay(0);
    }

    if (this.isTimeDilationActive && time >= this.timeDilationUntil) {
      this.isTimeDilationActive = false;
      gameEvents.emit('time:dilation', { active: false, durationMs: 0 });
    }
    const isFocusBulletTime = time < this.focusBulletTimeUntil;
    const isReflexDilation = time < this.acceleratorReflexDilationUntil;
    const reflexScale = isReflexDilation
      ? Math.max(0.2, this.acceleratorModifiers?.reflexDilationScale ?? 0.35)
      : 1.0;
    const timeDilationFactor = isFocusBulletTime
      ? 0.2
      : isReflexDilation
        ? reflexScale
        : this.isTimeDilationActive
          ? 0.25
          : 1.0;
    if (this.physics?.world) {
      this.physics.world.timeScale = isFocusBulletTime
        ? 5.0
        : isReflexDilation
          ? 1 / reflexScale
          : 1.0;
    }

    this.dilatedElapsedMs += delta * timeDilationFactor;
    const elapsedMs = Math.max(0, time - this.startTime);

    const focusedHero = this.heroes.find((h) => h.isFocused && h.active) || this.heroes[0];
    if (focusedHero?.body) {
      const isGrounded =
        focusedHero.upsideDown === 1
          ? Boolean(focusedHero.body.touching.down || focusedHero.body.blocked.down)
          : Boolean(focusedHero.body.touching.up || focusedHero.body.blocked.up);
      const coherenceMult = this.acceleratorModifiers?.coherenceGainMultiplier ?? 1;
      this.coherenceSystem.update(delta * coherenceMult, focusedHero.body.velocity.x, isGrounded);
    }

    this.hudController.updateTimerAndIndicators();
    this.cameraDirector.updateFraming(delta);

    if (this.quantumSystems.entanglement.updateEntanglementFrame(time)) {
      return;
    }

    const isGhostActive = this.ghostController.updateActiveGhostsAndSplit(time, elapsedMs);

    this.quantumEffects?.update(
      time,
      delta,
      this.heroes,
      this.portalSprite,
      this.isTimeDilationActive || isReflexDilation,
      this.coherenceSystem.getValue()
    );
    this.hudController.updateThumbRibbon();

    const coherenceTier = this.coherenceSystem.getTier();
    const flowSpeedBoost =
      coherenceTier === 'HYPER'
        ? 1.15
        : coherenceTier === 'x3'
          ? 1.1
          : coherenceTier === 'x2'
            ? 1.05
            : 1.0;

    const wrapAxes = getScreenWrapAxes(this.levelData.screenWrap);
    for (const hero of [...this.heroes]) {
      if (hero.active) {
        hero.coherenceSpeedMultiplier = flowSpeedBoost;
        hero.updateControl(this.cursors, this.wasd, this.touchController.state, delta);
        if (
          !wrapAxes.vertical &&
          (hero.y > this.levelData.height + 20 || (hero.upsideDown === -1 && hero.y < -10))
        ) {
          if (this.acceleratorMode) {
            this.killHero(hero);
            return;
          }
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

    this.ghostController.updateGhostSurfing(isGhostActive);
    this.timeLoopSystem.update(time, delta);
    this.quantumSystems.updateWorldMechanics(time, delta, elapsedMs, timeDilationFactor);
    this.cameraDirector.checkEntanglementReveal();
  }
}
