import Phaser from 'phaser';
import { soundManager } from '../../audio/SoundManager';
import { getNarrativeForLevel } from '../../data/cosmicNarrative';
import { getAtomicMass, getElementSpectroscopy } from '../../data/spectroscopy';
import { BohrBackgroundRenderer } from '../../effects/BohrBackgroundRenderer';
import { QuantumEffectsManager } from '../../effects/QuantumEffectsManager';
import { PHYSICS } from '../../physics/constants';
import { createQuantumPinningState } from '../../physics/matterStates';
import { useGameStore } from '../../store';
import Hero from '../Hero';
import {
  buildParticles,
  buildPlatforms,
  buildPortalsGatesAndPlates,
  buildSceneBounds,
  buildSpikesAndCollapse,
  setupLevelCollisions
} from './PlatformFactory';
import type { GameSceneContext } from './types';

/**
 * Responsible for constructing all level objects (platforms, spikes, gates,
 * pressure plates, portals, molecules, Bohr background, DiscoveryBox),
 * spawning heroes, and cleanly tearing down level objects.
 */
export class LevelBuilder {
  constructor(private readonly ctx: GameSceneContext) {}

  public buildLevel(): void {
    const ctx = this.ctx;
    ctx.heroes = [];
    ctx.gatesMap.clear();
    ctx.pressurePlatesList = [];
    ctx.movingPlatforms = [];
    ctx.molecules = [];
    ctx.phasePlatforms = [];
    ctx.decayPlatforms = [];
    ctx.crackedPlatforms = [];
    ctx.hookedTetherPylon = null;
    ctx.tetherPylonGraphics = null;
    ctx.screenWrapGraphics = null;
    ctx.screenWrapGhosts = [];
    ctx.fusionHaloGraphics = null;
    ctx.liquidPlatforms = [];
    ctx.gasPlatforms = [];
    ctx.pinnablePlatforms = [];
    ctx.quantumPinningState = createQuantumPinningState();
    ctx.quantumPinGraphics = null;
    ctx.wormholeGraphics = null;
    ctx.broglieCrystals = [];
    ctx.hasCondenseAbility = false;
    ctx.activePinPointerWorld = null;
    ctx.edgePips = [];
    ctx.isLevelCompleted = false;
    ctx.isRespawning = false;
    ctx.isTransitioningLevel = false;
    ctx.canAdvanceLevel = false;
    ctx.nextLevelNumberPending = null;
    ctx.quantumEffects = null;
    ctx.bohrBackground = null;
    ctx.muralObjects = [];
    ctx.discoveryBoxObjects = [];
    soundManager.setAtomicNumber(this.getCurrentAtomicNumber());
    ctx.touchController.reset();
    ctx.uiPointerConsumed = false;
    ctx.thumbRibbonGraphics = null;
    ctx.diveTrailGraphics = null;
    ctx.focusArcGraphics = null;
    ctx.focusBulletTimeUntil = 0;
    ctx.ghostHero = null;
    ctx.ghostRecorder.reset();
    ctx.ghostFrames = [];
    ctx.swarmGhosts = [];
    ctx.swarmPlaybackActive = false;
    ctx.swarmPlaybackElapsedMs = 0;
    ctx.jumpCount = 0;
    ctx.switchCount = 0;
    ctx.hasAnyGhost = false;
    ctx.authorTrajectory = undefined;
    ctx.personalTrajectory = undefined;
    ctx.startTime = 0;
    ctx.dilatedElapsedMs = 0;
    ctx.timerStarted = false;
    ctx.lastTimerString = '';
    ctx.lastTimerColor = '';
    ctx.lastSplitString = '';
    ctx.lastSplitColor = '';
    ctx.lastSplitUpdateMs = 0;
    ctx.splitDeltaText = null;
    ctx.ghostButton = null;
    ctx.hudContainer = null;
    ctx.hudBarGraphics = null;
    ctx.thumbRestartBg = null;
    ctx.thumbRestartLabel = null;
    ctx.thumbRestartZone = null;
    ctx.condenseButtonBg = null;
    ctx.condenseButtonLabel = null;
    ctx.condenseButtonZone = null;
    ctx.destroyBetaPipCamera?.();
    ctx.levelCompleteOverlay = null;
    ctx.phaseIndicatorText = null;
    ctx.dilationIndicatorText = null;
    ctx.isEntangled = false;
    ctx.betaHero = null;
    ctx.betaPortalSprite = null;
    ctx.alphaEnteredPortal = false;
    ctx.betaEnteredPortal = false;
    ctx.alphaArrivalTimeMs = null;
    ctx.betaArrivalTimeMs = null;
    ctx.bubbleHarvestHits = [];
    ctx.antigravityBubbles = [];
    ctx.isPauliActive = false;
    ctx.isTimeDilationActive = false;
    ctx.timeDilationUntil = 0;
    ctx.currentPhase = 'cyan';
    ctx.hasPhasePlatforms = false;
    ctx.collapseTopSpikes = null;
    ctx.collapseBottomSpikes = null;
    ctx.collapseConfig = undefined;
    ctx.pauliGraphics = null;
    ctx.spikeGfx = null;
    if (ctx.unsubJump) {
      ctx.unsubJump();
      ctx.unsubJump = null;
    }

    // 1. Physics & Bounds
    ctx.physics.world.gravity.y = PHYSICS.GRAVITY_Y;
    ctx.physics.world.timeScale = 1.0;
    ctx.physics.world.setBounds(0, 0, ctx.levelData.width, ctx.levelData.height);
    ctx.physics.world.setBoundsCollision(false, false, false, false);
    ctx.cameras.main.setBounds(0, 0, ctx.levelData.width, ctx.levelData.height);
    ctx.cameras.main.setBackgroundColor(ctx.levelData.hue);
    ctx.cameras.main.setZoom(1);
    ctx.cameras.main.followOffset.set(0, 0);

    buildSceneBounds(ctx);

    // 2. Background ambient molecules & Bohr orbital background
    this.createMolecules();

    // 3. Platforms, Spikes, Particles, Portals, Gates, Pressure Plates
    buildPlatforms(ctx);
    buildSpikesAndCollapse(ctx);
    buildParticles(ctx);
    buildPortalsGatesAndPlates(ctx);

    // 4. Heroes & Collisions
    this.spawnHeroes();
    setupLevelCollisions(ctx);

    // 5. Ghost Hero Replay
    ctx.initGhostForLevel();

    // 6. HUD, Timer & Level Title
    ctx.createHUD();
    ctx.showLevelTitle();

    // 7. Audio clone modulation & adaptive BGM start
    soundManager.setClonesCount(ctx.heroes.length);
    soundManager.startBgm();

    // 8. Quantum Visual Effects & Graphics Layers
    ctx.quantumEffects = new QuantumEffectsManager(ctx as unknown as Phaser.Scene);
    ctx.diveTrailGraphics = ctx.add.graphics();
    ctx.diveTrailGraphics.setDepth(18);
    ctx.focusArcGraphics = ctx.add.graphics();
    ctx.focusArcGraphics.setDepth(26);
    ctx.fusionHaloGraphics = ctx.add.graphics();
    ctx.fusionHaloGraphics.setDepth(19);
    ctx.quantumPinGraphics = ctx.add.graphics();
    ctx.quantumPinGraphics.setDepth(24);
    ctx.wormholeGraphics = ctx.add.graphics();
    ctx.wormholeGraphics.setDepth(17);
    if (ctx.levelData.tetherPylons && ctx.levelData.tetherPylons.length > 0) {
      ctx.tetherPylonGraphics = ctx.add.graphics();
      ctx.tetherPylonGraphics.setDepth(16);
      ctx.drawTetherPylons();
    }

    const builtLvlNum = Number(ctx.levelData.id);
    if (builtLvlNum === 27 && ctx.previousCompletedLevelId === 26) {
      ctx.triggerSupernovaShockwave();
    }
    if (builtLvlNum === 118) {
      ctx.renderOganessonConstellation();
    }
  }

  public spawnHeroes(): void {
    const ctx = this.ctx;
    if (ctx.heroGroup) {
      ctx.heroGroup.clear(true, true);
    } else {
      for (const h of ctx.heroes) {
        h.destroy();
      }
    }
    ctx.heroes = [];
    ctx.betaHero = null;
    ctx.alphaEnteredPortal = false;
    ctx.betaEnteredPortal = false;
    ctx.alphaArrivalTimeMs = null;
    ctx.betaArrivalTimeMs = null;
    ctx.bubbleHarvestHits = [];
    for (const b of ctx.antigravityBubbles) {
      b.graphic.destroy();
    }
    ctx.antigravityBubbles = [];

    const startX = ctx.levelData.player.position.x;
    const startY = ctx.levelData.player.position.y;
    const initialHero = new Hero(ctx as unknown as Phaser.Scene, startX, startY, true);
    ctx.heroes.push(initialHero);
    ctx.heroGroup.add(initialHero);

    const entanglement = ctx.levelData.entanglement;
    ctx.isEntangled = Boolean(entanglement);

    if (entanglement) {
      initialHero.setEntangled(false, entanglement.mode);

      const betaX = entanglement.betaSpawn
        ? entanglement.betaSpawn.x
        : ctx.levelData.width - startX;
      const betaY = entanglement.betaSpawn ? entanglement.betaSpawn.y : startY;

      ctx.betaHero = new Hero(ctx as unknown as Phaser.Scene, betaX, betaY, true);
      ctx.betaHero.setEntangled(true, entanglement.mode);
      ctx.heroes.push(ctx.betaHero);
      ctx.heroGroup.add(ctx.betaHero);
      if (entanglement.mode === 'inverted_gravity' || entanglement.mode === 'mirror_and_gravity') {
        const bBody = ctx.betaHero.body as Phaser.Physics.Arcade.Body;
        bBody?.setGravityY?.(-2 * PHYSICS.GRAVITY_Y);
      }
    }

    ctx.setupInitialCameraFraming(initialHero);
    soundManager.setClonesCount(ctx.heroes.length);
  }

  public clearLevelObjects(): void {
    const ctx = this.ctx;
    ctx.tweens?.killAll?.();
    ctx.physics?.world?.colliders?.destroy?.();

    ctx.quantumEffects?.destroy();
    ctx.quantumEffects = null;

    ctx.bohrBackground?.destroy();
    ctx.bohrBackground = null;

    for (const mural of ctx.muralObjects) {
      mural.destroy();
    }
    ctx.muralObjects = [];

    for (const obj of ctx.discoveryBoxObjects) {
      obj.destroy();
    }
    ctx.discoveryBoxObjects = [];

    const destroyGraphic = (
      g: Phaser.GameObjects.Graphics | null
    ): Phaser.GameObjects.Graphics | null => {
      if (g) g.destroy();
      return null;
    };

    ctx.entanglementGraphics = destroyGraphic(ctx.entanglementGraphics);
    ctx.pauliGraphics = destroyGraphic(ctx.pauliGraphics);
    ctx.spikeGfx = destroyGraphic(ctx.spikeGfx);
    ctx.diveTrailGraphics = destroyGraphic(ctx.diveTrailGraphics);
    ctx.focusArcGraphics = destroyGraphic(ctx.focusArcGraphics);
    ctx.thumbRibbonGraphics = destroyGraphic(ctx.thumbRibbonGraphics);
    ctx.tetherPylonGraphics = destroyGraphic(ctx.tetherPylonGraphics);
    ctx.screenWrapGraphics = destroyGraphic(ctx.screenWrapGraphics);
    ctx.fusionHaloGraphics = destroyGraphic(ctx.fusionHaloGraphics);
    ctx.quantumPinGraphics = destroyGraphic(ctx.quantumPinGraphics);
    ctx.wormholeGraphics = destroyGraphic(ctx.wormholeGraphics);
    ctx.constellationGraphics = destroyGraphic(ctx.constellationGraphics);
    ctx.periodicTableGraphics = destroyGraphic(ctx.periodicTableGraphics);

    for (const crystal of ctx.broglieCrystals) {
      crystal.rect.destroy();
    }
    ctx.broglieCrystals = [];
    for (const lp of ctx.liquidPlatforms) {
      lp.waveGfx?.destroy();
    }
    ctx.liquidPlatforms = [];
    ctx.gasPlatforms = [];
    ctx.pinnablePlatforms = [];
    ctx.activePinPointerWorld = null;
    for (const ghost of ctx.screenWrapGhosts) {
      ghost.destroy();
    }
    ctx.screenWrapGhosts = [];
    ctx.crackedPlatforms = [];
    ctx.ephemeralPlatforms = [];
    ctx.entanglementRevealed = false;
    ctx.hookedTetherPylon = null;

    if (ctx.unsubJump) {
      ctx.unsubJump();
      ctx.unsubJump = null;
    }
    if (ctx.unsubHudStore) {
      ctx.unsubHudStore();
      ctx.unsubHudStore = null;
    }

    for (const pip of ctx.edgePips) {
      pip.bg.destroy();
      pip.label.destroy();
      pip.hitArea.destroy();
    }
    ctx.edgePips = [];

    ctx.destroyBetaPipCamera?.();

    if (ctx.hudContainer) {
      ctx.hudContainer.destroy(true);
      ctx.hudContainer = null;
    }
    ctx.hudBarGraphics = null;
    ctx.thumbRestartBg = null;
    ctx.thumbRestartLabel = null;
    ctx.thumbRestartZone = null;
    ctx.condenseButtonBg = null;
    ctx.condenseButtonLabel = null;
    ctx.condenseButtonZone = null;
    if (ctx.levelCompleteOverlay) {
      ctx.levelCompleteOverlay.destroy(true);
      ctx.levelCompleteOverlay = null;
    }
    if (ctx.ghostHero) {
      ctx.ghostHero.destroy();
      ctx.ghostHero = null;
    }
    ctx.destroySwarmGhosts();
    if (ctx.betaPortalSprite) {
      ctx.betaPortalSprite.destroy();
      ctx.betaPortalSprite = null;
    }
    if (ctx.portalSprite) {
      ctx.portalSprite.destroy();
    }

    for (const echo of ctx.deathEchoes) {
      echo.destroy();
    }
    ctx.deathEchoes = [];

    for (const item of ctx.pressurePlatesList) {
      item.baseRect.destroy();
      item.padRect.destroy();
    }
    ctx.pressurePlatesList = [];

    for (const mol of ctx.molecules) {
      mol.circle.destroy();
    }
    ctx.molecules = [];
    ctx.bubbleHarvestHits = [];
    for (const b of ctx.antigravityBubbles) {
      b.graphic.destroy();
    }
    ctx.antigravityBubbles = [];

    ctx.heroGroup?.clear?.(true, true);
    ctx.platforms?.clear?.(true, true);
    ctx.movingPlatformsGroup?.clear?.(true, true);
    ctx.sceneBounds?.clear?.(true, true);
    ctx.spikes?.clear?.(true, true);
    ctx.particles?.clear?.(true, true);
    ctx.gatesGroup?.clear?.(true, true);

    ctx.heroes = [];
    ctx.betaHero = null;
    ctx.gatesMap.clear();
    ctx.movingPlatforms = [];
    ctx.phasePlatforms = [];
    ctx.decayPlatforms = [];
  }

  public getCurrentAtomicNumber(): number {
    const raw =
      this.ctx.levelData?.symbol ||
      this.ctx.levelData?.id ||
      useGameStore.getState().currentLevel ||
      1;
    return getElementSpectroscopy(raw).z;
  }

  public createMolecules(): void {
    const ctx = this.ctx;
    const z = this.getCurrentAtomicNumber();
    const viewW = ctx.cameras.main?.width || 800;
    const viewH = ctx.cameras.main?.height || 600;
    ctx.bohrBackground = new BohrBackgroundRenderer(
      ctx as unknown as Phaser.Scene,
      z,
      viewW / 2,
      viewH / 2
    );

    const spec = getElementSpectroscopy(z);
    const mass = getAtomicMass(z);
    const narrativeLines = getNarrativeForLevel(z);
    const verse = narrativeLines[0] || spec.description;

    const muralX = Math.min(ctx.levelData.width * 0.5, viewW * 0.5);
    const muralY = Math.min(ctx.levelData.height * 0.45, viewH * 0.44);

    const symbolText = ctx.add.text(muralX, muralY - 24, spec.symbol, {
      fontFamily: 'Orbitron',
      fontSize: '96px',
      color: spec.antiHue,
      fontStyle: 'bold'
    });
    symbolText.setOrigin(0.5);
    symbolText.setAlpha(0.35);
    symbolText.setDepth(2);
    symbolText.setScrollFactor(0.35);
    ctx.muralObjects.push(symbolText);

    const metaText = ctx.add.text(
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
    ctx.muralObjects.push(metaText);

    const verseText = ctx.add.text(muralX, muralY + 62, verse, {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#ffffff'
    });
    verseText.setOrigin(0.5);
    verseText.setAlpha(0.35);
    verseText.setDepth(2);
    verseText.setScrollFactor(0.35);
    ctx.muralObjects.push(verseText);

    const numMolecules = 25;
    for (let i = 0; i < numMolecules; i++) {
      const rx = Phaser.Math.Between(0, ctx.levelData.width);
      const ry = Phaser.Math.Between(0, ctx.levelData.height);
      const radius = Phaser.Math.Between(12, 42);
      const color = Phaser.Display.Color.HexStringToColor(ctx.levelData.antiHue).color;
      const circle = ctx.add.circle(rx, ry, radius, color, Phaser.Math.FloatBetween(0.04, 0.1));
      circle.setDepth(1);
      ctx.molecules.push({
        circle,
        vx: Phaser.Math.FloatBetween(-0.5, 0.5),
        vy: Phaser.Math.FloatBetween(-0.5, 0.5)
      });
    }

    this.renderSafeDiscoveryBox();
  }

  public renderSafeDiscoveryBox(): void {
    const ctx = this.ctx;
    const discovery = ctx.levelData?.discoveryBox;
    if (!discovery?.enabled || !ctx.add) return;

    const anchorX = Math.max(200, (ctx.levelData.player?.position?.x ?? 120) + 150);
    const anchorY = Math.max(130, (ctx.levelData.player?.position?.y ?? 500) - 110);
    const colorHex = ctx.levelData.antiHue || '#00f5d4';
    const colorNum = Phaser.Display.Color.HexStringToColor(colorHex).color;

    if (typeof ctx.add.graphics === 'function') {
      const g = ctx.add.graphics();
      g.setDepth(2);
      g.setAlpha(0.45);
      g.lineStyle(2, colorNum, 0.85);
      if (typeof g.strokeRoundedRect === 'function') {
        g.strokeRoundedRect(anchorX - 165, anchorY - 34, 138, 56, 8);
      } else if (typeof g.strokeRect === 'function') {
        g.strokeRect(anchorX - 165, anchorY - 34, 138, 56);
      }
      if (typeof g.lineBetween === 'function') {
        g.lineBetween(anchorX - 20, anchorY - 6, anchorX + 20, anchorY - 6);
        g.lineBetween(anchorX + 12, anchorY - 12, anchorX + 20, anchorY - 6);
        g.lineBetween(anchorX + 12, anchorY, anchorX + 20, anchorY - 6);
      }
      if (typeof g.strokeRoundedRect === 'function') {
        g.strokeRoundedRect(anchorX + 27, anchorY - 34, 138, 56, 8);
      } else if (typeof g.strokeRect === 'function') {
        g.strokeRect(anchorX + 27, anchorY - 34, 138, 56);
      }
      ctx.discoveryBoxObjects.push(g);
    }

    if (typeof ctx.add.text === 'function') {
      const [step1, step2] = discovery.hintSteps;
      const t1 = ctx.add.text(anchorX - 96, anchorY - 6, `1. ${step1}`, {
        fontFamily: 'Orbitron',
        fontSize: '11px',
        color: colorHex,
        align: 'center'
      });
      t1.setOrigin(0.5);
      t1.setDepth(2);
      t1.setAlpha(0.55);
      ctx.discoveryBoxObjects.push(t1);

      const t2 = ctx.add.text(anchorX + 96, anchorY - 6, `2. ${step2}`, {
        fontFamily: 'Orbitron',
        fontSize: '11px',
        color: colorHex,
        align: 'center'
      });
      t2.setOrigin(0.5);
      t2.setDepth(2);
      t2.setAlpha(0.55);
      ctx.discoveryBoxObjects.push(t2);
    }
  }
}
