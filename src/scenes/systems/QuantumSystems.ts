import Phaser from 'phaser';
import { getStrings } from '../../i18n/strings';
import {
  calculateCollapse,
  checkPauliRepulsion,
  checkTunnelObstacle,
  togglePhase,
  updateDecayPlatform
} from '../../mechanics/quantumMechanics';
import { PHYSICS } from '../../physics/constants';
import {
  applyToroidalScreenWrap,
  canFuseClones,
  computeFissionVelocities,
  getScreenWrapAxes,
  getScreenWrapGhostPositions
} from '../../physics/entanglementTether';
import { applyLowGravity, isHeroOnPressurePlate } from '../../physics/stepHeroPhysics';
import { useGameStore } from '../../store';
import { gameEvents } from '../../tools/gameEvents';
import type { ParticleType, PlatformPhase } from '../../types';
import Hero from '../Hero';
import { EntanglementSystem } from './EntanglementSystem';
import { MatterAndFieldController } from './MatterAndFieldController';
import { SetPieceController } from './SetPieceController';
import type { GameSceneContext } from './types';

/**
 * Main gameplay mechanics facade: particle power-ups, entanglement & tether,
 * clone fusion/fission, toroidal screen-wrap, matter states, quantum pinning,
 * wormholes, de Broglie crystallization, antigravity bubbles, and set-pieces.
 */
export class QuantumSystems {
  public readonly entanglement: EntanglementSystem;
  public readonly setPieces: SetPieceController;
  public readonly matterAndFields: MatterAndFieldController;

  constructor(private readonly ctx: GameSceneContext) {
    this.entanglement = new EntanglementSystem(ctx);
    this.setPieces = new SetPieceController(ctx);
    this.matterAndFields = new MatterAndFieldController(ctx);
  }

  public collectParticle(hero: Hero, particle: Phaser.Physics.Arcade.Sprite): void {
    const ctx = this.ctx;
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
        ctx.hasCondenseAbility = true;
        break;
      }
      case 'duplicate': {
        const uncertainty = ctx.levelData.uncertainty ?? 3;
        if (ctx.heroes.length < uncertainty) {
          const spawnX = Phaser.Math.Clamp(hero.x - 45, 32, ctx.levelData.width - 32);
          const clonedHero = new Hero(ctx as unknown as Phaser.Scene, spawnX, hero.y - 10, false);
          clonedHero.createdAtMs = ctx.time?.now ?? 0;
          clonedHero.velocityMultiplier = hero.velocityMultiplier;
          clonedHero.setGravityInverted(ctx.physics.world.gravity.y < 0);
          clonedHero.pauliGraceUntil = ctx.time.now + 500;
          clonedHero.setTint(0x38bdf8);
          ctx.heroes.push(clonedHero);
          ctx.heroGroup.add(clonedHero);
          ctx.updateEdgePips();
          gameEvents.emit('hero:duplicate', { count: ctx.heroes.length });
        }
        break;
      }
      case 'speed': {
        hero.velocityMultiplier = PHYSICS.HERO_SPEED_BOOST;
        break;
      }
      case 'lowGravity': {
        const sign = ctx.physics.world.gravity.y < 0 ? -1 : 1;
        const currentMult = Math.abs(ctx.physics.world.gravity.y) / PHYSICS.GRAVITY_Y;
        const nextMult = applyLowGravity(currentMult);
        ctx.physics.world.gravity.y = sign * PHYSICS.GRAVITY_Y * nextMult;
        break;
      }
      case 'antiGravity': {
        ctx.physics.world.gravity.y *= -1;
        const inverted = ctx.physics.world.gravity.y < 0;
        for (const h of ctx.heroes) {
          h.setGravityInverted(inverted);
        }
        break;
      }
      case 'tunnel': {
        hero.tunnelCharges = 1;
        break;
      }
      case 'pauli': {
        ctx.isPauliActive = true;
        for (const h of ctx.heroes) {
          h.pauliGraceUntil = ctx.time.now + 500;
        }
        break;
      }
      case 'timeDilation': {
        ctx.isTimeDilationActive = true;
        ctx.timeDilationUntil = ctx.time.now + PHYSICS.TIME_DILATION_DURATION_MS;
        gameEvents.emit('time:dilation', {
          active: true,
          durationMs: PHYSICS.TIME_DILATION_DURATION_MS
        });
        break;
      }
    }

    if (particle.getData('restoresEphemeral') === true || ctx.ephemeralPlatforms.length > 0) {
      const restored = this.setPieces.restoreEphemeralPlatforms();
      if (restored > 0) {
        ctx.showRetroToast('CONSERVATION ! CAGE RESTORED');
      }
    }

    ctx.bohrBackground?.addValenceElectron();
    ctx.showRetroToast(powerUpNames[type] || '');
  }

  public togglePhasePlatforms(): void {
    const ctx = this.ctx;
    if (!ctx.hasPhasePlatforms) return;
    this.toggleLevelPhase();
    if (ctx.phaseIndicatorText?.active) {
      ctx.phaseIndicatorText.setScale(1.25);
      ctx.phaseIndicatorText.setAlpha(1);
      if (ctx.tweens?.add) {
        ctx.tweens.add({
          targets: ctx.phaseIndicatorText,
          scaleX: 1,
          scaleY: 1,
          duration: 180,
          ease: 'Cubic.easeOut'
        });
      }
    }
  }

  public toggleLevelPhase(): void {
    const ctx = this.ctx;
    if (!ctx.hasPhasePlatforms) return;
    ctx.currentPhase = togglePhase(ctx.currentPhase);
    this.applyPhase(ctx.currentPhase);
    gameEvents.emit('phase:shift', { phase: ctx.currentPhase });
    if (ctx.phaseIndicatorText?.active) {
      const t = getStrings(useGameStore.getState().locale ?? 'en');
      ctx.phaseIndicatorText.setText(t.hud.phase(ctx.currentPhase));
      ctx.phaseIndicatorText.setColor(ctx.currentPhase === 'cyan' ? '#00ffff' : '#ec4899');
    }
  }

  public applyPhase(phase: PlatformPhase): void {
    const pinnedId = this.ctx.quantumPinningState.pinnedPlatformId;
    for (const { rect, phase: pPhase } of this.ctx.phasePlatforms) {
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

  public tryCloneFusion(nowMs = this.ctx.time?.now ?? 0): boolean {
    const ctx = this.ctx;
    if (ctx.heroes.length < 2 || ctx.isEntangled || ctx.isPauliActive) return false;
    if (ctx.levelData.allowCloneFusion === false) return false;

    const focused = ctx.heroes.find((h) => h.isFocused && h.active);
    if (!focused) return false;

    const target = ctx.heroes.find(
      (h) =>
        h !== focused &&
        h.active &&
        canFuseClones(focused, h, nowMs, {
          isEntangled: ctx.isEntangled,
          isPauliActive: ctx.isPauliActive,
          allowCloneFusion: ctx.levelData.allowCloneFusion
        })
    );
    if (!target) return false;

    const nextStack = Math.min(3, focused.fusionStack + target.fusionStack);
    target.destroy();
    ctx.heroes = ctx.heroes.filter((h) => h !== target && h.active);
    focused.setFusionStack(nextStack);
    ctx.updateEdgePips();
    ctx.showRetroToast('SUPER-QUANTA !');
    gameEvents.emit('hero:fusion', {
      x: focused.x,
      y: focused.y,
      fusionStack: focused.fusionStack
    });
    return true;
  }

  public tryInFlightFission(): boolean {
    const ctx = this.ctx;
    if (ctx.isEntangled) return false;
    const focused = ctx.heroes.find((h) => h.isFocused && h.active);
    if (!focused || focused.fusionStack < 2 || !focused.body) return false;

    const touchingGround =
      focused.upsideDown === 1
        ? focused.body.touching.down || focused.body.blocked.down
        : focused.body.touching.up || focused.body.blocked.up;
    if (touchingGround) return false;

    const nowMs = ctx.time?.now ?? 0;
    const { upperVy, lowerVy } = computeFissionVelocities(focused.upsideDown);

    focused.setFusionStack(focused.fusionStack - 1);
    focused.setVelocityY(upperVy);

    const lowerClone = new Hero(
      ctx as unknown as Phaser.Scene,
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
    ctx.heroes.push(lowerClone);
    ctx.heroGroup.add(lowerClone);

    ctx.updateEdgePips();
    ctx.showRetroToast('FISSION !');
    gameEvents.emit('hero:fission', { x: focused.x, y: focused.y });
    return true;
  }

  public updateScreenWrap(time: number): void {
    const ctx = this.ctx;
    const wrapAxes = getScreenWrapAxes(ctx.levelData.screenWrap);
    if (!wrapAxes.horizontal && !wrapAxes.vertical) return;

    const w = ctx.levelData.width;
    const h = ctx.levelData.height;

    for (const hero of ctx.heroes) {
      if (!hero.active) continue;
      const wrapped = applyToroidalScreenWrap(
        { x: hero.x, y: hero.y },
        w,
        h,
        ctx.levelData.screenWrap
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

    if (ctx.screenWrapGraphics) {
      const g = ctx.screenWrapGraphics;
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

    if (ctx.add?.sprite) {
      const ghostCoords: Array<{ pos: { x: number; y: number }; hero: Hero }> = [];
      for (const hero of ctx.heroes) {
        if (!hero.active) continue;
        const positions = getScreenWrapGhostPositions(
          { x: hero.x, y: hero.y },
          w,
          h,
          ctx.levelData.screenWrap
        );
        for (const pos of positions) {
          ghostCoords.push({ pos, hero });
        }
      }

      while (ctx.screenWrapGhosts.length < ghostCoords.length) {
        const ghost = ctx.add.sprite(0, 0, 'hero');
        ghost.setAlpha(0.55);
        ghost.setTint(0x22d3ee);
        ghost.setDepth(18);
        ctx.screenWrapGhosts.push(ghost);
      }

      for (let i = 0; i < ctx.screenWrapGhosts.length; i++) {
        const ghost = ctx.screenWrapGhosts[i];
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

  public updateWorldMechanics(
    time: number,
    delta: number,
    elapsedMs: number,
    timeDilationFactor: number
  ): void {
    const ctx = this.ctx;

    this.matterAndFields.updateMatterStates(time, delta);
    this.matterAndFields.updateQuantumPinning(time, delta);
    this.matterAndFields.updateWormholes(time);
    this.matterAndFields.updateBroglieCrystals(time);

    if (ctx.levelData.screenWrap) {
      this.updateScreenWrap(time);
    }

    if (ctx.heroes.length >= 2 && !ctx.isEntangled && !ctx.isPauliActive) {
      this.tryCloneFusion(time);
    }

    if (ctx.fusionHaloGraphics) {
      ctx.fusionHaloGraphics.clear();
      const pulse = 0.55 + 0.25 * Math.sin(time * 0.008);
      for (const hero of ctx.heroes) {
        if (hero.active && hero.fusionStack >= 2) {
          ctx.fusionHaloGraphics.lineStyle(3, 0xfbbf24, pulse);
          ctx.fusionHaloGraphics.strokeCircle(hero.x, hero.y, 28);
          ctx.fusionHaloGraphics.lineStyle(1.5, 0x00e5ff, pulse * 0.9);
          ctx.fusionHaloGraphics.strokeCircle(hero.x, hero.y, 33);
        }
      }
    }

    if (ctx.diveTrailGraphics) {
      ctx.diveTrailGraphics.clear();
      const isReduced = useGameStore.getState().reducedEffects;
      for (const hero of ctx.heroes) {
        if (hero.active && hero.isDiving) {
          const trailLen = isReduced ? 28 : 48;
          const tailY = hero.y - trailLen * hero.upsideDown;
          ctx.diveTrailGraphics.lineStyle(isReduced ? 2 : 4, 0x00e5ff, 0.75);
          ctx.diveTrailGraphics.beginPath();
          ctx.diveTrailGraphics.moveTo(hero.x, hero.y);
          ctx.diveTrailGraphics.lineTo(hero.x, tailY);
          ctx.diveTrailGraphics.strokePath();
          if (!isReduced) {
            ctx.diveTrailGraphics.lineStyle(1.5, 0xffffff, 0.85);
            ctx.diveTrailGraphics.beginPath();
            ctx.diveTrailGraphics.moveTo(hero.x, hero.y);
            ctx.diveTrailGraphics.lineTo(hero.x, hero.y - 26 * hero.upsideDown);
            ctx.diveTrailGraphics.strokePath();
          }
        }
      }
    }

    this.updatePressurePlatesAndGates();
    this.updateTunneling();
    this.updatePauliRepulsion(time);
    this.updateDecayAndCollapse(delta, elapsedMs, timeDilationFactor);
    this.updateMovingPlatforms(timeDilationFactor);

    ctx.bohrBackground?.update(time, delta);
    for (const mol of ctx.molecules) {
      mol.circle.x += mol.vx;
      mol.circle.y += mol.vy;
      if (mol.circle.x < 0) mol.circle.x = ctx.levelData.width;
      if (mol.circle.x > ctx.levelData.width) mol.circle.x = 0;
      if (mol.circle.y < 0) mol.circle.y = ctx.levelData.height;
      if (mol.circle.y > ctx.levelData.height) mol.circle.y = 0;
    }

    this.matterAndFields.updateAntigravityBubbles(time);
  }

  private updatePressurePlatesAndGates(): void {
    const ctx = this.ctx;
    if (ctx.pressurePlatesList.length === 0) return;

    for (const item of ctx.pressurePlatesList) {
      const pl = item.data;
      const pad = item.padRect;
      let hasHeroOnPlate = false;
      let triggeringHero: Hero | null = null;

      for (const h of ctx.heroes) {
        if (!h.active || !h.body) continue;
        if (isHeroOnPressurePlate(h.x, h.y, pl)) {
          hasHeroOnPlate = true;
          triggeringHero = h;
          break;
        }
      }

      const gateEntry = ctx.gatesMap.get(pl.targetGateId);
      if (hasHeroOnPlate) {
        if (!item.isPressed) {
          item.isPressed = true;
          pad.setY(item.startY + 3);
          pad.setFillStyle(0x059669);
          gameEvents.emit('plate:trigger', { plateId: pl.id, gateId: pl.targetGateId });

          if ((triggeringHero?.isFocused || pl.autoSwitchOnTrigger) && ctx.heroes.length > 1) {
            const otherHero = ctx.heroes.find((hero) => hero !== triggeringHero && hero.active);
            if (otherHero) {
              triggeringHero?.setFocus(false);
              otherHero.setFocus(true);
              ctx.cameras.main.startFollow(otherHero, true, 0.1, 0.1);
              ctx.updateEdgePips();
            }
          }
        }
        if (gateEntry) {
          gateEntry.rect.setAlpha(0);
          const body = gateEntry.rect.body as Phaser.Physics.Arcade.StaticBody | null;
          if (body) body.enable = false;
        }
      } else if (pl.requireLock) {
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

  private updateTunneling(): void {
    const ctx = this.ctx;
    for (const hero of ctx.heroes) {
      if (!hero.active || hero.tunnelCharges <= 0 || !hero.body) continue;
      const rawLeft =
        (ctx.cursors?.left?.isDown ?? false) ||
        (ctx.wasd?.A?.isDown ?? false) ||
        ctx.touchController.state.left;
      const rawRight =
        (ctx.cursors?.right?.isDown ?? false) ||
        (ctx.wasd?.D?.isDown ?? false) ||
        ctx.touchController.state.right;
      const dir = rawLeft ? 'left' : rawRight ? 'right' : null;
      if (!dir) continue;

      let tunneled = false;
      for (const p of ctx.levelData.platforms) {
        const result = checkTunnelObstacle(hero.x, hero.y, 40, 40, dir, p);
        if (result?.canTunnel) {
          hero.x = result.exitX;
          hero.body.x = hero.x - hero.body.width / 2;
          hero.tunnelCharges--;
          gameEvents.emit('tunnel:use', { remaining: hero.tunnelCharges });
          ctx.showRetroToast(`TUNNELING ! (${hero.tunnelCharges} LEFT)`);
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
          ctx.levelData.width
        );
        if (edgeResult?.canTunnel) {
          hero.x = edgeResult.exitX;
          hero.body.x = hero.x - hero.body.width / 2;
          hero.tunnelCharges--;
          gameEvents.emit('tunnel:use', { remaining: hero.tunnelCharges, screenEdge: true });
          ctx.showRetroToast(`FRAME TUNNELING ! (${hero.tunnelCharges} LEFT)`);
        }
      }
    }
  }

  private updatePauliRepulsion(time: number): void {
    const ctx = this.ctx;
    if (!ctx.isPauliActive || ctx.heroes.length < 2) return;
    const activeHeroes = ctx.heroes.filter((h) => h.active && h.body);
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
        ctx.showRetroToast('PAULI BLAST !');
        this.setPieces.drawPauliFlash(hA.x, hA.y, hB.x, hB.y);
      }
    }
  }

  private updateDecayAndCollapse(
    delta: number,
    elapsedMs: number,
    timeDilationFactor: number
  ): void {
    const ctx = this.ctx;
    for (const dp of ctx.decayPlatforms) {
      const prevCollapsed = dp.state.collapsed;
      const decayUpdate = updateDecayPlatform(dp.state, delta, timeDilationFactor);
      dp.rect.alpha = decayUpdate.alpha;
      const body = dp.rect.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.checkCollision.none = !decayUpdate.solid;
      }
      dp.rect.x = decayUpdate.shaking ? dp.startX + (Math.random() * 4 - 2) : dp.startX;
      if (!prevCollapsed && decayUpdate.collapsed) {
        gameEvents.emit('platform:decay', { x: dp.rect.x, y: dp.rect.y });
      }
    }

    if (ctx.collapseConfig && ctx.collapseTopSpikes && ctx.collapseBottomSpikes) {
      const { active, stepY } = calculateCollapse(
        ctx.collapseConfig,
        elapsedMs,
        delta,
        timeDilationFactor
      );
      if (active && stepY > 0) {
        ctx.collapseTopSpikes.y += stepY;
        ctx.collapseBottomSpikes.y -= stepY;
        const topBody = ctx.collapseTopSpikes.body as Phaser.Physics.Arcade.StaticBody | null;
        const botBody = ctx.collapseBottomSpikes.body as Phaser.Physics.Arcade.StaticBody | null;
        if (topBody) topBody.updateFromGameObject();
        if (botBody) botBody.updateFromGameObject();
      }
    }
  }

  private updateMovingPlatforms(timeDilationFactor: number): void {
    for (const mp of this.ctx.movingPlatforms) {
      const body = mp.rect.body as Phaser.Physics.Arcade.Body;
      const targetX = mp.movesTo.x !== undefined ? mp.movesTo.x + mp.width / 2 : mp.startX;
      const targetY = mp.movesTo.y !== undefined ? mp.movesTo.y + mp.height / 2 : mp.startY;
      const minX = Math.min(mp.startX, targetX);
      const maxX = Math.max(mp.startX, targetX);
      const minY = Math.min(mp.startY, targetY);
      const maxY = Math.max(mp.startY, targetY);

      if (mp.direction.x === 'right') {
        body.setVelocityX(PHYSICS.MOVING_PLATFORM_SPEED_X * timeDilationFactor);
        if (mp.rect.x >= maxX) mp.direction.x = 'left';
      } else if (mp.direction.x === 'left') {
        body.setVelocityX(-PHYSICS.MOVING_PLATFORM_SPEED_X * timeDilationFactor);
        if (mp.rect.x <= minX) mp.direction.x = 'right';
      }

      if (mp.direction.y === 'bottom') {
        body.setVelocityY(PHYSICS.MOVING_PLATFORM_SPEED_Y * timeDilationFactor);
        if (mp.rect.y >= maxY) mp.direction.y = 'top';
      } else if (mp.direction.y === 'top') {
        body.setVelocityY(-PHYSICS.MOVING_PLATFORM_SPEED_Y * timeDilationFactor);
        if (mp.rect.y <= minY) mp.direction.y = 'bottom';
      }
    }
  }
}
