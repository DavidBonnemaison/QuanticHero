import Phaser from 'phaser';
import { type GhostFrame, sampleTrajectory } from '../tools/GhostRecorder';

export class GhostHero extends Phaser.GameObjects.Sprite {
  public frames: GhostFrame[];
  public totalDurationMs = 0;
  public body: null = null;

  constructor(scene: Phaser.Scene, frames: GhostFrame[]) {
    const initialFrame = frames[0] || { x: 0, y: 0, flipX: false, animState: 'idle' };
    super(scene, initialFrame.x, initialFrame.y, 'hero');

    this.frames = frames;
    if (frames.length > 0) {
      this.totalDurationMs = frames[frames.length - 1].timeMs;
    }

    scene.add.existing(this);

    // Neon holographic semi-transparent style (cyan #38bdf8)
    this.setAlpha(0.4);
    this.setTint(0x38bdf8);
    this.setDepth(10);

    if (scene.anims.exists('idle')) {
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
    if (this.scene.anims.exists(animKey)) {
      const currentKey = this.anims.currentAnim?.key;
      if (currentKey !== animKey) {
        this.play(animKey, true);
      }
    }

    // Fade slightly when finished
    if (this.totalDurationMs > 0 && elapsedMs >= this.totalDurationMs) {
      this.setAlpha(0.2);
    } else {
      this.setAlpha(0.4);
    }
  }
}

export default GhostHero;
