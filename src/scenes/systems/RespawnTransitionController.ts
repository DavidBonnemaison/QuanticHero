import Phaser from 'phaser';
import { getNextChronoLoopLevel } from '../../data/chronoLoopLevels';
import { getLevelMetadata, loadLevel, preloadLevel } from '../../data/levels';
import { getNextSchrodingerLevel } from '../../data/schrodingerLevels';
import { getStrings } from '../../i18n/strings';
import { createSuperpositionState } from '../../mechanics/wavefunctionCollapse';
import { PHYSICS } from '../../physics/constants';
import { createQuantumPinningState } from '../../physics/matterStates';
import { calculateIsotopeMedal } from '../../services/MedalService';
import { useGameStore } from '../../store';
import { gameEvents } from '../../tools/gameEvents';
import { getNextLevelId, isEntanglementLevelId } from '../../tools/levelProgression';
import type { LevelData } from '../../types';
import type Hero from '../Hero';
import type { GameSceneContext } from './types';

/**
 * Manages the Zero-Cut loop: fast in-place quickRespawn (< 150 ms) with
 * persistent Death Echoes, hero death handling, level completion & medal
 * scoring, and seamless slide/fade transitions between levels.
 */
export class RespawnTransitionController {
  constructor(private readonly ctx: GameSceneContext) {}

  public spawnDeathEcho(x: number, y: number): void {
    const ctx = this.ctx;
    if (!ctx.add?.sprite) return;
    const antiHueColor = Phaser.Display.Color.HexStringToColor(ctx.levelData.antiHue).color;
    const clampedY = Phaser.Math.Clamp(y, 16, Math.max(16, ctx.levelData.height - 16));
    const echo = ctx.add.sprite(x, clampedY, 'hero', 0);
    echo.setAlpha(0.16);
    echo.setTint(antiHueColor);
    echo.setDepth(8);
    ctx.deathEchoes.push(echo);
  }

  public quickRespawn(deathPosition?: { x: number; y: number }): void {
    const ctx = this.ctx;
    if (ctx.isRespawning || ctx.isLevelCompleted || ctx.isTransitioningLevel) {
      return;
    }
    ctx.isRespawning = true;

    if (deathPosition) {
      this.spawnDeathEcho(deathPosition.x, deathPosition.y);
    }

    // 0. Full reset clears all Chrono-Loop echoes and resets cycle timer
    ctx.timeLoopSystem?.resetAllLoops();

    // 1. Reset physics world & active power-up states
    if (ctx.physics?.world) {
      ctx.physics.world.gravity.y = PHYSICS.GRAVITY_Y;
      ctx.physics.world.timeScale = 1.0;
    }
    ctx.isPauliActive = false;
    ctx.isTimeDilationActive = false;
    ctx.timeDilationUntil = 0;
    ctx.focusBulletTimeUntil = 0;
    ctx.pauliGraphics?.clear();
    ctx.diveTrailGraphics?.clear();
    ctx.focusArcGraphics?.clear();
    ctx.fusionHaloGraphics?.clear();
    ctx.quantumPinGraphics?.clear();
    ctx.wavefunctionGraphics?.clear();
    ctx.observerBeamGraphics?.clear();
    ctx.activeObserverFlash = null;
    for (const sp of ctx.superposedPlatforms ?? []) {
      sp.runtime = createSuperpositionState(sp.config.lockDurationMs);
      const body = sp.rect.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.enable = false;
        if (body.checkCollision) body.checkCollision.none = true;
      }
    }
    for (const ss of ctx.superposedSpikes ?? []) {
      ss.runtime = createSuperpositionState(ss.config.lockDurationMs);
      const body = ss.rect.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.enable = false;
        if (body.checkCollision) body.checkCollision.none = true;
      }
    }
    ctx.quantumPinningState = createQuantumPinningState();
    ctx.activePinPointerWorld = null;
    ctx.activePinPointerId = null;
    ctx.hasCondenseAbility = false;
    for (const crystal of ctx.broglieCrystals) {
      crystal.rect.destroy();
    }
    ctx.broglieCrystals = [];
    ctx.hookedTetherPylon = null;
    for (const ghost of ctx.screenWrapGhosts) {
      ghost.setVisible(false);
    }
    if (ctx.dilationIndicatorText?.active) {
      ctx.dilationIndicatorText.setVisible(false);
    }

    // 2. Respawn heroes at initial spawn (destroys secondary clones)
    ctx.spawnHeroes();
    ctx.updateEdgePips();

    // 3. Reactivate all collected particles at their original coordinates
    if (ctx.particles?.getChildren) {
      for (const child of ctx.particles.getChildren()) {
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
    ctx.bohrBackground?.resetValenceElectrons();

    // 4. Restore phase platforms to 'cyan'
    if (ctx.hasPhasePlatforms) {
      ctx.currentPhase = 'cyan';
      ctx.applyPhase('cyan');
      if (ctx.phaseIndicatorText?.active) {
        const t = getStrings(useGameStore.getState().locale ?? 'en');
        ctx.phaseIndicatorText.setText(t.hud.phase('cyan'));
        ctx.phaseIndicatorText.setColor('#00ffff');
      }
    }

    // 5. Restore half-life decay platforms, cracked platforms & ephemeral cage
    for (const dp of ctx.decayPlatforms) {
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
    for (const cp of ctx.crackedPlatforms) {
      cp.setAlpha(1);
      cp.setVisible(true);
      const body = cp.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.checkCollision.none = false;
        body.enable = true;
        body.updateFromGameObject?.();
      }
    }
    ctx.restoreEphemeralPlatforms();

    if (ctx.levelData.entanglement?.revealAtX !== undefined) {
      ctx.entanglementRevealed = false;
      ctx.cameras?.main?.setZoom?.(1);
      if (ctx.heroes[0]) {
        ctx.cameras?.main?.startFollow?.(ctx.heroes[0], true, 0.1, 0.1);
      }
    }

    // 6. Restore moving platforms
    for (const mp of ctx.movingPlatforms) {
      mp.rect.setPosition(mp.startX, mp.startY);
      mp.direction = { ...mp.initialDirection };
      const body = mp.rect.body as Phaser.Physics.Arcade.Body | null;
      if (body) {
        body.setVelocity(0, 0);
        body.reset?.(mp.startX, mp.startY);
      }
    }

    // 7. Restore pressure plates & gates
    for (const item of ctx.pressurePlatesList) {
      item.isPressed = false;
      item.padRect.setY(item.startY);
      item.padRect.setFillStyle(0x10b981);
    }
    for (const [, gateEntry] of ctx.gatesMap) {
      gateEntry.rect.setAlpha(1);
      const body = gateEntry.rect.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.enable = true;
      }
    }

    // 8. Restore gravitational collapse jaws
    if (ctx.collapseConfig && ctx.collapseTopSpikes && ctx.collapseBottomSpikes) {
      ctx.collapseTopSpikes.y = PHYSICS.COLLAPSE_TOP_START_Y / 2;
      ctx.collapseBottomSpikes.y = ctx.levelData.height - PHYSICS.COLLAPSE_BOTTOM_MARGIN_Y + 80;
      (
        ctx.collapseTopSpikes.body as Phaser.Physics.Arcade.StaticBody | null
      )?.updateFromGameObject?.();
      (
        ctx.collapseBottomSpikes.body as Phaser.Physics.Arcade.StaticBody | null
      )?.updateFromGameObject?.();
    }

    // 9. Reset timer, split delta, ghost replay & touch state
    ctx.timerStarted = false;
    ctx.startTime = 0;
    ctx.dilatedElapsedMs = 0;
    ctx.lastTimerString = '';
    ctx.lastTimerColor = '';
    ctx.lastSplitString = '';
    ctx.lastSplitColor = '';
    ctx.lastSplitUpdateMs = 0;
    if (ctx.timerText?.active) {
      ctx.timerText.setText('00:00:00');
      ctx.timerText.setColor('#ffffff');
    }
    if (ctx.splitDeltaText?.active) {
      ctx.splitDeltaText.setText('--');
      ctx.splitDeltaText.setColor('#94a3b8');
    }
    const failedFrames = ctx.ghostRecorder.getFrames();
    if (failedFrames.length > 0) {
      ctx.swarmBuffer.addAttempt(failedFrames, false);
    }
    ctx.jumpCount = 0;
    ctx.switchCount = 0;

    ctx.ghostRecorder.reset();
    if (ctx.ghostHero) {
      ctx.ghostHero.updateReplay(0);
    }
    if (ctx.ghostButton?.active) {
      ctx.ghostButton.setVisible(ctx.hasAnyGhost || ctx.swarmBuffer.size > 0);
    }
    const currentGhostMode =
      useGameStore.getState().ghostMode ??
      (useGameStore.getState().ghostEnabled ? 'optimal' : 'off');
    if (currentGhostMode === 'swarm' && ctx.swarmBuffer.size > 0) {
      ctx.spawnSwarmGhosts(1);
    }
    ctx.touchController.reset();

    // 10. Quantum implosion flash (120 ms)
    const startX = ctx.levelData.player.position.x;
    const startY = ctx.levelData.player.position.y;
    if (ctx.add?.circle && ctx.tweens?.add) {
      const implosionRing = ctx.add.circle(startX, startY, 34, 0x00e5ff, 0.65);
      implosionRing.setDepth(30);
      ctx.tweens.add({
        targets: implosionRing,
        scale: 0.1,
        alpha: 0,
        duration: 120,
        ease: 'Quad.easeIn',
        onComplete: () => implosionRing.destroy()
      });
    }
    ctx.cameras?.main?.flash?.(120, 0, 229, 255, false);

    if (ctx.time?.delayedCall) {
      ctx.time.delayedCall(120, () => {
        ctx.isRespawning = false;
      });
    } else {
      ctx.isRespawning = false;
    }
  }

  public killHero(hero: Hero): void {
    const ctx = this.ctx;
    if (!hero || !hero.active || ctx.isRespawning || ctx.isLevelCompleted) return;

    const deathPos = { x: hero.x, y: hero.y };

    if (ctx.isEntangled) {
      gameEvents.emit('hero:death', { remaining: 0, entangledCollapse: true });
      if (ctx.acceleratorMode) {
        gameEvents.emit('accelerator:life_lost', { deathPos });
        return;
      }
      this.quickRespawn(deathPos);
      return;
    }

    hero.destroy();
    ctx.heroes = ctx.heroes.filter((h) => h !== hero && h.active);
    gameEvents.emit('hero:death', { remaining: ctx.heroes.length });

    if (ctx.heroes.length === 0) {
      if (ctx.acceleratorMode) {
        gameEvents.emit('accelerator:life_lost', { deathPos });
        return;
      }
      this.quickRespawn(deathPos);
    } else {
      const anyFocused = ctx.heroes.some((h) => h.isFocused);
      if (!anyFocused && ctx.heroes.length > 0) {
        ctx.heroes[0].setFocus(true);
        ctx.cameras.main.startFollow(ctx.heroes[0], true, 0.1, 0.1);
      }
      ctx.updateEdgePips();
    }
  }

  public completeLevel(): void {
    const ctx = this.ctx;
    if (ctx.isLevelCompleted || ctx.isTransitioningLevel) return;
    ctx.isLevelCompleted = true;
    gameEvents.emit('level:complete', { level: Number(ctx.levelData.id) || 0 });

    const elapsedMs =
      ctx.dilatedElapsedMs > 0 ? ctx.dilatedElapsedMs : Math.max(0, ctx.time.now - ctx.startTime);

    if (ctx.acceleratorMode) {
      for (const hero of ctx.heroes) {
        if (!hero.active) continue;
        if (hero.body) {
          (hero.body as Phaser.Physics.Arcade.Body).enable = false;
          hero.setVelocity(0, 0);
        }
      }
      gameEvents.emit('accelerator:room_cleared', {
        elapsedMs,
        jumps: ctx.jumpCount,
        levelId: String(ctx.levelData?.id ?? 'accelerator-1')
      });
      return;
    }

    const store = useGameStore.getState();

    const focusedHero = ctx.heroes.find((h) => h.isFocused) || ctx.heroes[0];
    if (focusedHero) {
      ctx.ghostRecorder.recordFrame(
        elapsedMs,
        focusedHero.x,
        focusedHero.y,
        focusedHero.flipX,
        'idle',
        focusedHero.flipY,
        true
      );
    }
    const trajectory = ctx.ghostRecorder.getSerialized();
    const winningFrames = ctx.ghostRecorder.getFrames();
    if (winningFrames.length > 0) {
      ctx.swarmBuffer.addAttempt(winningFrames, true);
    }

    const medal = calculateIsotopeMedal({
      timeMs: elapsedMs,
      jumpCount: ctx.jumpCount,
      level: ctx.levelData
    });

    const isShared = Boolean(store.sharedLevel);
    const rawLevelId = String(ctx.levelData.id ?? '');
    const dailyMatch = /^daily:(\d{4}-\d{2}-\d{2})$/.exec(rawLevelId);
    const dailyDateKey = dailyMatch ? dailyMatch[1] : null;
    const moleculeMatch = /^molecule-(.+)$/i.exec(rawLevelId);
    const moleculeId = moleculeMatch ? moleculeMatch[1] : null;
    const isCustomModeLevel = /^(?:chrono|schrodinger)-\d+$/i.test(rawLevelId);
    const customModeId = isCustomModeLevel ? rawLevelId.toLowerCase() : null;
    const currentLvl = Number(ctx.levelData.id);
    if (!Number.isNaN(currentLvl)) {
      ctx.previousCompletedLevelId = currentLvl;
    }
    if (currentLvl === 26) {
      ctx.triggerIronCoreCollapse();
    } else if (currentLvl === 118) {
      ctx.revealPeriodicTableSilhouette();
    }
    const prevBest = dailyDateKey
      ? (store.dailyHistory?.[dailyDateKey]?.bestMs ?? 0)
      : moleculeId
        ? (store.moleculeScores?.[moleculeId]?.best ?? 0)
        : customModeId
          ? (store.customModeScores?.[customModeId]?.best ?? 0)
          : isShared
            ? (store.scores[0]?.best ?? 0)
            : (store.scores[currentLvl]?.best ?? 0);

    let nextLevelNumber: number | null = null;
    if (dailyDateKey) {
      store.recordDailyScore(dailyDateKey, elapsedMs, ctx.jumpCount, medal, trajectory);
    } else {
      if (moleculeId) {
        store.recordMoleculeScore(moleculeId, elapsedMs, trajectory, {
          jumpCount: ctx.jumpCount,
          switchCount: ctx.switchCount,
          medal,
          coherentRun: ctx.coherenceSystem?.isCoherentRun?.() ?? false,
          styleScore: ctx.coherenceSystem?.getStyleScore?.() ?? 0
        });
      }
      if (customModeId) {
        store.recordCustomModeScore(customModeId, elapsedMs, trajectory, {
          jumpCount: ctx.jumpCount,
          switchCount: ctx.switchCount,
          medal,
          coherentRun: ctx.coherenceSystem?.isCoherentRun?.() ?? false,
          styleScore: ctx.coherenceSystem?.getStyleScore?.() ?? 0
        });
      }
      if (isShared) {
        store.recordScore(0, elapsedMs, trajectory, {
          jumpCount: ctx.jumpCount,
          switchCount: ctx.switchCount,
          medal
        });
      } else {
        store.recordScore(currentLvl, elapsedMs, trajectory, {
          jumpCount: ctx.jumpCount,
          switchCount: ctx.switchCount,
          medal
        });
        const nextLevel = getNextLevelId(currentLvl);
        if (nextLevel !== null) {
          store.updateCurrentLevel(nextLevel);
          if (isEntanglementLevelId(currentLvl)) {
            if (store.maxEntanglementLevel < nextLevel) {
              store.updateMaxEntanglementLevel(nextLevel);
            }
          } else if (store.maxLevel < nextLevel) {
            store.updateMaxLevel(nextLevel);
          }
          if (ctx.resolveLevelData(nextLevel) || getLevelMetadata(nextLevel)) {
            nextLevelNumber = nextLevel;
            preloadLevel(nextLevel);
          }
        }
      }
    }
    ctx.nextLevelNumberPending = nextLevelNumber;

    const newBest = dailyDateKey
      ? (useGameStore.getState().dailyHistory?.[dailyDateKey]?.bestMs ?? elapsedMs)
      : moleculeId
        ? (useGameStore.getState().moleculeScores?.[moleculeId]?.best ?? elapsedMs)
        : customModeId
          ? (useGameStore.getState().customModeScores?.[customModeId]?.best ?? elapsedMs)
          : isShared
            ? (useGameStore.getState().scores[0]?.best ?? elapsedMs)
            : (useGameStore.getState().scores[currentLvl]?.best ?? elapsedMs);

    store.setLastRun(
      dailyDateKey
        ? {
            kind: 'daily',
            dateKey: dailyDateKey,
            elapsedMs,
            jumps: ctx.jumpCount,
            ghostTrajectory: trajectory
          }
        : isShared
          ? {
              kind: 'custom',
              level: ctx.levelData,
              elapsedMs,
              jumps: ctx.jumpCount,
              ghostTrajectory: trajectory
            }
          : {
              kind: 'campaign',
              levelId: Number.isNaN(currentLvl) ? 1 : currentLvl,
              elapsedMs,
              jumps: ctx.jumpCount,
              ghostTrajectory: trajectory
            }
    );

    for (const hero of ctx.heroes) {
      if (!hero.active) continue;
      if (hero.body) {
        (hero.body as Phaser.Physics.Arcade.Body).enable = false;
        hero.setVelocity(0, 0);
      }
      const targetPortal =
        hero.isBeta && ctx.betaPortalSprite ? ctx.betaPortalSprite : ctx.portalSprite;
      if (ctx.tweens?.add && targetPortal) {
        ctx.tweens.add({
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

    if (ctx.swarmBuffer.size > 0) {
      ctx.spawnSwarmGhosts(2);
    }

    ctx.showLevelCompleteOverlay(elapsedMs, newBest, prevBest, nextLevelNumber, medal);

    if (ctx.time?.delayedCall) {
      ctx.time.delayedCall(280, () => {
        ctx.canAdvanceLevel = true;
      });
    } else {
      ctx.canAdvanceLevel = true;
    }
  }

  public advanceToNextLevel(): void {
    const ctx = this.ctx;
    if (!ctx.isLevelCompleted || ctx.isTransitioningLevel) return;

    const rawLevelId = String(ctx.levelData.id ?? '');
    if (/^chrono-\d+$/i.test(rawLevelId)) {
      const nextChrono = getNextChronoLoopLevel(rawLevelId.toLowerCase());
      if (nextChrono) {
        const store = useGameStore.getState();
        store.setActiveDuel(null);
        store.setPendingDuelShare(null);
        store.setSharedLevel(nextChrono.levelData);
        this.performLevelTransition(nextChrono.levelData, nextChrono.index);
        return;
      }
    }
    if (/^schrodinger-\d+$/i.test(rawLevelId)) {
      const nextSchrodinger = getNextSchrodingerLevel(rawLevelId.toLowerCase());
      if (nextSchrodinger) {
        const store = useGameStore.getState();
        store.setActiveDuel(null);
        store.setPendingDuelShare(null);
        store.setSharedLevel(nextSchrodinger.levelData);
        this.performLevelTransition(nextSchrodinger.levelData, nextSchrodinger.index);
        return;
      }
    }

    if (ctx.nextLevelNumberPending === null) return;

    const store = useGameStore.getState();
    store.setActiveDuel(null);
    store.setPendingDuelShare(null);

    const nextNumber = ctx.nextLevelNumberPending;
    const nextData = ctx.resolveLevelData(nextNumber);
    if (nextData) {
      this.performLevelTransition(nextData, nextNumber);
      return;
    }

    ctx.isTransitioningLevel = true;
    ctx.canAdvanceLevel = false;
    void loadLevel(nextNumber).then((loaded) => {
      if (loaded) {
        this.performLevelTransition(loaded, nextNumber);
      } else {
        ctx.isTransitioningLevel = false;
        ctx.canAdvanceLevel = true;
      }
    });
  }

  public performLevelTransition(nextData: LevelData, nextNumber: number): void {
    const ctx = this.ctx;
    ctx.isTransitioningLevel = true;
    ctx.canAdvanceLevel = false;
    const preloadTarget = getNextLevelId(nextNumber);
    if (preloadTarget !== null) {
      preloadLevel(preloadTarget);
    }

    if (ctx.cameras?.main?.fadeOut && ctx.cameras?.main?.once) {
      ctx.cameras.main.once('camerafadeoutcomplete', () => {
        this.rebuildForLevel(nextData);
        ctx.cameras.main.fadeIn(300, 0, 0, 0);
      });
      ctx.cameras.main.fadeOut(300, 0, 0, 0);
    } else {
      this.rebuildForLevel(nextData);
    }
  }

  public rebuildForLevel(nextLevelData: LevelData): void {
    const ctx = this.ctx;
    ctx.clearLevelObjects();
    ctx.swarmBuffer.clear();
    ctx.levelData = nextLevelData;
    ctx.buildLevel();
  }
}
