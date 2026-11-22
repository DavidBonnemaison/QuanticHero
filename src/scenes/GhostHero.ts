import Phaser from 'phaser';
import { useGameStore } from '../store';
import { type GhostFrame, sampleTrajectory } from '../tools/GhostRecorder';
import { type HeroVisualState, drawProceduralHeroForSkin } from './HeroRenderer';

export interface GhostHeroOptions {
  alpha?: number;
  finishedAlpha?: number;
  tint?: number;
  label?: string;
}

export class GhostHero extends Phaser.GameObjects.Sprite {
  public frames: GhostFrame[];
  public totalDurationMs = 0;
  public body: null = null;
  public labelText: Phaser.GameObjects.Text | null = null;
  private baseAlpha: number;
  private finishedAlpha: number;
  private ghostTint: number;
  private quantumGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, frames: GhostFrame[], options?: GhostHeroOptions) {
    const initialFrame = frames[0] || { x: 0, y: 0, flipX: false, animState: 'idle' };
    super(scene, initialFrame.x, initialFrame.y, 'hero');

    this.frames = frames;
    if (frames.length > 0) {
      this.totalDurationMs = frames[frames.length - 1].timeMs;
    }

    this.baseAlpha = options?.alpha ?? 0.4;
    this.finishedAlpha = options?.finishedAlpha ?? Math.min(0.2, this.baseAlpha * 0.5);
    this.ghostTint = options?.tint ?? 0x38bdf8;

    scene.add.existing(this);

    // Neon holographic semi-transparent style
    this.setAlpha(this.baseAlpha);
    this.setTint(this.ghostTint);
    this.setDepth(10);

    if (typeof scene.add?.graphics === 'function') {
      this.quantumGraphics = scene.add.graphics();
      this.quantumGraphics.setDepth?.(10);
    }

    if (options?.label && typeof scene.add?.text === 'function') {
      this.labelText = scene.add.text(initialFrame.x, initialFrame.y - 24, options.label, {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '15px',
        color: '#fbbf24',
        stroke: '#050814',
        strokeThickness: 3,
        align: 'center'
      });
      this.labelText.setOrigin?.(0.5, 1);
      this.labelText.setDepth?.(11);
      this.labelText.setAlpha?.(Math.min(1, this.baseAlpha + 0.35));
    }

    if (scene.anims?.exists('idle')) {
      this.play('idle');
    }
  }

  /**
   * Replays the recorded trajectory synchronized with the level's elapsed time using LERP.
   * Automatically matches the player's selected `heroSkin` (`quantum` vs `classic`).
   */
  public updateReplay(elapsedMs: number): void {
    if (!this.active || this.frames.length === 0) return;

    const interpolated = sampleTrajectory(this.frames, elapsedMs);
    if (!interpolated) return;

    this.setPosition(interpolated.x, interpolated.y);
    this.setFlipX(interpolated.flipX);
    if (interpolated.flipY !== undefined) {
      this.setFlipY(interpolated.flipY);
    }

    // Fade slightly when finished
    const isFinished = this.totalDurationMs > 0 && elapsedMs >= this.totalDurationMs;
    const effectiveAlpha = isFinished ? this.finishedAlpha : this.baseAlpha;
    const storeState = useGameStore.getState();
    const activeSkin = storeState.heroSkin ?? 'hazmat';
    const reducedEffects = Boolean(storeState.reducedEffects);

    if (activeSkin !== 'classic' && this.quantumGraphics) {
      // Hide classic spritesheet and render procedural ghost matching the active skin
      this.setAlpha(0);
      this.quantumGraphics.clear();
      if (this.visible) {
        const isRunning = interpolated.animState === 'left' || interpolated.animState === 'right';
        const isAirborne = interpolated.animState === 'jump';
        const facingDir: 1 | -1 = interpolated.flipX ? -1 : 1;
        const upsideDown: 1 | -1 = interpolated.flipY ? -1 : 1;
        const ghostVisualState: HeroVisualState = {
          coreColor: 0xf8fafc,
          envelopeColor: this.ghostTint,
          accentColor: this.ghostTint,
          alpha: effectiveAlpha,
          scaleX: 1,
          scaleY: 1,
          leanRad: isRunning ? facingDir * 0.14 * upsideDown : 0,
          facingDir,
          upsideDown,
          isDiving: false,
          isRunning,
          isAirborne,
          speedRatio: isRunning ? 0.85 : 0,
          isSuperQuanta: false,
          hasTunnelCharge: false,
          hasPauliAura: false,
          glowLayers: 0,
          waveSegments: 10
        };
        drawProceduralHeroForSkin(
          this.quantumGraphics,
          activeSkin,
          interpolated.x,
          interpolated.y,
          elapsedMs,
          ghostVisualState,
          reducedEffects,
          true
        );
      }
    } else {
      this.quantumGraphics?.clear();
      // Play corresponding classic spritesheet animation
      const animKey = interpolated.animState;
      if (this.scene.anims?.exists(animKey)) {
        const currentKey = this.anims.currentAnim?.key;
        if (currentKey !== animKey) {
          this.play(animKey, true);
        }
      }
      this.setAlpha(effectiveAlpha);
    }

    if (this.labelText?.active) {
      this.labelText.setPosition?.(interpolated.x, interpolated.y - 24);
      this.labelText.setAlpha?.(
        isFinished ? this.finishedAlpha : Math.min(1, this.baseAlpha + 0.35)
      );
    }
  }

  public override destroy(fromScene?: boolean): void {
    if (this.quantumGraphics) {
      try {
        this.quantumGraphics.destroy();
      } catch {
        // safe
      }
      this.quantumGraphics = null;
    }
    if (this.labelText) {
      try {
        this.labelText.destroy();
      } catch {
        // safe
      }
      this.labelText = null;
    }
    super.destroy(fromScene);
  }
}

export default GhostHero;
