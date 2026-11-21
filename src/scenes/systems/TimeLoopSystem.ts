import Phaser from 'phaser';
import { getStrings } from '../../i18n/strings';
import { checkPauliRepulsion } from '../../mechanics/quantumMechanics';
import { PHYSICS } from '../../physics/constants';
import { createQuantumPinningState, getGhostSurfVelocity } from '../../physics/matterStates';
import { useGameStore } from '../../store';
import { gameEvents } from '../../tools/gameEvents';
import type Hero from '../Hero';
import type { GameSceneContext } from './types';

export interface TimeLoopFrame {
  t: number;
  x: number;
  y: number;
  flipX: boolean;
  flipY?: boolean;
  animState: 'idle' | 'left' | 'right' | 'jump';
  isPauliActive: boolean;
}

export interface EchoRecording {
  id: number;
  frames: TimeLoopFrame[];
  durationMs: number;
}

export const TIME_LOOP_RECORD_HZ = 30;
export const TIME_LOOP_SAMPLE_INTERVAL_MS = 1000 / TIME_LOOP_RECORD_HZ;
export const TIME_LOOP_MAX_ECHOES_LIMIT = 3;
export const ECHO_TINTS: readonly [number, number, number] = [
  0x00e5ff, // Echo 1: Cyan
  0xa855f7, // Echo 2: Violet
  0xfbbf24 // Echo 3: Gold
];

/**
 * Samples an EchoRecording's frames at `cycleElapsedMs` using binary search + linear interpolation.
 */
export function sampleTimeLoopFrame(
  frames: readonly TimeLoopFrame[],
  cycleElapsedMs: number
): TimeLoopFrame | null {
  if (frames.length === 0) return null;
  if (frames.length === 1 || cycleElapsedMs <= frames[0].t) {
    return frames[0];
  }
  const last = frames[frames.length - 1];
  if (cycleElapsedMs >= last.t) {
    return last;
  }

  let lo = 0;
  let hi = frames.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= cycleElapsedMs) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const f0 = frames[lo];
  const f1 = frames[hi];
  const span = f1.t - f0.t;
  const alpha = span > 0 ? Math.max(0, Math.min(1, (cycleElapsedMs - f0.t) / span)) : 0;

  return {
    t: cycleElapsedMs,
    x: f0.x + (f1.x - f0.x) * alpha,
    y: f0.y + (f1.y - f0.y) * alpha,
    flipX: alpha < 0.5 ? f0.flipX : f1.flipX,
    flipY: alpha < 0.5 ? f0.flipY : f1.flipY,
    animState: alpha < 0.5 ? f0.animState : f1.animState,
    isPauliActive: f0.isPauliActive || (alpha >= 0.5 && f1.isPauliActive)
  };
}

/**
 * Pure check for one-way top Ghost Surfing / bouncing on an EchoHero's head.
 */
export function canSurfOnEcho(
  hero: { x: number; y: number; vy: number; upsideDown: number; hasSurfedThisJump?: boolean },
  echo: { x: number; y: number; active: boolean; visible?: boolean }
): boolean {
  if (!echo.active || echo.visible === false) return false;
  if (hero.hasSurfedThisJump) return false;
  if (hero.vy * hero.upsideDown <= 0) return false;

  const dx = Math.abs(hero.x - echo.x);
  if (dx > PHYSICS.GHOST_SURF_DX + 6) return false;

  // Hero feet must be approaching or slightly overlapping the echo's head from above
  const signedDy = (echo.y - hero.y) * hero.upsideDown;
  return signedDy >= 4 && signedDy <= PHYSICS.HERO_HITBOX_HALF_H * 2 + 12;
}

/**
 * Physically interactive temporal echo of a previous loop iteration.
 * Semi-transparent sprite tinted cyan / violet / gold with a rotating clock aura.
 */
export class EchoHero extends Phaser.Physics.Arcade.Sprite {
  public readonly echoId: number;
  public readonly slotIndex: number;
  public readonly tintColor: number;
  public readonly recording: EchoRecording;
  public isPauliActive = false;
  public pauliGraceUntil = 0;
  public upsideDown = 1;
  public auraGraphics: Phaser.GameObjects.Graphics | null = null;
  private readonly baseAlpha = 0.62;
  private readonly finishedAlpha = 0.42;

  constructor(scene: Phaser.Scene, recording: EchoRecording, slotIndex: number) {
    const first = recording.frames[0] ?? {
      t: 0,
      x: 0,
      y: 0,
      flipX: false,
      animState: 'idle' as const,
      isPauliActive: false
    };
    super(scene, first.x, first.y, 'hero');

    this.echoId = recording.id;
    this.slotIndex = slotIndex;
    this.recording = recording;
    this.tintColor = ECHO_TINTS[slotIndex % ECHO_TINTS.length];
    this.isPauliActive = first.isPauliActive;

    scene.add?.existing?.(this);
    scene.physics?.add?.existing?.(this);

    const arcadeBody = this.body as Phaser.Physics.Arcade.Body | null;
    if (arcadeBody) {
      arcadeBody.setAllowGravity?.(false);
      arcadeBody.setImmovable?.(true);
      arcadeBody.setSize?.(PHYSICS.HERO_HITBOX_HALF_W * 2, PHYSICS.HERO_HITBOX_HALF_H * 2);
      if (arcadeBody.checkCollision) {
        arcadeBody.checkCollision.up = true;
        arcadeBody.checkCollision.down = false;
        arcadeBody.checkCollision.left = false;
        arcadeBody.checkCollision.right = false;
      }
    }

    this.setAlpha(this.baseAlpha);
    this.setTint(this.tintColor);
    this.setDepth(14);

    if (scene.anims?.exists?.('idle')) {
      this.play('idle');
    }

    if (typeof scene.add?.graphics === 'function') {
      this.auraGraphics = scene.add.graphics();
      this.auraGraphics.setDepth?.(13);
    }
  }

  public updateAt(cycleElapsedMs: number, cycleMs: number): void {
    if (!this.active || this.recording.frames.length === 0) return;

    const frame = sampleTimeLoopFrame(this.recording.frames, cycleElapsedMs);
    if (!frame) return;

    this.setPosition(frame.x, frame.y);
    this.setFlipX(frame.flipX);
    if (frame.flipY !== undefined) {
      this.setFlipY(frame.flipY);
      this.upsideDown = frame.flipY ? -1 : 1;
    }
    this.isPauliActive = frame.isPauliActive;

    const arcadeBody = this.body as Phaser.Physics.Arcade.Body | null;
    if (arcadeBody) {
      if (typeof arcadeBody.reset === 'function') {
        arcadeBody.reset(frame.x, frame.y);
      } else {
        arcadeBody.x = frame.x - (arcadeBody.width || PHYSICS.HERO_HITBOX_HALF_W * 2) / 2;
        arcadeBody.y = frame.y - (arcadeBody.height || PHYSICS.HERO_HITBOX_HALF_H * 2) / 2;
      }
    }

    if (this.scene?.anims?.exists?.(frame.animState)) {
      const currentKey = this.anims?.currentAnim?.key;
      if (currentKey !== frame.animState) {
        this.play(frame.animState, true);
      }
    }

    const isFinished = this.recording.durationMs > 0 && cycleElapsedMs >= this.recording.durationMs;
    this.setAlpha(isFinished ? this.finishedAlpha : this.baseAlpha);

    this.drawClockAura(frame.x, frame.y, cycleElapsedMs, cycleMs, isFinished);
  }

  private drawClockAura(
    x: number,
    y: number,
    cycleElapsedMs: number,
    cycleMs: number,
    isFinished: boolean
  ): void {
    const g = this.auraGraphics;
    if (!g) return;
    g.clear();

    const progress = cycleMs > 0 ? Math.min(1, cycleElapsedMs / cycleMs) : 0;
    const radius = 24;
    const alpha = isFinished ? 0.3 : 0.65;

    // Outer temporal ring
    g.lineStyle(2, this.tintColor, alpha);
    g.strokeCircle(x, y, radius);

    // Clock hand rotating with cycle progress
    const angle = -Math.PI / 2 + progress * Math.PI * 2;
    g.lineStyle(1.5, 0xffffff, alpha);
    g.lineBetween(x, y, x + Math.cos(angle) * (radius - 5), y + Math.sin(angle) * (radius - 5));

    // Pauli charge halo when echo carries Pauli charge
    if (this.isPauliActive) {
      g.lineStyle(2, 0xf43f5e, 0.8);
      g.strokeCircle(x, y, radius + 6);
    }
  }

  public override destroy(fromScene?: boolean): void {
    if (this.auraGraphics) {
      try {
        this.auraGraphics.destroy();
      } catch {
        // safe
      }
      this.auraGraphics = null;
    }
    super.destroy(fromScene);
  }
}

/**
 * Spec-01: Chrono-Loop ("Boucle Temporelle") system.
 * Records the active hero at 30 Hz, rewinds after `cycleMs` or manual trigger (`R` / LOOP button),
 * spawns up to `maxEchoes` (FIFO, max 3) physically interactive `EchoHero` entities,
 * handles Ghost Surfing (one-way top bounce) and temporal Pauli repulsion,
 * and draws a circular cycle gauge around the active hero.
 */
export class TimeLoopSystem {
  private active = false;
  private cycleMs = 7000;
  private maxEchoes = 2;
  private cycleElapsedMs = 0;
  private lastSampledCycleMs = Number.NEGATIVE_INFINITY;
  private currentRecording: TimeLoopFrame[] = [];
  private echoRecordings: EchoRecording[] = [];
  private echoHeroes: EchoHero[] = [];
  private echoGroup: Phaser.Physics.Arcade.Group | null = null;
  private echoColliders: Phaser.Physics.Arcade.Collider[] = [];
  private heroGaugeGraphics: Phaser.GameObjects.Graphics | null = null;
  private lastTickBucket = -1;
  private nextEchoId = 10000;

  constructor(private readonly ctx: GameSceneContext) {}

  public isActive(): boolean {
    return this.active;
  }

  public getCycleMs(): number {
    return this.cycleMs;
  }

  public getMaxEchoes(): number {
    return this.maxEchoes;
  }

  public getCycleElapsedMs(): number {
    return this.cycleElapsedMs;
  }

  public getRemainingMs(): number {
    return Math.max(0, this.cycleMs - this.cycleElapsedMs);
  }

  public getProgress(): number {
    return this.cycleMs > 0 ? Math.max(0, Math.min(1, this.cycleElapsedMs / this.cycleMs)) : 0;
  }

  public getEchoCount(): number {
    return this.echoHeroes.length;
  }

  public getActiveEchoes(): readonly EchoHero[] {
    return this.echoHeroes;
  }

  public getEchoRecordings(): readonly EchoRecording[] {
    return this.echoRecordings;
  }

  public getCurrentRecording(): readonly TimeLoopFrame[] {
    return this.currentRecording;
  }

  public initForLevel(): void {
    this.destroy();

    const config = this.ctx.levelData?.timeLoop;
    if (!config || config.cycleMs <= 0) {
      this.active = false;
      return;
    }

    this.active = true;
    this.cycleMs = Math.max(1000, config.cycleMs);
    this.maxEchoes = Math.max(1, Math.min(TIME_LOOP_MAX_ECHOES_LIMIT, config.maxEchoes || 1));
    this.cycleElapsedMs = 0;
    this.lastSampledCycleMs = Number.NEGATIVE_INFINITY;
    this.currentRecording = [];
    this.echoRecordings = [];
    this.lastTickBucket = -1;

    if (typeof this.ctx.physics?.add?.group === 'function') {
      this.echoGroup = this.ctx.physics.add.group({
        allowGravity: false,
        immovable: true
      });
    }

    if (typeof this.ctx.add?.graphics === 'function') {
      this.heroGaugeGraphics = this.ctx.add.graphics();
      this.heroGaugeGraphics.setDepth?.(25);
    }
  }

  public update(time: number, delta: number): void {
    const ctx = this.ctx;
    if (!this.active || ctx.isLevelCompleted || ctx.isTransitioningLevel || ctx.isRespawning) {
      return;
    }

    this.cycleElapsedMs += delta;

    // 1. Record focused hero at 30 Hz
    const focusedHero = ctx.heroes.find((h) => h.isFocused && h.active) || ctx.heroes[0];
    if (
      focusedHero?.active &&
      (this.currentRecording.length === 0 ||
        this.cycleElapsedMs - this.lastSampledCycleMs >= TIME_LOOP_SAMPLE_INTERVAL_MS - 0.5)
    ) {
      this.lastSampledCycleMs = this.cycleElapsedMs;
      this.currentRecording.push({
        t: this.cycleElapsedMs,
        x: focusedHero.x,
        y: focusedHero.y,
        flipX: Boolean(focusedHero.flipX),
        flipY: Boolean(focusedHero.flipY),
        animState: focusedHero.getAnimState ? focusedHero.getAnimState() : 'idle',
        isPauliActive: Boolean(ctx.isPauliActive)
      });
    }

    // 2. Advance all active EchoHero instances
    for (const echo of this.echoHeroes) {
      echo.updateAt(this.cycleElapsedMs, this.cycleMs);
    }

    // 3. Echo interactions: Ghost Surfing (one-way top bounce) & Temporal Pauli Repulsion
    this.updateEchoSurfing();
    this.updateTemporalPauliRepulsion(time);

    // 4. Final-second clockwork tick-tock warning
    const remainingMs = this.cycleMs - this.cycleElapsedMs;
    if (remainingMs > 0 && remainingMs <= 1000) {
      const bucket = Math.floor(remainingMs / 250); // 3, 2, 1, 0
      if (bucket !== this.lastTickBucket) {
        this.lastTickBucket = bucket;
        gameEvents.emit('timeloop:tick', { remainingMs });
      }
    }

    // 5. Draw circular cycle gauge around active hero
    this.drawHeroCycleGauge(focusedHero ?? null);

    // 6. Auto-rewind at end of cycle
    if (this.cycleElapsedMs >= this.cycleMs) {
      this.triggerLoopRewind(false);
    }
  }

  /**
   * Freezes the current run into `echoRecordings` (FIFO up to `maxEchoes`),
   * resets loop objects & respawns the active hero, and instantiates EchoHeroes.
   */
  public triggerLoopRewind(manual = true): void {
    const ctx = this.ctx;
    if (!this.active || ctx.isLevelCompleted || ctx.isTransitioningLevel || ctx.isRespawning) {
      return;
    }

    // Capture final frame so short manual loops still have valid endpoints
    const focusedHero = ctx.heroes.find((h) => h.isFocused && h.active) || ctx.heroes[0];
    if (focusedHero?.active) {
      const lastRecorded = this.currentRecording[this.currentRecording.length - 1];
      if (!lastRecorded || this.cycleElapsedMs > lastRecorded.t) {
        this.currentRecording.push({
          t: this.cycleElapsedMs,
          x: focusedHero.x,
          y: focusedHero.y,
          flipX: Boolean(focusedHero.flipX),
          flipY: Boolean(focusedHero.flipY),
          animState: focusedHero.getAnimState ? focusedHero.getAnimState() : 'idle',
          isPauliActive: Boolean(ctx.isPauliActive)
        });
      }
    }

    if (this.currentRecording.length > 0) {
      this.echoRecordings.push({
        id: this.nextEchoId++,
        frames: this.currentRecording,
        durationMs: this.cycleElapsedMs
      });
      while (this.echoRecordings.length > this.maxEchoes) {
        this.echoRecordings.shift();
      }
    }

    // Reset cycle timers & recording buffer
    this.cycleElapsedMs = 0;
    this.lastSampledCycleMs = Number.NEGATIVE_INFINITY;
    this.currentRecording = [];
    this.lastTickBucket = -1;

    // Reset loop-scoped world state without wiping echoRecordings
    this.resetWorldForNextLoop();

    // Recreate physical EchoHero instances cleanly (0 memory leak)
    this.rebuildEchoInstances();

    gameEvents.emit('timeloop:rewind', {
      echoCount: this.echoHeroes.length,
      cycleMs: this.cycleMs,
      manual
    });

    ctx.cameras?.main?.flash?.(100, 0, 229, 255, false);
  }

  /**
   * Clears all recordings and echoes (used on full level reset / Shift+R / death).
   */
  public resetAllLoops(): void {
    this.cycleElapsedMs = 0;
    this.lastSampledCycleMs = Number.NEGATIVE_INFINITY;
    this.currentRecording = [];
    this.echoRecordings = [];
    this.lastTickBucket = -1;
    this.clearEchoInstances();
    this.heroGaugeGraphics?.clear();
  }

  public clearEchoInstances(): void {
    for (const col of this.echoColliders) {
      try {
        col.destroy?.();
      } catch {
        // safe
      }
    }
    this.echoColliders = [];

    for (const echo of this.echoHeroes) {
      try {
        echo.destroy();
      } catch {
        // safe
      }
    }
    this.echoHeroes = [];

    if (this.echoGroup) {
      try {
        this.echoGroup.clear?.(false, false);
      } catch {
        // safe
      }
    }
  }

  public destroy(): void {
    this.clearEchoInstances();
    if (this.echoGroup) {
      try {
        this.echoGroup.destroy?.(true);
      } catch {
        // safe
      }
      this.echoGroup = null;
    }
    if (this.heroGaugeGraphics) {
      try {
        this.heroGaugeGraphics.destroy();
      } catch {
        // safe
      }
      this.heroGaugeGraphics = null;
    }
    this.echoRecordings = [];
    this.currentRecording = [];
    this.cycleElapsedMs = 0;
    this.lastSampledCycleMs = Number.NEGATIVE_INFINITY;
    this.lastTickBucket = -1;
    this.active = false;
  }

  private resetWorldForNextLoop(): void {
    const ctx = this.ctx;

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
    ctx.quantumPinningState = createQuantumPinningState();
    ctx.activePinPointerWorld = null;
    ctx.activePinPointerId = null;
    ctx.hasCondenseAbility = false;
    for (const crystal of ctx.broglieCrystals) {
      crystal.rect.destroy();
    }
    ctx.broglieCrystals = [];
    ctx.hookedTetherPylon = null;

    // Respawn active hero at spawn
    ctx.spawnHeroes();
    ctx.updateEdgePips();

    // Reactivate collected particles so each loop can collect power-ups (e.g. Pauli)
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

    // Restore phase platforms
    if (ctx.hasPhasePlatforms) {
      ctx.currentPhase = 'cyan';
      ctx.applyPhase('cyan');
    }

    // Restore decay, cracked & ephemeral platforms
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
    ctx.restoreEphemeralPlatforms?.();

    // Restore moving platforms
    for (const mp of ctx.movingPlatforms) {
      mp.rect.setPosition(mp.startX, mp.startY);
      mp.direction = { ...mp.initialDirection };
      const body = mp.rect.body as Phaser.Physics.Arcade.Body | null;
      if (body) {
        body.setVelocity(0, 0);
        body.reset?.(mp.startX, mp.startY);
      }
    }

    // Restore pressure plates & gates (echoes on plates will re-trigger on next frame)
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

    ctx.touchController.reset();
  }

  private rebuildEchoInstances(): void {
    this.clearEchoInstances();
    const ctx = this.ctx;

    for (let i = 0; i < this.echoRecordings.length; i++) {
      const rec = this.echoRecordings[i];
      if (rec.frames.length === 0) continue;
      const echo = new EchoHero(ctx as unknown as Phaser.Scene, rec, i);
      echo.updateAt(0, this.cycleMs);
      this.echoHeroes.push(echo);
      this.echoGroup?.add?.(echo);
    }

    // Wire Arcade Physics one-way collider between Hero and EchoHero (Ghost Surfing)
    if (
      this.echoGroup &&
      ctx.heroGroup &&
      this.echoHeroes.length > 0 &&
      typeof ctx.physics?.add?.collider === 'function'
    ) {
      const col = ctx.physics.add.collider(
        ctx.heroGroup,
        this.echoGroup,
        (heroObj, echoObj) => {
          const hero = heroObj as Hero;
          const echo = echoObj as EchoHero;
          if (!hero?.active || !echo?.active || !hero.body) return;
          if (!hero.hasSurfedThisJump) {
            this.applyEchoBounce(hero);
          }
        },
        (heroObj, echoObj) => {
          const hero = heroObj as Hero;
          const echo = echoObj as EchoHero;
          if (!hero?.active || !echo?.active || !hero.body) return false;
          // One-way platform from above only
          const descending = hero.body.velocity.y * hero.upsideDown > 0;
          const aboveEcho = (echo.y - hero.y) * hero.upsideDown >= 4;
          return descending && aboveEcho;
        }
      );
      if (col) {
        this.echoColliders.push(col);
      }
    }
  }

  private applyEchoBounce(hero: Hero): void {
    const ctx = this.ctx;
    hero.setVelocityY(getGhostSurfVelocity(hero.upsideDown));
    hero.hasSurfedThisJump = true;
    hero.isDiving = false;
    gameEvents.emit('hero:ghost_surf', { x: hero.x, y: hero.y });

    if (ctx.add?.circle && ctx.tweens?.add) {
      const ring = ctx.add.circle(hero.x, hero.y + 12 * hero.upsideDown, 10, 0x00e5ff, 0.8);
      ring.setDepth(22);
      ctx.tweens.add({
        targets: ring,
        scale: 2.6,
        alpha: 0,
        duration: 220,
        ease: 'Sine.easeOut',
        onComplete: () => ring.destroy()
      });
    }
  }

  private updateEchoSurfing(): void {
    if (this.echoHeroes.length === 0) return;

    for (const hero of this.ctx.heroes) {
      if (!hero.active || !hero.body || hero.hasSurfedThisJump) continue;
      for (const echo of this.echoHeroes) {
        if (
          canSurfOnEcho(
            {
              x: hero.x,
              y: hero.y,
              vy: hero.body.velocity.y,
              upsideDown: hero.upsideDown,
              hasSurfedThisJump: hero.hasSurfedThisJump
            },
            echo
          )
        ) {
          this.applyEchoBounce(hero);
          break;
        }
      }
    }
  }

  private updateTemporalPauliRepulsion(time: number): void {
    const ctx = this.ctx;
    if (this.echoHeroes.length === 0) return;

    const activeHeroes = ctx.heroes.filter((h) => h.active && h.body);
    if (activeHeroes.length === 0) return;

    for (const hero of activeHeroes) {
      for (const echo of this.echoHeroes) {
        if (!echo.active) continue;
        // Temporal Pauli repulsion triggers when either the current hero or the echo carries Pauli charge
        if (!ctx.isPauliActive && !echo.isPauliActive) continue;

        const events = checkPauliRepulsion(
          [
            {
              id: hero.id,
              x: hero.x,
              y: hero.y,
              pauliGraceUntil: hero.pauliGraceUntil,
              upsideDown: hero.upsideDown
            },
            {
              id: echo.echoId,
              x: echo.x,
              y: echo.y,
              pauliGraceUntil: echo.pauliGraceUntil,
              upsideDown: echo.upsideDown
            }
          ],
          time
        );

        for (const ev of events) {
          const heroImpulse = ev.heroAId === hero.id ? ev.impulseA : ev.impulseB;
          hero.setVelocityX(heroImpulse.vx);
          hero.setVelocityY(heroImpulse.vy);
          hero.pauliGraceUntil = ev.newGraceUntil;
          echo.pauliGraceUntil = ev.newGraceUntil;
          gameEvents.emit('pauli:blast', { hero1Id: hero.id, hero2Id: echo.echoId });
          ctx.showRetroToast(
            getStrings(useGameStore.getState().locale ?? 'en').hud.toasts.pauliBlast
          );
          if (ctx.shakeCamera) {
            ctx.shakeCamera(130, 0.007);
          } else if (!useGameStore.getState().reducedEffects) {
            ctx.cameras?.main?.shake?.(130, 0.007);
          }
          break;
        }
      }
    }
  }

  private drawHeroCycleGauge(hero: Hero | null): void {
    const g = this.heroGaugeGraphics;
    if (!g) return;
    g.clear();
    if (!hero || !hero.active) return;

    const remainingRatio = 1 - this.getProgress();
    const isUrgent = this.getRemainingMs() <= 1000;
    const radius = 30;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + remainingRatio * Math.PI * 2;
    const color = isUrgent ? 0xf43f5e : 0x00e5ff;

    // Subtle background track
    g.lineStyle(2, 0x334155, 0.45);
    g.strokeCircle(hero.x, hero.y, radius);

    // Active countdown arc
    if (remainingRatio > 0.01) {
      g.lineStyle(3, color, isUrgent ? 0.95 : 0.8);
      if (typeof g.beginPath === 'function' && typeof g.arc === 'function') {
        g.beginPath();
        g.arc(hero.x, hero.y, radius, startAngle, endAngle, false);
        g.strokePath();
      }
    }
  }
}
