import type Phaser from 'phaser';
import type { BohrBackgroundRenderer } from '../../effects/BohrBackgroundRenderer';
import type { QuantumEffectsManager } from '../../effects/QuantumEffectsManager';
import type { MobileTouchController } from '../../input/MobileTouchController';
import type { DecayPlatformState } from '../../mechanics/quantumMechanics';
import type { PinnablePlatformRef, QuantumPinningState } from '../../physics/matterStates';
import type { SessionSwarmBuffer } from '../../services/GhostManager';
import type { GhostFrame, GhostRecorder } from '../../tools/GhostRecorder';
import type {
  CollapseConfig,
  IsotopeMedal,
  LevelData,
  PlatformPhase,
  TetherPylon
} from '../../types';
import type { GhostHero } from '../GhostHero';
import type Hero from '../Hero';

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
  requireLock?: boolean;
  autoSwitchOnTrigger?: boolean;
}

export interface MovingPlatform {
  rect: Phaser.GameObjects.Rectangle;
  movesTo: { x?: number; y?: number };
  direction: { x: 'left' | 'right' | null; y: 'top' | 'bottom' | null };
  initialDirection: { x: 'left' | 'right' | null; y: 'top' | 'bottom' | null };
  width: number;
  height: number;
  startX: number;
  startY: number;
}

export interface MoleculeParticle {
  circle: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
}

export interface GateEntry {
  rect: Phaser.GameObjects.Rectangle;
  data: Gate;
}

export interface PressurePlateEntry {
  baseRect: Phaser.GameObjects.Rectangle;
  padRect: Phaser.GameObjects.Rectangle;
  data: PressurePlate;
  isPressed: boolean;
  startY: number;
}

export interface PhasePlatformEntry {
  rect: Phaser.GameObjects.Rectangle;
  phase: PlatformPhase;
}

export interface DecayPlatformEntry {
  rect: Phaser.GameObjects.Rectangle;
  state: DecayPlatformState;
  startX: number;
  startY: number;
}

export interface EdgePip {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Zone;
}

export interface LiquidPlatformEntry {
  rect: Phaser.GameObjects.Rectangle;
  startY: number;
}

export type PinnablePlatformEntry = PinnablePlatformRef & {
  rect: Phaser.GameObjects.Rectangle;
  phase?: PlatformPhase;
  decayState?: DecayPlatformState;
};

export interface BroglieCrystal {
  rect: Phaser.GameObjects.Rectangle;
  expiresAtMs: number;
}

export interface BubbleHarvestHit {
  molIndex: number;
  x: number;
  y: number;
  timeMs: number;
}

export interface AntigravityBubble {
  x: number;
  y: number;
  radius: number;
  expiresAtMs: number;
  graphic: Phaser.GameObjects.Arc;
}

/**
 * Shared typed contract between GameScene and its extracted systems.
 * Keeps all systems decoupled from GameScene.ts (zero circular imports).
 */
export interface GameSceneContext {
  // Phaser.Scene core APIs
  readonly add: Phaser.GameObjects.GameObjectFactory;
  readonly physics: Phaser.Physics.Arcade.ArcadePhysics;
  readonly cameras: Phaser.Cameras.Scene2D.CameraManager;
  readonly tweens: Phaser.Tweens.TweenManager;
  readonly time: Phaser.Time.Clock;
  readonly input: Phaser.Input.InputPlugin;
  readonly events: Phaser.Events.EventEmitter;
  readonly scale: Phaser.Scale.ScaleManager;
  readonly game: Phaser.Game;
  readonly scene: Phaser.Scenes.ScenePlugin;

  // Core level state
  levelData: LevelData;
  portalSprite: Phaser.Physics.Arcade.Sprite;
  heroes: Hero[];
  heroGroup: Phaser.Physics.Arcade.Group;
  platforms: Phaser.Physics.Arcade.StaticGroup;
  gatesGroup: Phaser.Physics.Arcade.StaticGroup;
  gatesMap: Map<string, GateEntry>;
  pressurePlatesList: PressurePlateEntry[];
  movingPlatformsGroup: Phaser.Physics.Arcade.Group;
  sceneBounds: Phaser.Physics.Arcade.StaticGroup;
  spikes: Phaser.Physics.Arcade.StaticGroup;
  particles: Phaser.Physics.Arcade.Group;
  ghostHero: GhostHero | null;
  isEntangled: boolean;
  betaHero: Hero | null;
  betaPortalSprite: Phaser.Physics.Arcade.Sprite | null;

  // Ghost state
  hasAnyGhost: boolean;
  authorTrajectory?: string;
  personalTrajectory?: string;
  ghostRecorder: GhostRecorder;
  ghostFrames: GhostFrame[];
  swarmBuffer: SessionSwarmBuffer;
  swarmGhosts: GhostHero[];
  swarmPlaybackActive: boolean;
  swarmPlaybackElapsedMs: number;
  swarmPlaybackSpeed: number;
  swarmPlaybackMaxMs: number;

  // Mechanics & environment state
  isPauliActive: boolean;
  isTimeDilationActive: boolean;
  timeDilationUntil: number;
  currentPhase: PlatformPhase;
  hasPhasePlatforms: boolean;
  phasePlatforms: PhasePlatformEntry[];
  decayPlatforms: DecayPlatformEntry[];
  collapseTopSpikes: Phaser.GameObjects.Rectangle | null;
  collapseBottomSpikes: Phaser.GameObjects.Rectangle | null;
  collapseConfig?: CollapseConfig;
  pauliGraphics: Phaser.GameObjects.Graphics | null;
  spikeGfx: Phaser.GameObjects.Graphics | null;
  unsubJump: (() => void) | null;
  unsubHudStore: (() => void) | null;
  entanglementGraphics: Phaser.GameObjects.Graphics | null;
  alphaEnteredPortal: boolean;
  betaEnteredPortal: boolean;
  jumpCount: number;
  switchCount: number;
  movingPlatforms: MovingPlatform[];
  molecules: MoleculeParticle[];
  bohrBackground: BohrBackgroundRenderer | null;
  muralObjects: Phaser.GameObjects.GameObject[];
  discoveryBoxObjects: Phaser.GameObjects.GameObject[];
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
  wasd: { [key: string]: Phaser.Input.Keyboard.Key } | null;
  touchController: MobileTouchController;
  uiPointerConsumed: boolean;
  thumbRibbonGraphics: Phaser.GameObjects.Graphics | null;
  diveTrailGraphics: Phaser.GameObjects.Graphics | null;
  focusArcGraphics: Phaser.GameObjects.Graphics | null;
  focusBulletTimeUntil: number;
  edgePips: EdgePip[];

  // HUD & timer state
  hudContainer: Phaser.GameObjects.Container | null;
  startTime: number;
  dilatedElapsedMs: number;
  timerStarted: boolean;
  timerText: Phaser.GameObjects.Text;
  splitDeltaText: Phaser.GameObjects.Text | null;
  ghostButton: Phaser.GameObjects.Text | null;
  hudBarGraphics: Phaser.GameObjects.Graphics | null;
  thumbRestartBg: Phaser.GameObjects.Rectangle | null;
  thumbRestartLabel: Phaser.GameObjects.Text | null;
  thumbRestartZone: Phaser.GameObjects.Zone | null;
  lastTimerString: string;
  lastTimerColor: string;
  lastSplitString: string;
  lastSplitColor: string;
  lastSplitUpdateMs: number;
  phaseIndicatorText: Phaser.GameObjects.Text | null;
  dilationIndicatorText: Phaser.GameObjects.Text | null;

  // Lifecycle & transition state
  isLevelCompleted: boolean;
  isRespawning: boolean;
  isTransitioningLevel: boolean;
  canAdvanceLevel: boolean;
  nextLevelNumberPending: number | null;
  lastShownLevelId: string | null;
  deathEchoes: Phaser.GameObjects.Sprite[];
  levelCompleteOverlay: Phaser.GameObjects.Container | null;
  quantumEffects: QuantumEffectsManager | null;

  // Spec-08 / Spec-09 / Spec-10 / Spec-11 state
  crackedPlatforms: Phaser.GameObjects.Rectangle[];
  hookedTetherPylon: TetherPylon | null;
  tetherPylonGraphics: Phaser.GameObjects.Graphics | null;
  screenWrapGraphics: Phaser.GameObjects.Graphics | null;
  screenWrapGhosts: Phaser.GameObjects.Sprite[];
  fusionHaloGraphics: Phaser.GameObjects.Graphics | null;
  liquidPlatforms: LiquidPlatformEntry[];
  gasPlatforms: Phaser.GameObjects.Rectangle[];
  pinnablePlatforms: PinnablePlatformEntry[];
  quantumPinningState: QuantumPinningState;
  quantumPinGraphics: Phaser.GameObjects.Graphics | null;
  wormholeGraphics: Phaser.GameObjects.Graphics | null;
  broglieCrystals: BroglieCrystal[];
  hasCondenseAbility: boolean;
  fKey: Phaser.Input.Keyboard.Key | null;
  activePinPointerWorld: { x: number; y: number } | null;
  activePinPointerId: number | null;
  alphaArrivalTimeMs: number | null;
  betaArrivalTimeMs: number | null;
  bubbleHarvestHits: BubbleHarvestHit[];
  antigravityBubbles: AntigravityBubble[];
  ephemeralPlatforms: Phaser.GameObjects.Rectangle[];
  entanglementRevealed: boolean;
  constellationGraphics: Phaser.GameObjects.Graphics | null;
  periodicTableGraphics: Phaser.GameObjects.Graphics | null;
  previousCompletedLevelId: number | null;

  // Cross-system scene methods
  resolveLevelData(levelNumber: number): LevelData | undefined;
  buildLevel(): void;
  clearLevelObjects(): void;
  spawnHeroes(): void;
  renderSafeDiscoveryBox(): void;
  createHUD(): void;
  drawHudBar(camW: number): void;
  updateEdgePips(): void;
  syncHudTransform(): void;
  showLevelTitle(): void;
  showRetroToast(message: string): void;
  showLevelCompleteOverlay(
    elapsedMs: number,
    bestMs: number,
    prevBestMs: number,
    nextLevelNumber: number | null,
    medal?: IsotopeMedal
  ): void;
  initGhostForLevel(): void;
  applyGhostMode(): void;
  spawnSwarmGhosts(speed?: number): void;
  destroySwarmGhosts(): void;
  setupInitialCameraFraming(initialHero: Hero): void;
  switchFocusTo(targetHero: Hero): void;
  cycleFocusNext(): void;
  switchFocusByIndex(index: number): void;
  handleResize(gameSize?: { width: number; height: number }): void;
  quickRespawn(deathPosition?: { x: number; y: number }): void;
  killHero(hero: Hero): void;
  completeLevel(): void;
  advanceToNextLevel(): void;
  rebuildForLevel(nextLevelData: LevelData): void;
  handleEntangledPortalArrival(
    hero: Hero,
    portal: Phaser.Physics.Arcade.Sprite,
    isBetaPortal: boolean
  ): void;
  collectParticle(hero: Hero, particle: Phaser.Physics.Arcade.Sprite): void;
  togglePhasePlatforms(): void;
  toggleLevelPhase(): void;
  applyPhase(phase: PlatformPhase): void;
  vanishEphemeralPlatform(plat: Phaser.GameObjects.Rectangle): void;
  restoreEphemeralPlatforms(): number;
  shatterCrackedPlatform(plat: Phaser.GameObjects.Rectangle): void;
  triggerSynthPlatformImpact(
    hero: Hero,
    plat: Phaser.GameObjects.Rectangle,
    isStatic: boolean
  ): void;
  drawTetherPylons(): void;
  triggerIronCoreCollapse(): void;
  triggerSupernovaShockwave(): void;
  renderOganessonConstellation(): void;
  revealPeriodicTableSilhouette(): void;
}
