import type Phaser from 'phaser';
import { getStrings } from '../../i18n/strings';
import { canGhostSurf, getGhostSurfVelocity } from '../../physics/matterStates';
import { getSwarmSpectrumTint } from '../../services/GhostManager';
import { useGameStore } from '../../store';
import {
  calculateSplitDelta,
  decompressTrajectory,
  formatSplitDelta
} from '../../tools/GhostRecorder';
import { gameEvents } from '../../tools/gameEvents';
import { GhostHero } from '../GhostHero';
import type { GameSceneContext } from './types';

/**
 * Manages Ghost Hero modes (`off / optimal / best / swarm`), instantiation,
 * frame-by-frame replay, live speedrun split delta calculation, and Ghost Surfing.
 */
export class GhostController {
  constructor(private readonly ctx: GameSceneContext) {}

  public initForLevel(): void {
    const ctx = this.ctx;
    const store = useGameStore.getState();
    const activeDuel = store.activeDuel;
    const currentLvlNum = Number(ctx.levelData.id);
    const scoreItem = store.scores[currentLvlNum];

    if (activeDuel) {
      ctx.authorTrajectory = activeDuel.ghostTrajectory || undefined;
      ctx.personalTrajectory = scoreItem?.ghostTrajectory;
      ctx.hasAnyGhost = Boolean(activeDuel.ghostTrajectory);
      this.applyGhostMode();
      return;
    }

    const isShared = Boolean(store.sharedLevel);
    const sharedScore = store.scores[0];
    const isReplay = Boolean(
      (scoreItem?.best && scoreItem.best > 0 && store.maxLevel > currentLvlNum) ||
        (isShared &&
          (store.sharedLevel?.authorGhost || (sharedScore?.best && sharedScore.best > 0)))
    );

    ctx.authorTrajectory = store.sharedLevel?.authorGhost ?? ctx.levelData.authorGhost;
    ctx.personalTrajectory = isShared
      ? store.sharedLevel?.authorGhost
        ? undefined
        : sharedScore?.ghostTrajectory
      : scoreItem?.ghostTrajectory;

    ctx.hasAnyGhost = isReplay && Boolean(ctx.authorTrajectory || ctx.personalTrajectory);

    this.applyGhostMode();
  }

  public destroySwarmGhosts(): void {
    const ctx = this.ctx;
    for (const ghost of ctx.swarmGhosts) {
      ghost.destroy();
    }
    ctx.swarmGhosts = [];
    ctx.swarmPlaybackActive = false;
    ctx.swarmPlaybackElapsedMs = 0;
  }

  public spawnSwarmGhosts(speed = 1): void {
    const ctx = this.ctx;
    this.destroySwarmGhosts();
    const attempts = ctx.swarmBuffer.getAttempts();
    if (attempts.length === 0) return;

    const baseHex = ctx.levelData?.antiHue || ctx.levelData?.hue || '#00e5ff';
    const total = attempts.length;

    for (let i = 0; i < total; i++) {
      const attempt = attempts[i];
      if (!attempt.frames || attempt.frames.length === 0) continue;
      const tint = getSwarmSpectrumTint(baseHex, i, total, attempt.isVictory);
      const ghost = new GhostHero(ctx as unknown as Phaser.Scene, attempt.frames, {
        alpha: 0.22,
        finishedAlpha: 0.08,
        tint
      });
      ghost.setVisible(true);
      ctx.swarmGhosts.push(ghost);
    }

    ctx.swarmPlaybackSpeed = speed;
    ctx.swarmPlaybackElapsedMs = 0;
    ctx.swarmPlaybackMaxMs = ctx.swarmBuffer.getMaxDurationMs();
    ctx.swarmPlaybackActive = ctx.swarmGhosts.length > 0;
  }

  public applyGhostMode(): void {
    const ctx = this.ctx;
    const store = useGameStore.getState();
    const activeDuel = store.activeDuel;
    const mode = store.ghostMode ?? (store.ghostEnabled ? 'optimal' : 'off');

    if (ctx.ghostHero) {
      ctx.ghostHero.destroy();
      ctx.ghostHero = null;
    }

    // Spec-02: Challenger duel ghost takes absolute priority (even on first run or when ghostMode is 'off')
    if (activeDuel?.ghostTrajectory) {
      if (!ctx.isLevelCompleted) {
        this.destroySwarmGhosts();
      }
      ctx.ghostFrames = decompressTrajectory(activeDuel.ghostTrajectory);
      if (ctx.ghostFrames.length > 0) {
        ctx.ghostHero = new GhostHero(ctx as unknown as Phaser.Scene, ctx.ghostFrames, {
          tint: 0xfbbf24,
          alpha: 0.55,
          finishedAlpha: 0.3,
          label: `VS ${activeDuel.challengerName}`
        });
        ctx.ghostHero.setVisible(true);
      }

      if (ctx.ghostButton?.active) {
        ctx.ghostButton.setVisible(false);
      }
      if (ctx.splitDeltaText?.active) {
        ctx.splitDeltaText.setVisible(ctx.ghostFrames.length > 0);
      }
      return;
    }

    let trajectoryToLoad: string | undefined;
    if (mode === 'optimal') {
      trajectoryToLoad = ctx.authorTrajectory ?? ctx.personalTrajectory;
    } else if (mode === 'best') {
      trajectoryToLoad = ctx.personalTrajectory ?? ctx.authorTrajectory;
    }

    if (mode === 'swarm') {
      ctx.ghostFrames = [];
      if (ctx.swarmBuffer.size > 0) {
        this.spawnSwarmGhosts(1);
      }
    } else {
      if (!ctx.isLevelCompleted) {
        this.destroySwarmGhosts();
      }
      if (ctx.hasAnyGhost && mode !== 'off' && trajectoryToLoad) {
        ctx.ghostFrames = decompressTrajectory(trajectoryToLoad);
        if (ctx.ghostFrames.length > 0) {
          ctx.ghostHero = new GhostHero(ctx as unknown as Phaser.Scene, ctx.ghostFrames);
          ctx.ghostHero.setVisible(true);
        }
      } else {
        ctx.ghostFrames = [];
      }
    }

    if (ctx.ghostButton?.active) {
      const t = getStrings(store.locale ?? 'en');
      ctx.ghostButton.setText(t.ghost[mode]);
      ctx.ghostButton.setAlpha(mode !== 'off' ? 1 : 0.45);
      ctx.ghostButton.setVisible(ctx.hasAnyGhost || ctx.swarmBuffer.size > 0);
    }

    if (ctx.splitDeltaText?.active) {
      ctx.splitDeltaText.setVisible(mode !== 'off' && ctx.ghostFrames.length > 0);
    }
  }

  public updateSwarmVictoryPlayback(delta: number): void {
    const ctx = this.ctx;
    if (ctx.isLevelCompleted && ctx.swarmPlaybackActive && ctx.swarmGhosts.length > 0) {
      ctx.swarmPlaybackElapsedMs += delta * ctx.swarmPlaybackSpeed;
      if (ctx.swarmPlaybackMaxMs > 0 && ctx.swarmPlaybackElapsedMs > ctx.swarmPlaybackMaxMs + 600) {
        ctx.swarmPlaybackElapsedMs = 0;
      }
      for (const sg of ctx.swarmGhosts) {
        sg.updateReplay(ctx.swarmPlaybackElapsedMs);
      }
    }
  }

  public updateActiveGhostsAndSplit(time: number, elapsedMs: number): boolean {
    const ctx = this.ctx;
    const store = useGameStore.getState();
    const hasActiveDuelGhost = Boolean(store.activeDuel?.ghostTrajectory);
    const currentGhostMode = store.ghostMode ?? (store.ghostEnabled ? 'optimal' : 'off');
    const isGhostActive = hasActiveDuelGhost || currentGhostMode !== 'off';

    if (ctx.ghostHero && isGhostActive) {
      ctx.ghostHero.updateReplay(elapsedMs);
    }
    if (!hasActiveDuelGhost && currentGhostMode === 'swarm' && ctx.swarmGhosts.length > 0) {
      for (const sg of ctx.swarmGhosts) {
        sg.updateReplay(elapsedMs);
      }
    }

    const focusedHero = ctx.heroes.find((h) => h.isFocused) || ctx.heroes[0];
    if (focusedHero?.active && !ctx.isLevelCompleted) {
      ctx.ghostRecorder.recordFrame(
        elapsedMs,
        focusedHero.x,
        focusedHero.y,
        focusedHero.flipX,
        focusedHero.getAnimState(),
        focusedHero.flipY
      );

      if (
        ctx.splitDeltaText &&
        ctx.ghostFrames.length > 0 &&
        isGhostActive &&
        time - ctx.lastSplitUpdateMs >= 100
      ) {
        ctx.lastSplitUpdateMs = time;
        const deltaSec = calculateSplitDelta(
          ctx.ghostFrames,
          focusedHero.x,
          focusedHero.y,
          elapsedMs
        );
        const { text, color } = formatSplitDelta(deltaSec);
        if (text !== ctx.lastSplitString) {
          ctx.lastSplitString = text;
          ctx.splitDeltaText.setText(text);
        }
        if (color !== ctx.lastSplitColor) {
          ctx.lastSplitColor = color;
          ctx.splitDeltaText.setColor(color);
        }
      }
    }

    return isGhostActive;
  }

  public updateGhostSurfing(isGhostActive: boolean): void {
    const ctx = this.ctx;
    if (!isGhostActive || !ctx.ghostHero || !ctx.ghostHero.visible || !ctx.ghostHero.active) {
      return;
    }

    for (const hero of ctx.heroes) {
      if (!hero.active || !hero.body) continue;
      const surfOk = canGhostSurf(
        {
          x: hero.x,
          y: hero.y,
          vy: hero.body.velocity.y,
          upsideDown: hero.upsideDown,
          hasSurfedThisJump: hero.hasSurfedThisJump
        },
        ctx.ghostHero
      );
      if (surfOk) {
        hero.setVelocityY(getGhostSurfVelocity(hero.upsideDown));
        hero.hasSurfedThisJump = true;
        hero.isDiving = false;
        gameEvents.emit('hero:ghost_surf', { x: hero.x, y: hero.y });
        if (ctx.add?.circle && ctx.tweens?.add) {
          const ring = ctx.add.circle(hero.x, hero.y + 12 * hero.upsideDown, 10, 0xfbbf24, 0.75);
          ring.setDepth(22);
          ctx.tweens.add({
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
}
