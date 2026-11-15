import Phaser from 'phaser';
import { type GhostFrame, sampleTrajectory } from '../tools/GhostRecorder';

export interface GhostHeroOptions {
  alpha?: number;
  finishedAlpha?: number;
  tint?: number;
}

export class GhostHero extends Phaser.GameObjects.Sprite {
  public frames: GhostFrame[];
  public totalDurationMs = 0;
  public body: null = null;
  private baseAlpha: number;
  private finishedAlpha: number;

  constructor(scene: Phaser.Scene, frames: GhostFrame[], options?: GhostHeroOptions) {
    const initialFrame = frames[0] || { x: 0, y: 0, flipX: false, animState: 'idle' };
    super(scene, initialFrame.x, initialFrame.y, 'hero');

    this.frames = frames;
    if (frames.length > 0) {
      this.totalDurationMs = frames[frames.length - 1].timeMs;
    }

    this.baseAlpha = options?.alpha ?? 0.4;
    this.finishedAlpha = options?.finishedAlpha ?? Math.min(0.2, this.baseAlpha * 0.5);
    const tint = options?.tint ?? 0x38bdf8;

    scene.add.existing(this);

    // Neon holographic semi-transparent style
    this.setAlpha(this.baseAlpha);
    this.setTint(tint);
    this.setDepth(10);

    if (scene.anims?.exists('idle')) {
      this.play('idle');
    }
  }

  /**
   * Replays the recorded trajectory synchronized with the level's elapsed time using LERP.
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

    // Play corresponding animation
    const animKey = interpolated.animState;
    if (this.scene.anims?.exists(animKey)) {
      const currentKey = this.anims.currentAnim?.key;
      if (currentKey !== animKey) {
        this.play(animKey, true);
      }
    }

    // Fade slightly when finished
    if (this.totalDurationMs > 0 && elapsedMs >= this.totalDurationMs) {
      this.setAlpha(this.finishedAlpha);
    } else {
      this.setAlpha(this.baseAlpha);
    }
  }
}

export default GhostHero;
