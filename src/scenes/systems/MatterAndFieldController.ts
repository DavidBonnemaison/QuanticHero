import Phaser from 'phaser';
import { getStrings } from '../../i18n/strings';
import { PHYSICS } from '../../physics/constants';
import {
  buildBroglieScaffoldSegments,
  computeWormholeExit,
  findNearestPinnablePlatform,
  findPinnablePlatformAtPoint,
  getLiquidEmergeVelocity,
  isHeroInWormholeInlet,
  isHeroOverlappingRect,
  stepGasUpdraft,
  stepLiquidBuoyancy,
  stepQuantumPinning
} from '../../physics/matterStates';
import { useGameStore } from '../../store';
import { gameEvents } from '../../tools/gameEvents';
import type { GameSceneContext } from './types';

/**
 * Handles matter states (liquid buoyancy, noble gas updraft), quantum pinning,
 * wormhole teleportation, and de Broglie crystal scaffolding.
 */
export class MatterAndFieldController {
  constructor(private readonly ctx: GameSceneContext) {}

  public tryCrystallizeBroglieTrail(): boolean {
    const ctx = this.ctx;
    const hasCondenseInLevel = ctx.levelData?.particles?.some((p) => p.type === 'condense');
    if (ctx.heroes.length <= 1 && !ctx.hasCondenseAbility && !hasCondenseInLevel) {
      return false;
    }

    const focused = ctx.heroes.find((h) => h.isFocused && h.active) || ctx.heroes[0];
    if (!focused || !focused.body) return false;

    const touchingGround =
      focused.upsideDown === 1
        ? focused.body.touching.down || focused.body.blocked.down
        : focused.body.touching.up || focused.body.blocked.up;
    if (touchingGround) return false;

    const halfH = (focused.body?.height || PHYSICS.HERO_HEIGHT) / 2;
    const yOffset = (halfH + 10) * focused.upsideDown;
    const points =
      focused.trailPoints.length > 0 ? focused.trailPoints : [{ x: focused.x, y: focused.y }];
    const segments = buildBroglieScaffoldSegments(points, yOffset);
    const vx = focused.body?.velocity.x ?? 0;
    const forwardLead = vx > 20 ? 18 : vx < -20 ? -18 : 0;
    segments.push({
      x: focused.x + forwardLead,
      y: focused.y + yOffset,
      width: 112,
      height: 16
    });
    if (segments.length === 0) return false;

    if (focused.body && focused.body.velocity.y * focused.upsideDown > 120) {
      focused.setVelocityY(60 * focused.upsideDown);
    }

    const expiresAtMs = (ctx.time?.now ?? 0) + PHYSICS.BROGLIE_SCAFFOLD_DURATION_MS;
    for (const seg of segments) {
      const crystalRect = ctx.add.rectangle(seg.x, seg.y, seg.width, seg.height, 0x00e5ff, 0.85);
      crystalRect.setStrokeStyle(1.5, 0xffffff, 0.95);
      crystalRect.setDepth(16);
      ctx.physics.add.existing(crystalRect, true);
      ctx.platforms.add(crystalRect);
      ctx.broglieCrystals.push({ rect: crystalRect, expiresAtMs });
    }

    gameEvents.emit('hero:broglie_crystallize', {
      count: segments.length,
      durationMs: PHYSICS.BROGLIE_SCAFFOLD_DURATION_MS
    });
    ctx.showRetroToast(
      getStrings(useGameStore.getState().locale ?? 'en').hud.toasts.broglieCrystal
    );
    return true;
  }

  public spawnBroglieWallWake(x: number, y: number, durationMs = 2000): void {
    const ctx = this.ctx;
    if (!ctx.add?.rectangle || !ctx.physics?.add || !ctx.platforms) return;
    const clampedX = Phaser.Math.Clamp(x, 40, Math.max(40, ctx.levelData.width - 40));
    const clampedY = Phaser.Math.Clamp(y, 40, Math.max(40, ctx.levelData.height - 20));
    const crystalRect = ctx.add.rectangle(clampedX, clampedY, 72, 14, 0x00e5ff, 0.85);
    crystalRect.setStrokeStyle?.(1.5, 0xffffff, 0.95);
    crystalRect.setDepth?.(16);
    ctx.physics.add.existing(crystalRect, true);
    ctx.platforms.add(crystalRect);
    ctx.broglieCrystals.push({
      rect: crystalRect,
      expiresAtMs: (ctx.time?.now ?? 0) + durationMs
    });
    gameEvents.emit('hero:broglie_crystallize', {
      count: 1,
      durationMs
    });
  }

  public updateBroglieCrystals(time: number): void {
    const ctx = this.ctx;
    if (ctx.broglieCrystals.length === 0) return;
    const remaining: Array<{ rect: Phaser.GameObjects.Rectangle; expiresAtMs: number }> = [];
    for (const item of ctx.broglieCrystals) {
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
    ctx.broglieCrystals = remaining;
  }

  public updateMatterStates(time: number, delta: number): void {
    const ctx = this.ctx;
    const dt = delta / 1000;

    for (let i = 0; i < ctx.liquidPlatforms.length; i++) {
      const lp = ctx.liquidPlatforms[i];
      if (lp.rect.active) {
        const bobOffset = Math.sin(time * 0.004 + i) * 1.5;
        lp.rect.y = lp.startY + bobOffset;
        if (lp.waveGfx?.active) {
          lp.waveGfx.y = bobOffset;
        }
      }
    }

    for (const hero of ctx.heroes) {
      if (!hero.active || !hero.body) continue;

      if (ctx.liquidPlatforms.length > 0) {
        let overlappingLiquid: { rect: Phaser.GameObjects.Rectangle; startY: number } | null = null;
        for (const lp of ctx.liquidPlatforms) {
          if (isHeroOverlappingRect(hero.x, hero.y, lp.rect, true)) {
            overlappingLiquid = lp;
            break;
          }
        }

        if (overlappingLiquid && hero.inLiquid) {
          const dampedVy =
            hero.upsideDown === 1
              ? Math.min(hero.body.velocity.y, 280)
              : Math.max(hero.body.velocity.y, -280);
          let nextVy = stepLiquidBuoyancy(dampedVy, hero.upsideDown, dt);
          hero.isDiving = false;

          const topSurface = overlappingLiquid.rect.y - overlappingLiquid.rect.height / 2;
          const bottomSurface = overlappingLiquid.rect.y + overlappingLiquid.rect.height / 2;

          // Never fall through the bottom of a liquid basin
          if (hero.upsideDown === 1) {
            const maxDepthY = bottomSurface - 6;
            if (hero.y > maxDepthY) {
              hero.y = maxDepthY;
              if (nextVy > 0) {
                nextVy = -Math.max(140, Math.abs(nextVy));
              }
            }
          } else {
            const minDepthY = topSurface + 6;
            if (hero.y < minDepthY) {
              hero.y = minDepthY;
              if (nextVy < 0) {
                nextVy = Math.max(140, Math.abs(nextVy));
              }
            }
          }

          hero.setVelocityY(nextVy);

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

      if (ctx.gasPlatforms.length > 0) {
        for (const gp of ctx.gasPlatforms) {
          if (gp.active && isHeroOverlappingRect(hero.x, hero.y, gp, true)) {
            hero.setVelocityY(stepGasUpdraft(hero.body.velocity.y, dt, hero.upsideDown));
            hero.isDiving = false;
            break;
          }
        }
      }
    }
  }

  public updateQuantumPinning(time: number, delta: number): void {
    const ctx = this.ctx;
    if (ctx.pinnablePlatforms.length === 0) return;

    const prevPinnedId = ctx.quantumPinningState.pinnedPlatformId;
    let targetPinId: string | null = null;

    if (ctx.fKey?.isDown) {
      const focused = ctx.heroes.find((h) => h.isFocused && h.active) || ctx.heroes[0];
      if (focused) {
        const nearest = findNearestPinnablePlatform(
          focused.x,
          focused.y,
          ctx.pinnablePlatforms,
          PHYSICS.QUANTUM_PIN_RADIUS
        );
        if (nearest) {
          targetPinId = nearest.id;
        }
      }
    } else if (ctx.activePinPointerWorld) {
      const underPointer = findPinnablePlatformAtPoint(
        ctx.activePinPointerWorld.x,
        ctx.activePinPointerWorld.y,
        ctx.pinnablePlatforms
      );
      if (underPointer) {
        targetPinId = underPointer.id;
      }
    }

    ctx.quantumPinningState = stepQuantumPinning(ctx.quantumPinningState, targetPinId, delta);
    const nextPinnedId = ctx.quantumPinningState.pinnedPlatformId;

    for (const pp of ctx.pinnablePlatforms) {
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
          cooldownMs: ctx.quantumPinningState.cooldownRemainingMs
        });
      }
    }

    if (ctx.quantumPinGraphics) {
      const g = ctx.quantumPinGraphics;
      g.clear();
      if (nextPinnedId) {
        const pinned = ctx.pinnablePlatforms.find((p) => p.id === nextPinnedId);
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

  public updateWormholes(time: number): void {
    const ctx = this.ctx;
    const wormholes = ctx.levelData?.wormholes;
    if (!wormholes || wormholes.length === 0) return;

    if (ctx.wormholeGraphics) {
      const g = ctx.wormholeGraphics;
      g.clear();
      const pulse = 0.65 + 0.25 * Math.sin(time * 0.008);
      for (const wh of wormholes) {
        const colorNum = wh.color
          ? Phaser.Display.Color.HexStringToColor(wh.color).color
          : 0x22d3ee;
        g.lineStyle(3, colorNum, pulse);
        g.strokeCircle(wh.inX, wh.inY, PHYSICS.WORMHOLE_RADIUS);
        g.fillStyle(colorNum, 0.22);
        g.fillCircle(wh.inX, wh.inY, PHYSICS.WORMHOLE_RADIUS * 0.65);

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

    for (const hero of ctx.heroes) {
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
}
