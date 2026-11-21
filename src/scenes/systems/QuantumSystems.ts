import Phaser from 'phaser';
import { getStrings } from '../../i18n/strings';
import {
  calculateCollapse,
  checkPauliRepulsion,
  checkTunnelObstacle,
  togglePhase,
  updateDecayPlatform
} from '../../mechanics/quantumMechanics';
import {
  DEFAULT_OBSERVER_CONE_HALF_ANGLE_DEG,
  DEFAULT_OBSERVER_CONE_RANGE,
  OBSERVER_BEAM_HALF_ANGLE_DEG,
  OBSERVER_CONE_FLASH_MS,
  type ObserverCone,
  collapseSuperposition,
  computeObserverBeamAngleDeg,
  computeQuantumNoiseOffset,
  computeSuperpositionProbability,
  createSuperpositionState,
  getSuperposedRectForState,
  isSuperposedObjectAtPoint,
  isSuperposedObjectInCone,
  tickSuperpositionLock
} from '../../mechanics/wavefunctionCollapse';
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
import type { GameSceneContext, SuperposedPlatformEntry, SuperposedSpikeEntry } from './types';

/**
 * Main gameplay mechanics facade: particle power-ups, entanglement & tether,
 * clone fusion/fission, toroidal screen-wrap, matter states, quantum pinning,
 * wormholes, de Broglie crystallization, antigravity bubbles, and set-pieces.
 */
export class QuantumSystems {
  public readonly entanglement: EntanglementSystem;
  public readonly setPieces: SetPieceController;
  public readonly matterAndFields: MatterAndFieldController;
  private lastWavefunctionElapsedMs = 0;

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

    const toasts = getStrings(useGameStore.getState().locale ?? 'en').hud.toasts;
    const powerUpNames: Record<ParticleType, string> = toasts.powerUps;

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
        ctx.showRetroToast(toasts.conservationRestored);
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
    ctx.showRetroToast(getStrings(useGameStore.getState().locale ?? 'en').hud.toasts.superQuanta);
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
    ctx.showRetroToast(getStrings(useGameStore.getState().locale ?? 'en').hud.toasts.fission);
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

    this.updateCoherenceParticleMagnetism(delta);
    this.updatePressurePlatesAndGates();
    this.updateTunneling();
    this.updateAcceleratorMutations(time, delta);
    this.updatePauliRepulsion(time);
    this.updateDecayAndCollapse(delta, elapsedMs, timeDilationFactor);
    this.updateWavefunctionCollapse(time, delta, elapsedMs);
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
  }

  private updateCoherenceParticleMagnetism(delta: number): void {
    const ctx = this.ctx;
    const tier = ctx.coherenceSystem?.getTier?.() ?? 'x1';
    const coherenceRadius = tier === 'HYPER' ? 110 : tier === 'x3' ? 75 : 0;
    const acceleratorRadius = ctx.acceleratorModifiers?.particleMagnetRadiusPx ?? 0;
    const magnetRadius = Math.max(coherenceRadius, acceleratorRadius);
    if (magnetRadius <= 0) return;
    if (!ctx.particles || typeof ctx.particles.getChildren !== 'function') return;

    const coherenceSpeed = tier === 'HYPER' ? 420 : tier === 'x3' ? 280 : 0;
    const acceleratorSpeed = acceleratorRadius > 0 ? 260 : 0;
    const pullSpeed = Math.max(coherenceSpeed, acceleratorSpeed);
    const dt = Math.max(0, delta) / 1000;
    if (dt <= 0) return;

    const activeHeroes = ctx.heroes.filter((h) => h.active);
    if (activeHeroes.length === 0) return;

    const children = ctx.particles.getChildren() as Phaser.Physics.Arcade.Sprite[];
    for (const part of children) {
      if (!part?.active || part.visible === false) continue;

      let closestHero: Hero | null = null;
      let closestDist = magnetRadius;
      for (const hero of activeHeroes) {
        const dist = Math.hypot(hero.x - part.x, hero.y - part.y);
        if (dist > 1 && dist <= closestDist) {
          closestDist = dist;
          closestHero = hero;
        }
      }

      if (closestHero) {
        ctx.tweens?.killTweensOf?.(part);
        const step = Math.min(closestDist, pullSpeed * dt);
        const nx = (closestHero.x - part.x) / closestDist;
        const ny = (closestHero.y - part.y) / closestDist;
        part.x += nx * step;
        part.y += ny * step;
        const body = part.body as Phaser.Physics.Arcade.Body | undefined;
        if (body && 'x' in body && 'y' in body) {
          body.x = part.x - (body.width || 0) / 2;
          body.y = part.y - (body.height || 0) / 2;
        }
      }
    }
  }

  public updateAcceleratorMutations(time: number, delta: number): void {
    const ctx = this.ctx;
    const mods = ctx.acceleratorModifiers;
    if (!mods) return;

    const activeHeroes = ctx.heroes.filter((h) => h.active && h.body);
    if (activeHeroes.length === 0) return;

    // 1. Infinite Tunnel: regenerate 1 tunneling charge every tunnelRegenIntervalMs (default 4000 ms)
    if (mods.tunnelRegenIntervalMs > 0) {
      ctx.acceleratorTunnelTimerMs = (ctx.acceleratorTunnelTimerMs ?? 0) + delta;
      if (ctx.acceleratorTunnelTimerMs >= mods.tunnelRegenIntervalMs) {
        ctx.acceleratorTunnelTimerMs -= mods.tunnelRegenIntervalMs;
        const focused = activeHeroes.find((h) => h.isFocused) ?? activeHeroes[0];
        if (focused && focused.tunnelCharges < 2) {
          focused.tunnelCharges += 1;
        }
      }
    }

    // 2. Reflex Dilation: slow time briefly when approaching a spike (< 40 px)
    if (
      mods.reflexDilationRadiusPx > 0 &&
      mods.reflexDilationDurationMs > 0 &&
      time >= (ctx.acceleratorReflexCooldownUntil ?? 0) &&
      ctx.spikes?.getChildren
    ) {
      const spikeChildren = ctx.spikes.getChildren() as Phaser.GameObjects.Rectangle[];
      let nearSpike = false;
      for (const hero of activeHeroes) {
        for (const spike of spikeChildren) {
          if (!spike.active) continue;
          const sBody = spike.body as Phaser.Physics.Arcade.StaticBody | null | undefined;
          if (sBody && (!sBody.enable || sBody.checkCollision?.none)) continue;
          const dist = Math.hypot(hero.x - spike.x, hero.y - spike.y);
          if (dist < mods.reflexDilationRadiusPx) {
            nearSpike = true;
            break;
          }
        }
        if (nearSpike) break;
      }

      if (nearSpike) {
        ctx.acceleratorReflexDilationUntil = time + mods.reflexDilationDurationMs;
        ctx.acceleratorReflexCooldownUntil = time + Math.max(1500, mods.reflexDilationCooldownMs);
        gameEvents.emit('accelerator:reflex_dilation', {
          durationMs: mods.reflexDilationDurationMs
        });
      }
    }
  }

  private updatePressurePlatesAndGates(): void {
    const ctx = this.ctx;
    for (const h of ctx.heroes) {
      h.onPressurePlate = false;
    }
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
          h.onPressurePlate = true;
          h.onCryo = false;
          const touchingGround =
            h.upsideDown === 1
              ? Boolean(h.body.touching.down || h.body.blocked.down)
              : Boolean(h.body.touching.up || h.body.blocked.up);
          if (!h.isFocused && touchingGround) {
            h.setVelocityX(0);
          }
          if (!triggeringHero) {
            triggeringHero = h;
          }
        }
      }

      if (!hasHeroOnPlate && ctx.timeLoopSystem?.isActive()) {
        for (const echo of ctx.timeLoopSystem.getActiveEchoes()) {
          if (!echo.active) continue;
          if (isHeroOnPressurePlate(echo.x, echo.y, pl)) {
            hasHeroOnPlate = true;
            break;
          }
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
              if (triggeringHero?.body) {
                const touchingGround =
                  triggeringHero.upsideDown === 1
                    ? Boolean(triggeringHero.body.touching.down || triggeringHero.body.blocked.down)
                    : Boolean(triggeringHero.body.touching.up || triggeringHero.body.blocked.up);
                if (touchingGround) {
                  triggeringHero.setVelocityX(0);
                }
              }
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
          ctx.showRetroToast(
            getStrings(useGameStore.getState().locale ?? 'en').hud.toasts.tunnelingLeft(
              hero.tunnelCharges
            )
          );
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
          ctx.showRetroToast(
            getStrings(useGameStore.getState().locale ?? 'en').hud.toasts.frameTunnelingLeft(
              hero.tunnelCharges
            )
          );
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
        ctx.showRetroToast(
          getStrings(useGameStore.getState().locale ?? 'en').hud.toasts.pauliBlast
        );
        this.setPieces.drawPauliFlash(hA.x, hA.y, hB.x, hB.y);
        if (ctx.shakeCamera) {
          ctx.shakeCamera(130, 0.007);
        } else if (!useGameStore.getState().reducedEffects) {
          ctx.cameras?.main?.shake?.(130, 0.007);
        }
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

  public hasWavefunctionMechanics(): boolean {
    const ctx = this.ctx;
    return Boolean(
      (ctx.superposedPlatforms && ctx.superposedPlatforms.length > 0) ||
        (ctx.superposedSpikes && ctx.superposedSpikes.length > 0) ||
        (ctx.levelData?.observerBeams && ctx.levelData.observerBeams.length > 0)
    );
  }

  public hasSuperposedObjectAtPoint(worldX: number, worldY: number): boolean {
    const ctx = this.ctx;
    for (const entry of ctx.superposedPlatforms ?? []) {
      if (isSuperposedObjectAtPoint(entry.base, entry.config, worldX, worldY, 18)) {
        return true;
      }
    }
    for (const entry of ctx.superposedSpikes ?? []) {
      if (isSuperposedObjectAtPoint(entry.base, entry.config, worldX, worldY, 18)) {
        return true;
      }
    }
    return false;
  }

  public resetSuperpositions(): void {
    const ctx = this.ctx;
    this.lastWavefunctionElapsedMs = 0;
    ctx.activeObserverFlash = null;
    for (const entry of ctx.superposedPlatforms ?? []) {
      entry.runtime = createSuperpositionState(entry.config.lockDurationMs);
      this.syncSuperposedBody(entry, false);
    }
    for (const entry of ctx.superposedSpikes ?? []) {
      entry.runtime = createSuperpositionState(entry.config.lockDurationMs);
      this.syncSuperposedBody(entry, false);
    }
    ctx.wavefunctionGraphics?.clear();
    ctx.observerBeamGraphics?.clear();
  }

  public triggerActiveObservation(
    targetWorldPoint?: { x: number; y: number },
    elapsedMsOverride?: number
  ): number {
    const ctx = this.ctx;
    if (!this.hasWavefunctionMechanics()) return 0;

    const focusedHero = ctx.heroes.find((h) => h.isFocused && h.active) || ctx.heroes[0];
    if (!focusedHero) return 0;

    const elapsedMs =
      elapsedMsOverride !== undefined ? elapsedMsOverride : this.lastWavefunctionElapsedMs;
    const nowMs = ctx.time?.now ?? elapsedMs;

    let angleDeg = focusedHero.flipX ? 180 : 0;
    let range = DEFAULT_OBSERVER_CONE_RANGE;
    let collapsedCount = 0;

    if (targetWorldPoint) {
      angleDeg =
        (Math.atan2(targetWorldPoint.y - focusedHero.y, targetWorldPoint.x - focusedHero.x) * 180) /
        Math.PI;
      const dist = Math.hypot(
        targetWorldPoint.x - focusedHero.x,
        targetWorldPoint.y - focusedHero.y
      );
      range = Math.max(DEFAULT_OBSERVER_CONE_RANGE, Math.min(640, dist + 60));

      for (const entry of ctx.superposedPlatforms ?? []) {
        if (
          isSuperposedObjectAtPoint(
            entry.base,
            entry.config,
            targetWorldPoint.x,
            targetWorldPoint.y,
            20
          )
        ) {
          this.applyCollapseToEntry(entry, 'platform', elapsedMs, 'pointer');
          collapsedCount += 1;
        }
      }
      for (const entry of ctx.superposedSpikes ?? []) {
        if (
          isSuperposedObjectAtPoint(
            entry.base,
            entry.config,
            targetWorldPoint.x,
            targetWorldPoint.y,
            20
          )
        ) {
          this.applyCollapseToEntry(entry, 'spike', elapsedMs, 'pointer');
          collapsedCount += 1;
        }
      }
    }

    const cone: ObserverCone = {
      originX: focusedHero.x,
      originY: focusedHero.y,
      angleDeg,
      halfAngleDeg: DEFAULT_OBSERVER_CONE_HALF_ANGLE_DEG,
      range
    };

    ctx.activeObserverFlash = {
      ...cone,
      expiresAtMs: nowMs + OBSERVER_CONE_FLASH_MS,
      durationMs: OBSERVER_CONE_FLASH_MS
    };

    if (!targetWorldPoint || collapsedCount === 0) {
      for (const entry of ctx.superposedPlatforms ?? []) {
        if (isSuperposedObjectInCone(entry.base, entry.config, cone)) {
          this.applyCollapseToEntry(entry, 'platform', elapsedMs, 'player');
          collapsedCount += 1;
        }
      }
      for (const entry of ctx.superposedSpikes ?? []) {
        if (isSuperposedObjectInCone(entry.base, entry.config, cone)) {
          this.applyCollapseToEntry(entry, 'spike', elapsedMs, 'player');
          collapsedCount += 1;
        }
      }
    }

    return collapsedCount;
  }

  public updateWavefunctionCollapse(time: number, delta: number, elapsedMs: number): void {
    const ctx = this.ctx;
    this.lastWavefunctionElapsedMs = elapsedMs;

    const superPlats = ctx.superposedPlatforms ?? [];
    const superSpikes = ctx.superposedSpikes ?? [];
    const beams = ctx.levelData?.observerBeams ?? [];
    if (
      superPlats.length === 0 &&
      superSpikes.length === 0 &&
      beams.length === 0 &&
      !ctx.activeObserverFlash
    ) {
      return;
    }

    // 1. Tick lock countdowns and revert expired objects to intangible superposition
    for (const entry of superPlats) {
      const tick = tickSuperpositionLock(entry.runtime, delta);
      entry.runtime = tick.state;
      if (tick.released) {
        this.syncSuperposedBody(entry, false);
      }
    }
    for (const entry of superSpikes) {
      const tick = tickSuperpositionLock(entry.runtime, delta);
      entry.runtime = tick.state;
      if (tick.released) {
        this.syncSuperposedBody(entry, false);
      }
    }

    // 2. Passive sweeping ObserverBeams
    for (const beam of beams) {
      const angleDeg = computeObserverBeamAngleDeg(beam, elapsedMs);
      const beamCone: ObserverCone = {
        originX: beam.x,
        originY: beam.y,
        angleDeg,
        halfAngleDeg: OBSERVER_BEAM_HALF_ANGLE_DEG,
        range: beam.range
      };

      for (const entry of superPlats) {
        if (isSuperposedObjectInCone(entry.base, entry.config, beamCone)) {
          this.applyCollapseToEntry(entry, 'platform', elapsedMs, 'beam');
        }
      }
      for (const entry of superSpikes) {
        if (isSuperposedObjectInCone(entry.base, entry.config, beamCone)) {
          this.applyCollapseToEntry(entry, 'spike', elapsedMs, 'beam');
        }
      }
    }

    // 3. Render probability clouds, locked eigenstates, and countdown bars
    this.renderWavefunctionObjects(elapsedMs);

    // 4. Render passive observer beams and active observation cone flash
    this.renderObserverBeamsAndFlash(time, elapsedMs);
  }

  private applyCollapseToEntry(
    entry: SuperposedPlatformEntry | SuperposedSpikeEntry,
    kind: 'platform' | 'spike',
    elapsedMs: number,
    source: 'player' | 'beam' | 'pointer'
  ): void {
    const result = collapseSuperposition(
      entry.runtime,
      elapsedMs,
      entry.config,
      source,
      entry.phaseOffsetMs
    );
    entry.runtime = result.state;
    const rectBounds = getSuperposedRectForState(entry.base, entry.config, result.collapsedTo);
    entry.rect.setPosition(
      rectBounds.x + rectBounds.width / 2,
      rectBounds.y + rectBounds.height / 2
    );
    this.syncSuperposedBody(entry, true);

    if (result.changed) {
      gameEvents.emit('wavefunction:collapse', {
        id: entry.id,
        kind,
        collapsedTo: result.collapsedTo,
        source,
        x: rectBounds.x + rectBounds.width / 2,
        y: rectBounds.y + rectBounds.height / 2
      });
    }
  }

  private syncSuperposedBody(
    entry: SuperposedPlatformEntry | SuperposedSpikeEntry,
    solid: boolean
  ): void {
    const body = entry.rect.body as Phaser.Physics.Arcade.StaticBody | null;
    if (!body) return;
    body.enable = solid;
    if (body.checkCollision) {
      body.checkCollision.none = !solid;
    }
    if (solid) {
      body.updateFromGameObject?.();
    }
  }

  private renderWavefunctionObjects(elapsedMs: number): void {
    const ctx = this.ctx;
    const g = ctx.wavefunctionGraphics;
    if (!g) return;
    g.clear();

    const isReduced = useGameStore.getState().reducedEffects;

    for (const entry of ctx.superposedPlatforms ?? []) {
      const rectA = getSuperposedRectForState(entry.base, entry.config, 'A');
      const rectB = getSuperposedRectForState(entry.base, entry.config, 'B');
      const locked = entry.runtime.collapsedState;

      if (locked === null) {
        const p = computeSuperpositionProbability(
          elapsedMs,
          entry.config.periodMs,
          entry.phaseOffsetMs
        );
        const dominantA = p >= 0.5;
        const alphaA = 0.14 + 0.64 * p;
        const alphaB = 0.14 + 0.64 * (1 - p);

        // Entanglement link between state A and state B centers
        g.lineStyle(1, 0xa855f7, 0.28);
        g.lineBetween(
          rectA.x + rectA.width / 2,
          rectA.y + rectA.height / 2,
          rectB.x + rectB.width / 2,
          rectB.y + rectB.height / 2
        );

        // Ghost State A
        g.fillStyle(dominantA ? 0x00e5ff : 0xa855f7, alphaA);
        g.fillRect(rectA.x, rectA.y, rectA.width, rectA.height);
        g.lineStyle(dominantA ? 2.5 : 1, dominantA ? 0xfbbf24 : 0xc084fc, dominantA ? 0.95 : 0.45);
        g.strokeRect(rectA.x, rectA.y, rectA.width, rectA.height);

        // Ghost State B
        g.fillStyle(!dominantA ? 0x00e5ff : 0xa855f7, alphaB);
        g.fillRect(rectB.x, rectB.y, rectB.width, rectB.height);
        g.lineStyle(
          !dominantA ? 2.5 : 1,
          !dominantA ? 0xfbbf24 : 0xc084fc,
          !dominantA ? 0.95 : 0.45
        );
        g.strokeRect(rectB.x, rectB.y, rectB.width, rectB.height);

        // Deterministic quantum noise particles around the dominant silhouette
        if (!isReduced) {
          const domRect = dominantA ? rectA : rectB;
          const particleCount = Math.max(4, Math.min(10, Math.floor(domRect.width / 28)));
          g.fillStyle(0xe0f2fe, 0.72);
          for (let i = 0; i < particleCount; i++) {
            const frac = (i + 0.5) / particleCount;
            const noise = computeQuantumNoiseOffset(i, elapsedMs, 6);
            const px = domRect.x + domRect.width * frac + noise.dx;
            const py = domRect.y + domRect.height / 2 + noise.dy;
            g.fillCircle(px, py, 2);
          }
        }
      } else {
        const activeRect = locked === 'A' ? rectA : rectB;
        const ghostRect = locked === 'A' ? rectB : rectA;
        const lockRatio = Math.max(
          0,
          Math.min(1, entry.runtime.lockRemainingMs / entry.runtime.lockDurationMs)
        );

        // Faint unchosen ghost
        g.lineStyle(1, 0x64748b, 0.25);
        g.strokeRect(ghostRect.x, ghostRect.y, ghostRect.width, ghostRect.height);

        // Solid collapsed platform
        g.fillStyle(0x00e5ff, 0.92);
        g.fillRect(activeRect.x, activeRect.y, activeRect.width, activeRect.height);
        g.lineStyle(2.5, 0xfbbf24, 0.98);
        g.strokeRect(activeRect.x, activeRect.y, activeRect.width, activeRect.height);

        // Lock countdown bar
        const barH = 4;
        g.fillStyle(0x0f172a, 0.8);
        g.fillRect(activeRect.x, activeRect.y - barH - 2, activeRect.width, barH);
        g.fillStyle(lockRatio <= 0.25 ? 0xf43f5e : 0xfbbf24, 0.95);
        g.fillRect(activeRect.x, activeRect.y - barH - 2, activeRect.width * lockRatio, barH);
      }
    }

    for (const entry of ctx.superposedSpikes ?? []) {
      const rectA = getSuperposedRectForState(entry.base, entry.config, 'A');
      const rectB = getSuperposedRectForState(entry.base, entry.config, 'B');
      const locked = entry.runtime.collapsedState;

      if (locked === null) {
        const p = computeSuperpositionProbability(
          elapsedMs,
          entry.config.periodMs,
          entry.phaseOffsetMs
        );
        const dominantA = p >= 0.5;
        const alphaA = 0.14 + 0.62 * p;
        const alphaB = 0.14 + 0.62 * (1 - p);

        g.lineStyle(1, 0xf43f5e, 0.25);
        g.lineBetween(
          rectA.x + rectA.width / 2,
          rectA.y + rectA.height / 2,
          rectB.x + rectB.width / 2,
          rectB.y + rectB.height / 2
        );

        this.drawSpikeTeeth(g, rectA, alphaA, dominantA ? 0xfbbf24 : 0xf43f5e, dominantA ? 2 : 1);
        this.drawSpikeTeeth(g, rectB, alphaB, !dominantA ? 0xfbbf24 : 0xf43f5e, !dominantA ? 2 : 1);
      } else {
        const activeRect = locked === 'A' ? rectA : rectB;
        const ghostRect = locked === 'A' ? rectB : rectA;
        const lockRatio = Math.max(
          0,
          Math.min(1, entry.runtime.lockRemainingMs / entry.runtime.lockDurationMs)
        );

        g.lineStyle(1, 0x64748b, 0.22);
        g.strokeRect(ghostRect.x, ghostRect.y, ghostRect.width, ghostRect.height);

        this.drawSpikeTeeth(g, activeRect, 0.96, 0xfbbf24, 2);

        const barH = 4;
        g.fillStyle(0x0f172a, 0.8);
        g.fillRect(activeRect.x, activeRect.y - barH - 2, activeRect.width, barH);
        g.fillStyle(lockRatio <= 0.25 ? 0x38bdf8 : 0xfbbf24, 0.95);
        g.fillRect(activeRect.x, activeRect.y - barH - 2, activeRect.width * lockRatio, barH);
      }
    }
  }

  private drawSpikeTeeth(
    g: Phaser.GameObjects.Graphics,
    rect: { x: number; y: number; width: number; height: number },
    alpha: number,
    strokeColor: number,
    strokeWidth: number
  ): void {
    const toothWidth = rect.width <= 40 ? Math.max(10, Math.round(rect.width / 2)) : 16;
    const count = Math.max(1, Math.floor(rect.width / toothWidth));
    const actualToothW = rect.width / count;

    g.fillStyle(0xff2a55, alpha);
    g.lineStyle(strokeWidth, strokeColor, Math.min(1, alpha + 0.15));
    for (let i = 0; i < count; i++) {
      const x0 = rect.x + i * actualToothW;
      const xMid = x0 + actualToothW / 2;
      const x1 = x0 + actualToothW;
      const yBase = rect.y + rect.height;
      const yTip = rect.y;
      g.fillTriangle?.(x0, yBase, xMid, yTip, x1, yBase);
      g.strokeTriangle?.(x0, yBase, xMid, yTip, x1, yBase);
    }
  }

  private renderObserverBeamsAndFlash(time: number, elapsedMs: number): void {
    const ctx = this.ctx;
    const g = ctx.observerBeamGraphics;
    if (!g) return;
    g.clear();

    // Passive sweeping ObserverBeams
    for (const beam of ctx.levelData?.observerBeams ?? []) {
      const angleDeg = computeObserverBeamAngleDeg(beam, elapsedMs);
      const radCenter = (angleDeg * Math.PI) / 180;
      const radLeft = ((angleDeg - OBSERVER_BEAM_HALF_ANGLE_DEG) * Math.PI) / 180;
      const radRight = ((angleDeg + OBSERVER_BEAM_HALF_ANGLE_DEG) * Math.PI) / 180;

      const xL = beam.x + Math.cos(radLeft) * beam.range;
      const yL = beam.y + Math.sin(radLeft) * beam.range;
      const xR = beam.x + Math.cos(radRight) * beam.range;
      const yR = beam.y + Math.sin(radRight) * beam.range;
      const xC = beam.x + Math.cos(radCenter) * beam.range;
      const yC = beam.y + Math.sin(radCenter) * beam.range;

      // Sweeping light cone
      g.fillStyle(0xfbbf24, 0.14);
      g.fillTriangle?.(beam.x, beam.y, xL, yL, xR, yR);
      g.lineStyle(1.5, 0xfbbf24, 0.55);
      g.lineBetween(beam.x, beam.y, xL, yL);
      g.lineBetween(beam.x, beam.y, xR, yR);

      // Core observation laser
      g.lineStyle(2, 0x00e5ff, 0.85);
      g.lineBetween(beam.x, beam.y, xC, yC);

      // Emitter eye housing
      g.fillStyle(0x0b0f19, 0.95);
      g.fillCircle(beam.x, beam.y, 14);
      g.lineStyle(2, 0xfbbf24, 0.95);
      g.strokeCircle(beam.x, beam.y, 14);
      // Pupil tracking sweep direction
      g.fillStyle(0x00e5ff, 1);
      g.fillCircle(beam.x + Math.cos(radCenter) * 5, beam.y + Math.sin(radCenter) * 5, 4);
    }

    // Active player observation cone flash (220 ms)
    const flash = ctx.activeObserverFlash;
    if (flash) {
      const remaining = flash.expiresAtMs - time;
      if (remaining <= 0) {
        ctx.activeObserverFlash = null;
      } else {
        const ratio = Math.max(0, Math.min(1, remaining / flash.durationMs));
        const radLeft = ((flash.angleDeg - flash.halfAngleDeg) * Math.PI) / 180;
        const radRight = ((flash.angleDeg + flash.halfAngleDeg) * Math.PI) / 180;
        const radMid = (flash.angleDeg * Math.PI) / 180;

        const xL = flash.originX + Math.cos(radLeft) * flash.range;
        const yL = flash.originY + Math.sin(radLeft) * flash.range;
        const xR = flash.originX + Math.cos(radRight) * flash.range;
        const yR = flash.originY + Math.sin(radRight) * flash.range;
        const xM = flash.originX + Math.cos(radMid) * flash.range;
        const yM = flash.originY + Math.sin(radMid) * flash.range;

        g.fillStyle(0x00e5ff, 0.24 * ratio);
        g.fillTriangle?.(flash.originX, flash.originY, xL, yL, xR, yR);
        g.lineStyle(2.5, 0xfbbf24, 0.9 * ratio);
        g.lineBetween(flash.originX, flash.originY, xL, yL);
        g.lineBetween(flash.originX, flash.originY, xR, yR);
        g.lineStyle(1.5, 0x00e5ff, 0.75 * ratio);
        g.lineBetween(flash.originX, flash.originY, xM, yM);
      }
    }
  }
}
