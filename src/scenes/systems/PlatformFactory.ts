import Phaser from 'phaser';
import type { DecayPlatformState } from '../../mechanics/quantumMechanics';
import { PHYSICS } from '../../physics/constants';
import { getScreenWrapAxes, shouldBreakCrackedPlatform } from '../../physics/entanglementTether';
import {
  getPlasmaBounceVelocity,
  normalizeMatterState,
  shouldPlungeIntoLiquid
} from '../../physics/matterStates';
import { gameEvents } from '../../tools/gameEvents';
import { isGodMode } from '../../tools/godMode';
import type { MatterState, ParticleType } from '../../types';
import type Hero from '../Hero';
import type { GameSceneContext } from './types';

/**
 * Builds level geometry (bounds, platforms, spikes, collapse jaws, particles,
 * portals, gates, pressure plates) and wires Arcade Physics colliders/overlaps.
 */
export function buildSceneBounds(ctx: GameSceneContext): void {
  ctx.sceneBounds = ctx.physics.add.staticGroup();
  const wrapAxes = getScreenWrapAxes(ctx.levelData.screenWrap);

  if (!wrapAxes.horizontal) {
    const leftWall = ctx.add.rectangle(-20, ctx.levelData.height / 2, 40, ctx.levelData.height);
    ctx.physics.add.existing(leftWall, true);
    leftWall.setVisible(false);
    leftWall.setData('boundary', 'left');
    ctx.sceneBounds.add(leftWall);

    const rightWall = ctx.add.rectangle(
      ctx.levelData.width + 20,
      ctx.levelData.height / 2,
      40,
      ctx.levelData.height
    );
    ctx.physics.add.existing(rightWall, true);
    rightWall.setVisible(false);
    rightWall.setData('boundary', 'right');
    ctx.sceneBounds.add(rightWall);
  }

  if (!wrapAxes.vertical) {
    const ceiling = ctx.add.rectangle(ctx.levelData.width / 2, -20, ctx.levelData.width + 80, 40);
    ctx.physics.add.existing(ceiling, true);
    ceiling.setVisible(false);
    ceiling.setData('boundary', 'ceiling');
    ctx.sceneBounds.add(ceiling);
  }

  if (wrapAxes.horizontal || wrapAxes.vertical) {
    ctx.screenWrapGraphics = ctx.add.graphics();
    ctx.screenWrapGraphics.setDepth(22);
  }
}

export function buildPlatforms(ctx: GameSceneContext): void {
  ctx.platforms = ctx.physics.add.staticGroup();
  ctx.movingPlatformsGroup = ctx.physics.add.group({
    allowGravity: false,
    immovable: true,
    frictionX: 1
  });
  const antiHueColor = Phaser.Display.Color.HexStringToColor(ctx.levelData.antiHue).color;

  ctx.hasPhasePlatforms = ctx.levelData.platforms.some((p) => Boolean(p.phase));
  if (ctx.hasPhasePlatforms) {
    ctx.currentPhase = 'cyan';
  }
  ctx.unsubJump = gameEvents.on('hero:jump', () => {
    if (!ctx.isLevelCompleted && !ctx.isRespawning && !ctx.isTransitioningLevel) {
      ctx.jumpCount += 1;
    }
    if (ctx.hasPhasePlatforms) {
      ctx.toggleLevelPhase();
    }
  });

  for (let platIdx = 0; platIdx < ctx.levelData.platforms.length; platIdx++) {
    const p = ctx.levelData.platforms[platIdx];
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

    const rect = ctx.add.rectangle(
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
      ctx.ephemeralPlatforms.push(rect);
    }

    if (isWall) {
      rect.setStrokeStyle(2, 0xffffff);
      rect.setData('kind', 'wall');
    } else if (matterState === 'liquid') {
      rect.setStrokeStyle(2, 0x38bdf8, 0.9);
      let waveGfx: Phaser.GameObjects.Graphics | undefined;
      if (typeof ctx.add.graphics === 'function') {
        waveGfx = ctx.add.graphics();
        waveGfx.setDepth?.(14);
        const topY = p.y + 3;
        const step = 12;
        waveGfx.lineStyle(2, 0xe0f2fe, 0.92);
        waveGfx.beginPath();
        for (let wx = 0; wx <= width; wx += step) {
          const px = p.x + Math.min(wx, width);
          const py = topY + Math.sin((wx / step) * Math.PI) * 2.5;
          if (wx === 0) {
            waveGfx.moveTo(px, py);
          } else {
            waveGfx.lineTo(px, py);
          }
        }
        waveGfx.strokePath();
        // Subtle surface reflections for immediate liquid readability
        waveGfx.lineStyle(1.5, 0xbae6fd, 0.55);
        for (let sx = 12; sx < width - 16; sx += 34) {
          waveGfx.lineBetween(p.x + sx, p.y + 11, p.x + Math.min(sx + 16, width - 8), p.y + 11);
        }
      }
      ctx.liquidPlatforms.push({ rect, startY: p.y + height / 2, waveGfx });
    } else if (matterState === 'gas') {
      rect.setStrokeStyle(1.5, 0xc084fc, 0.75);
      ctx.gasPlatforms.push(rect);
    } else if (matterState === 'cryo') {
      rect.setStrokeStyle(2, 0xe0f2fe, 0.95);
    } else if (matterState === 'plasma') {
      rect.setStrokeStyle(2, 0xfbbf24, 0.95);
    }

    if (p.phase) {
      rect.setData('phase', p.phase);
      ctx.phasePlatforms.push({ rect, phase: p.phase });
    }

    if (p.cracked) {
      rect.setData('cracked', true);
      rect.setStrokeStyle(2, 0xfbbf24, 0.85);
      ctx.crackedPlatforms.push(rect);
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
      ctx.decayPlatforms.push({
        rect,
        state: decayState,
        startX: p.x + width / 2,
        startY: p.y + height / 2
      });
    }

    if (p.phase || (p.decayMs && p.decayMs > 0)) {
      const pinId = `plat_${platIdx}`;
      rect.setData('pinId', pinId);
      ctx.pinnablePlatforms.push({
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
      ctx.physics.add.existing(rect, false);
      ctx.movingPlatformsGroup.add(rect);
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
      ctx.movingPlatforms.push({
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
      ctx.physics.add.existing(rect, true);
      if (matterState === 'gas') {
        const gasBody = rect.body as Phaser.Physics.Arcade.StaticBody | null;
        if (gasBody) {
          gasBody.checkCollision.none = true;
        }
      }
      ctx.platforms.add(rect);
    }
  }

  if (ctx.hasPhasePlatforms) {
    ctx.applyPhase(ctx.currentPhase);
  }
}

export function buildSpikesAndCollapse(ctx: GameSceneContext): void {
  ctx.spikes = ctx.physics.add.staticGroup();
  const spikeGfx = ctx.add.graphics();
  spikeGfx.setDepth(12);
  ctx.spikeGfx = spikeGfx;

  for (const s of ctx.levelData.spikes) {
    const width = s.width ?? 200;
    const height = s.height ?? 20;
    const spikeRect = ctx.add.rectangle(
      s.x + width / 2,
      s.y + height / 2,
      width,
      height,
      0xff2244,
      0.15
    );
    ctx.physics.add.existing(spikeRect, true);
    ctx.spikes.add(spikeRect);

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

  if (ctx.levelData.collapse) {
    ctx.collapseConfig = ctx.levelData.collapse;
    ctx.collapseTopSpikes = ctx.add.rectangle(
      ctx.levelData.width / 2,
      PHYSICS.COLLAPSE_TOP_START_Y / 2,
      ctx.levelData.width + 40,
      PHYSICS.COLLAPSE_TOP_START_Y,
      0xef4444,
      0.55
    );
    ctx.collapseTopSpikes.setStrokeStyle(3, 0xffaa00);
    ctx.collapseTopSpikes.setDepth(15);
    ctx.physics.add.existing(ctx.collapseTopSpikes, true);
    ctx.spikes.add(ctx.collapseTopSpikes);

    ctx.collapseBottomSpikes = ctx.add.rectangle(
      ctx.levelData.width / 2,
      ctx.levelData.height - PHYSICS.COLLAPSE_BOTTOM_MARGIN_Y + 80,
      ctx.levelData.width + 40,
      160,
      0xef4444,
      0.55
    );
    ctx.collapseBottomSpikes.setStrokeStyle(3, 0xffaa00);
    ctx.collapseBottomSpikes.setDepth(15);
    ctx.physics.add.existing(ctx.collapseBottomSpikes, true);
    ctx.spikes.add(ctx.collapseBottomSpikes);
  }
}

export function buildParticles(ctx: GameSceneContext): void {
  ctx.particles = ctx.physics.add.group({
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

  for (const part of ctx.levelData.particles) {
    const textureKey = assetMap[part.type] || 'blue';
    const sprite = ctx.physics.add.sprite(part.x, part.y, textureKey);
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
    ctx.particles.add(sprite);
    const pBody = sprite.body as Phaser.Physics.Arcade.Body;
    pBody.setImmovable(true);
    pBody.setAllowGravity(false);

    ctx.tweens.add({
      targets: sprite,
      y: part.y - 6,
      yoyo: true,
      duration: 800,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
}

export function buildPortalsGatesAndPlates(ctx: GameSceneContext): void {
  const portalX = ctx.levelData.door.x - 48;
  const portalY = ctx.levelData.door.y - 96;
  ctx.portalSprite = ctx.physics.add.sprite(portalX, portalY, 'portal');
  ctx.portalSprite.setScale(0.15, 0.2);
  const portalBody = ctx.portalSprite.body as Phaser.Physics.Arcade.Body;
  portalBody.setImmovable(true);
  portalBody.setAllowGravity(false);
  portalBody.moves = false;
  ctx.portalSprite.play('spin');

  ctx.gatesGroup = ctx.physics.add.staticGroup();
  ctx.gatesMap.clear();
  if (ctx.levelData.gates && ctx.levelData.gates.length > 0) {
    for (const g of ctx.levelData.gates) {
      const gateRect = ctx.add.rectangle(
        g.x + g.width / 2,
        g.y + g.height / 2,
        g.width,
        g.height,
        0xef4444
      );
      gateRect.setStrokeStyle(2, 0xff7777);
      ctx.physics.add.existing(gateRect, true);
      ctx.gatesGroup.add(gateRect);
      ctx.gatesMap.set(g.id, { rect: gateRect, data: g });
    }
  }

  ctx.pressurePlatesList = [];
  if (ctx.levelData.pressurePlates && ctx.levelData.pressurePlates.length > 0) {
    for (const pl of ctx.levelData.pressurePlates) {
      const baseRect = ctx.add.rectangle(
        pl.x + pl.width / 2,
        pl.y + pl.height - 2,
        pl.width + 4,
        4,
        0x334155
      );
      const padRect = ctx.add.rectangle(
        pl.x + pl.width / 2,
        pl.y + pl.height / 2,
        pl.width,
        pl.height,
        0x10b981
      );
      padRect.setStrokeStyle(1, 0x34d399);
      ctx.pressurePlatesList.push({
        baseRect,
        padRect,
        data: pl,
        isPressed: false,
        startY: padRect.y
      });
    }
  }

  ctx.heroGroup = ctx.physics.add.group();
  const entanglement = ctx.levelData.entanglement;
  ctx.isEntangled = Boolean(entanglement);

  if (entanglement) {
    if (entanglement.portalMode === 'dual' || entanglement.betaDoor) {
      const betaDoorPos = entanglement.betaDoor || ctx.levelData.door;
      const isBetaInverted =
        entanglement.mode === 'inverted_gravity' || entanglement.mode === 'mirror_and_gravity';
      const betaPortalX = betaDoorPos.x - 48;
      const betaPortalY = isBetaInverted ? betaDoorPos.y + 32 : betaDoorPos.y - 96;
      ctx.betaPortalSprite = ctx.physics.add.sprite(betaPortalX, betaPortalY, 'portal');
      ctx.betaPortalSprite.setScale(0.15, 0.2);
      if (isBetaInverted) {
        ctx.betaPortalSprite.setFlipY(true);
      }
      ctx.betaPortalSprite.setTint(0xec4899);
      const bpBody = ctx.betaPortalSprite.body as Phaser.Physics.Arcade.Body;
      bpBody.setImmovable(true);
      bpBody.setAllowGravity(false);
      bpBody.moves = false;
      ctx.betaPortalSprite.play('spin');
    }

    ctx.entanglementGraphics = ctx.add.graphics();
    ctx.entanglementGraphics.setDepth(20);
  }
}

export function setupLevelCollisions(ctx: GameSceneContext): void {
  const entanglement = ctx.levelData.entanglement;
  ctx.physics.add.collider(ctx.heroGroup, ctx.gatesGroup);
  if (
    entanglement &&
    (entanglement.allowHeroCollision === true ||
      entanglement.mode === 'inverted_gravity' ||
      entanglement.mode === 'mirror_and_gravity')
  ) {
    ctx.physics.add.collider(ctx.heroGroup, ctx.heroGroup);
  }

  ctx.physics.add.collider(
    ctx.heroGroup,
    ctx.platforms,
    (heroObj, platObj) => {
      const hero = heroObj as Hero;
      const plat = platObj as Phaser.GameObjects.Rectangle;

      if (plat.getData('ephemeral') === true) {
        ctx.vanishEphemeralPlatform(plat);
      }

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
        hero.onCryo = !hero.onPressurePlate;
      }

      if (touchingTop) {
        hero.onLiquidSurface = matterState === 'liquid';
      }

      if (touchingTop && (!hero.wasTouchingGround || hero.lastLandedPlatform !== plat)) {
        hero.lastLandedPlatform = plat;
        ctx.triggerSynthPlatformImpact(hero, plat, true);
      }

      const decayState = plat.getData('decayState') as DecayPlatformState | undefined;
      if (decayState && !decayState.triggered && touchingTop) {
        decayState.triggered = true;
      }

      if (
        plat.getData('cracked') === true &&
        shouldBreakCrackedPlatform(hero.fusionStack, Boolean(touchingTop), hero.isDiving)
      ) {
        ctx.shatterCrackedPlatform(plat);
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
          (ctx.cursors?.down?.isDown ?? false) ||
          (ctx.wasd?.S?.isDown ?? false) ||
          Boolean(ctx.touchController.state.diveRequested);
        const vy = hero.body ? hero.body.velocity.y : 0;
        if (
          hero.inLiquid ||
          shouldPlungeIntoLiquid(vy, hero.upsideDown, hero.isDiving, diveInput)
        ) {
          if (!hero.inLiquid) {
            hero.inLiquid = true;
            hero.onLiquidSurface = false;
            if (diveInput && vy * hero.upsideDown < 320) {
              hero.setVelocityY(320 * hero.upsideDown);
            } else if (hero.upsideDown === 1 && vy > 280) {
              hero.setVelocityY(280);
            } else if (hero.upsideDown === -1 && vy < -280) {
              hero.setVelocityY(-280);
            }
            hero.isDiving = false;
            gameEvents.emit('platform:liquid_plunge', { x: hero.x, y: hero.y });
          }
          return false;
        }
      }

      return true;
    }
  );

  ctx.physics.add.collider(ctx.heroGroup, ctx.movingPlatformsGroup, (heroObj, platObj) => {
    const hero = heroObj as Hero;
    const plat = platObj as Phaser.GameObjects.Rectangle;
    const touchingTop =
      hero.upsideDown === 1
        ? hero.body?.touching.down || hero.body?.blocked.down
        : hero.body?.touching.up || hero.body?.blocked.up;
    if (touchingTop && (!hero.wasTouchingGround || hero.lastLandedPlatform !== plat)) {
      hero.lastLandedPlatform = plat;
      ctx.triggerSynthPlatformImpact(hero, plat, false);
    }
    const decayState = plat.getData('decayState') as DecayPlatformState | undefined;
    if (decayState && !decayState.triggered && touchingTop) {
      decayState.triggered = true;
    }
  });

  ctx.physics.add.collider(ctx.heroGroup, ctx.sceneBounds, (heroObj, boundObj) => {
    const hero = heroObj as Hero;
    const bound = boundObj as Phaser.GameObjects.Rectangle;
    const type = bound.getData('boundary');
    if (type === 'left') {
      hero.bounceOffLeftWall();
    } else if (type === 'right') {
      hero.bounceOffRightWall();
    } else if (type === 'ceiling') {
      if (hero.upsideDown === -1) {
        if (hero.isFocused || ctx.heroes.length <= 1) {
          gameEvents.emit('hero:death', { remaining: 0, entangledCollapse: ctx.isEntangled });
          ctx.quickRespawn({ x: hero.x, y: hero.y });
        } else {
          ctx.killHero(hero);
        }
      } else {
        hero.bounceOffCeiling();
      }
    }
  });

  ctx.physics.add.overlap(ctx.heroGroup, ctx.spikes, (_heroObj) => {
    if (isGodMode()) return;
    ctx.killHero(_heroObj as Hero);
  });

  ctx.physics.add.overlap(ctx.heroGroup, ctx.particles, (_heroObj, _partObj) => {
    ctx.collectParticle(_heroObj as Hero, _partObj as Phaser.Physics.Arcade.Sprite);
  });

  if (ctx.isEntangled) {
    ctx.physics.add.overlap(ctx.heroGroup, ctx.portalSprite, (_portal, heroObj) => {
      ctx.handleEntangledPortalArrival(heroObj as Hero, ctx.portalSprite, false);
    });
    if (ctx.betaPortalSprite) {
      const betaPortal = ctx.betaPortalSprite;
      ctx.physics.add.overlap(ctx.heroGroup, betaPortal, (_portal, heroObj) => {
        ctx.handleEntangledPortalArrival(heroObj as Hero, betaPortal, true);
      });
    }
  } else {
    ctx.physics.add.overlap(ctx.heroGroup, ctx.portalSprite, () => {
      ctx.completeLevel();
    });
  }
}
