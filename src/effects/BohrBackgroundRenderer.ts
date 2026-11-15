import Phaser from 'phaser';
import { getElementSpectroscopy, getSpectralLineColors } from '../data/spectroscopy';
import { gameEvents } from '../tools/gameEvents';

// Aufbau subshell filling order: [shellIndex (0=K..6=Q), maxElectrons]
const AUFBAU_SUBSHELLS: ReadonlyArray<readonly [number, number]> = [
  [0, 2], // 1s
  [1, 2], // 2s
  [1, 6], // 2p
  [2, 2], // 3s
  [2, 6], // 3p
  [3, 2], // 4s
  [2, 10], // 3d
  [3, 6], // 4p
  [4, 2], // 5s
  [3, 10], // 4d
  [4, 6], // 5p
  [5, 2], // 6s
  [3, 14], // 4f
  [4, 10], // 5d
  [5, 6], // 6p
  [6, 2], // 7s
  [4, 14], // 5f
  [5, 10], // 6d
  [6, 6] // 7p
];

// Known experimental Madelung exceptions (Z -> exact shell counts [K, L, M, ...])
const ELECTRON_SHELL_EXCEPTIONS: Record<number, readonly number[]> = {
  24: [2, 8, 13, 1], // Cr
  29: [2, 8, 18, 1], // Cu
  41: [2, 8, 18, 12, 1], // Nb
  42: [2, 8, 18, 13, 1], // Mo
  44: [2, 8, 18, 15, 1], // Ru
  45: [2, 8, 18, 16, 1], // Rh
  46: [2, 8, 18, 18], // Pd
  47: [2, 8, 18, 18, 1], // Ag
  57: [2, 8, 18, 18, 9, 2], // La
  58: [2, 8, 18, 19, 9, 2], // Ce
  64: [2, 8, 18, 25, 9, 2], // Gd
  78: [2, 8, 18, 32, 17, 1], // Pt
  79: [2, 8, 18, 32, 18, 1], // Au
  89: [2, 8, 18, 32, 18, 9, 2], // Ac
  90: [2, 8, 18, 32, 18, 10, 2], // Th
  91: [2, 8, 18, 32, 20, 9, 2], // Pa
  92: [2, 8, 18, 32, 21, 9, 2], // U
  93: [2, 8, 18, 32, 22, 9, 2], // Np
  96: [2, 8, 18, 32, 25, 9, 2], // Cm
  103: [2, 8, 18, 32, 32, 8, 3] // Lr
};

/**
 * Computes the exact ground-state electron shell distribution (K, L, M, N, O, P, Q)
 * for any atomic number Z from 1 to 118.
 */
export function getElectronShells(z: number): number[] {
  const clampedZ = Math.max(1, Math.min(118, Math.round(z)));
  const exception = ELECTRON_SHELL_EXCEPTIONS[clampedZ];
  if (exception) {
    return [...exception];
  }

  const shells = [0, 0, 0, 0, 0, 0, 0];
  let remaining = clampedZ;

  for (const [shellIdx, capacity] of AUFBAU_SUBSHELLS) {
    if (remaining <= 0) break;
    const placed = Math.min(remaining, capacity);
    shells[shellIdx] += placed;
    remaining -= placed;
  }

  // Trim trailing empty shells
  while (shells.length > 1 && shells[shells.length - 1] === 0) {
    shells.pop();
  }

  return shells;
}

interface OrbitingElectron {
  circle: Phaser.GameObjects.Arc;
  shellIndex: number;
  radius: number;
  angle: number;
  angularSpeed: number;
  isValenceAdded: boolean;
}

interface OrbitalRing {
  ring: Phaser.GameObjects.Arc;
  baseRadius: number;
  baseAlpha: number;
  color: number;
}

export class BohrBackgroundRenderer {
  private scene: Phaser.Scene;
  private z: number;
  private centerX: number;
  private centerY: number;
  private shells: number[];
  private spectralColors: number[];

  private nucleusHalo: Phaser.GameObjects.Arc | null = null;
  private nucleusCore: Phaser.GameObjects.Arc | null = null;
  private orbitalRings: OrbitalRing[] = [];
  private electrons: OrbitingElectron[] = [];
  private beatPulse = 0;
  private unsubBeat: (() => void) | null = null;

  public static readonly SCROLL_FACTOR = 0.25;
  public static readonly DEPTH = 1;

  constructor(scene: Phaser.Scene, z: number, centerX: number, centerY: number) {
    this.scene = scene;
    this.z = Math.max(1, Math.min(118, Math.round(z)));
    this.centerX = centerX;
    this.centerY = centerY;
    this.shells = getElectronShells(this.z);
    this.spectralColors = getSpectralLineColors(this.z).map((hex) =>
      Phaser.Display.Color.HexStringToColor(hex).color
    );

    this.build();

    this.unsubBeat = gameEvents.on('bgm:beat', () => {
      this.pulseOnBeat();
    });
  }

  private build(): void {
    const el = getElementSpectroscopy(this.z);
    const primaryColor = Phaser.Display.Color.HexStringToColor(el.antiHue).color;

    // 1. Luminescent Nucleus (parallax 0.25, depth 1)
    const nucleusRadius = 14 + Math.min(18, Math.floor(this.z / 7));
    this.nucleusHalo = this.scene.add.circle(
      this.centerX,
      this.centerY,
      nucleusRadius * 1.9,
      primaryColor,
      0.14
    );
    this.nucleusHalo.setScrollFactor(BohrBackgroundRenderer.SCROLL_FACTOR);
    this.nucleusHalo.setDepth(BohrBackgroundRenderer.DEPTH);

    this.nucleusCore = this.scene.add.circle(
      this.centerX,
      this.centerY,
      nucleusRadius,
      primaryColor,
      0.38
    );
    this.nucleusCore.setScrollFactor(BohrBackgroundRenderer.SCROLL_FACTOR);
    this.nucleusCore.setDepth(BohrBackgroundRenderer.DEPTH);

    // 2. Concentric Orbital Rings & Ground-State Electrons
    const baseRadius = nucleusRadius + 46;
    const ringSpacing = 44;

    this.shells.forEach((electronCount, shellIdx) => {
      const radius = baseRadius + shellIdx * ringSpacing;
      const ringColor = this.spectralColors[shellIdx % this.spectralColors.length] ?? primaryColor;
      const baseAlpha = 0.22;

      const ring = this.scene.add.circle(this.centerX, this.centerY, radius, ringColor, 0);
      ring.setStrokeStyle(1.5, ringColor, baseAlpha);
      ring.setScrollFactor(BohrBackgroundRenderer.SCROLL_FACTOR);
      ring.setDepth(BohrBackgroundRenderer.DEPTH);

      this.orbitalRings.push({
        ring,
        baseRadius: radius,
        baseAlpha,
        color: ringColor
      });

      const angularSpeed = (shellIdx % 2 === 0 ? 1 : -1) * (0.45 / (shellIdx + 1));
      for (let e = 0; e < electronCount; e++) {
        const angle = (e / Math.max(1, electronCount)) * Math.PI * 2;
        this.spawnElectronNode(shellIdx, radius, angle, angularSpeed, ringColor, false);
      }
    });
  }

  private spawnElectronNode(
    shellIndex: number,
    radius: number,
    angle: number,
    angularSpeed: number,
    color: number,
    isValenceAdded: boolean
  ): OrbitingElectron {
    const ex = this.centerX + Math.cos(angle) * radius;
    const ey = this.centerY + Math.sin(angle) * radius;
    const size = isValenceAdded ? 5.5 : 3.5;
    const alpha = isValenceAdded ? 0.85 : 0.55;

    const circle = this.scene.add.circle(ex, ey, size, color, alpha);
    circle.setScrollFactor(BohrBackgroundRenderer.SCROLL_FACTOR);
    circle.setDepth(BohrBackgroundRenderer.DEPTH);

    const node: OrbitingElectron = {
      circle,
      shellIndex,
      radius,
      angle,
      angularSpeed,
      isValenceAdded
    };
    this.electrons.push(node);
    return node;
  }

  /**
   * Triggers a subtle harmonic pulse on the orbital rings and nucleus on BGM beat.
   */
  public pulseOnBeat(): void {
    this.beatPulse = 1.0;
  }

  /**
   * Adds a luminous valence electron orbiting on the outermost shell
   * whenever the player collects an energy particle in the level.
   */
  public addValenceElectron(): number {
    const valenceIdx = Math.max(0, this.shells.length - 1);
    const valenceRing = this.orbitalRings[valenceIdx];
    const radius = valenceRing ? valenceRing.baseRadius : 64;
    const color = valenceRing ? valenceRing.color : 0xffffff;
    const angle = Math.random() * Math.PI * 2;
    const angularSpeed = (valenceIdx % 2 === 0 ? 1 : -1) * (0.55 / (valenceIdx + 1));

    this.shells[valenceIdx] = (this.shells[valenceIdx] ?? 0) + 1;
    this.spawnElectronNode(valenceIdx, radius, angle, angularSpeed, color, true);
    this.beatPulse = Math.max(this.beatPulse, 0.9);

    return this.shells[valenceIdx];
  }

  /**
   * Removes all bonus valence electrons added via particle collection and restores
   * the ground-state shell counts (used on quickRespawn).
   */
  public resetValenceElectrons(): void {
    const remaining: OrbitingElectron[] = [];
    for (const el of this.electrons) {
      if (el.isValenceAdded) {
        el.circle.destroy();
      } else {
        remaining.push(el);
      }
    }
    this.electrons = remaining;
    this.shells = getElectronShells(this.z);
    this.beatPulse = 0;
  }

  public update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;

    if (this.beatPulse > 0) {
      this.beatPulse = Math.max(0, this.beatPulse - dt * 3.2);
    }

    const pulseScale = 1 + this.beatPulse * 0.035;
    if (this.nucleusHalo?.active) {
      this.nucleusHalo.setScale(pulseScale * 1.05);
      this.nucleusHalo.setAlpha(0.14 + this.beatPulse * 0.14);
    }
    if (this.nucleusCore?.active) {
      this.nucleusCore.setScale(pulseScale);
    }

    for (const item of this.orbitalRings) {
      if (item.ring.active) {
        item.ring.setScale(pulseScale);
        item.ring.setStrokeStyle(1.5 + this.beatPulse * 1.2, item.color, item.baseAlpha + this.beatPulse * 0.22);
      }
    }

    for (const el of this.electrons) {
      if (!el.circle.active) continue;
      el.angle += el.angularSpeed * dt;
      const r = el.radius * pulseScale;
      el.circle.setPosition(
        this.centerX + Math.cos(el.angle) * r,
        this.centerY + Math.sin(el.angle) * r
      );
    }
  }

  public getShells(): number[] {
    return [...this.shells];
  }

  public getTotalElectronCount(): number {
    return this.electrons.length;
  }

  public getValenceElectronCount(): number {
    return this.shells[this.shells.length - 1] ?? 0;
  }

  public getBeatPulse(): number {
    return this.beatPulse;
  }

  public getOrbitalRingCount(): number {
    return this.orbitalRings.length;
  }

  public destroy(): void {
    if (this.unsubBeat) {
      this.unsubBeat();
      this.unsubBeat = null;
    }
    this.nucleusHalo?.destroy();
    this.nucleusHalo = null;
    this.nucleusCore?.destroy();
    this.nucleusCore = null;

    for (const item of this.orbitalRings) {
      item.ring.destroy();
    }
    this.orbitalRings = [];

    for (const el of this.electrons) {
      el.circle.destroy();
    }
    this.electrons = [];
  }
}
