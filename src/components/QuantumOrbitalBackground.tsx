import type React from 'react';
import { useEffect, useRef } from 'react';
import { getSpectralLineColors } from '../data/spectroscopy';
import { useGameStore } from '../store';

interface OrbitalParticle {
  ringIndex: number;
  angle: number;
  angularSpeed: number;
  radius: number;
  color: string;
  alpha: number;
  size: number;
}

interface AmbientPhoton {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  phase: number;
}

const DEFAULT_SHELL_RATIOS = [0.16, 0.27, 0.39, 0.52];

export const QuantumOrbitalBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedEffects = useGameStore((state) => state.reducedEffects);
  const maxLevel = useGameStore((state) => state.maxLevel);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    const palette = getSpectralLineColors(Math.max(1, Math.min(118, maxLevel || 1)));
    const safePalette = palette.length > 0 ? palette : ['#00ffcc', '#38bdf8', '#a855f7', '#f472b6'];

    let width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    let height = typeof window !== 'undefined' ? window.innerHeight : 768;

    const syncSize = () => {
      width = typeof window !== 'undefined' ? window.innerWidth || 1024 : 1024;
      height = typeof window !== 'undefined' ? window.innerHeight || 768 : 768;
      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncSize();

    const particles: OrbitalParticle[] = [];
    const electronsPerRing = reducedEffects ? [1, 2, 2, 2] : [2, 4, 6, 8];
    electronsPerRing.forEach((count, ringIndex) => {
      const dir = ringIndex % 2 === 0 ? 1 : -1;
      const speed = dir * (0.28 / (ringIndex + 1));
      const color = safePalette[ringIndex % safePalette.length];
      for (let i = 0; i < count; i++) {
        particles.push({
          ringIndex,
          angle: (i / count) * Math.PI * 2,
          angularSpeed: speed,
          radius: DEFAULT_SHELL_RATIOS[ringIndex],
          color,
          alpha: 0.65,
          size: ringIndex === electronsPerRing.length - 1 ? 3.5 : 2.5
        });
      }
    });

    const photonCount = reducedEffects ? 6 : 16;
    const photons: AmbientPhoton[] = Array.from({ length: photonCount }, (_, idx) => ({
      x: ((idx * 173.3) % 1) * width,
      y: ((idx * 97.7) % 1) * height,
      vx: (((idx % 5) - 2) * 8) / 60,
      vy: ((((idx * 3) % 5) - 2) * 8) / 60,
      size: 1.5 + (idx % 3) * 1.2,
      color: safePalette[idx % safePalette.length],
      phase: idx * 0.85
    }));

    const drawFrame = (dtSec: number, timeSec: number) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseSpan = Math.min(width, height);

      // Nucleus glow
      const nucleusRadius = Math.max(8, baseSpan * 0.022);
      ctx.beginPath();
      ctx.arc(cx, cy, nucleusRadius * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = safePalette[0];
      ctx.globalAlpha = 0.12;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, nucleusRadius, 0, Math.PI * 2);
      ctx.fillStyle = safePalette[0];
      ctx.globalAlpha = 0.35;
      ctx.fill();

      // Concentric orbital rings
      DEFAULT_SHELL_RATIOS.forEach((ratio, idx) => {
        const r = baseSpan * ratio;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = safePalette[idx % safePalette.length];
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.16;
        ctx.stroke();
      });

      // Orbiting spectral electrons
      for (const p of particles) {
        p.angle += p.angularSpeed * dtSec;
        const r = baseSpan * p.radius;
        const ex = cx + Math.cos(p.angle) * r;
        const ey = cy + Math.sin(p.angle) * r;
        ctx.beginPath();
        ctx.arc(ex, ey, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }

      // Subtle drifting spectral particles
      for (const ph of photons) {
        ph.x += ph.vx * (dtSec * 60);
        ph.y += ph.vy * (dtSec * 60);
        if (ph.x < -10) ph.x = width + 10;
        else if (ph.x > width + 10) ph.x = -10;
        if (ph.y < -10) ph.y = height + 10;
        else if (ph.y > height + 10) ph.y = -10;

        ctx.beginPath();
        ctx.arc(ph.x, ph.y, ph.size, 0, Math.PI * 2);
        ctx.fillStyle = ph.color;
        ctx.globalAlpha = 0.18 + 0.14 * Math.sin(timeSec * 1.4 + ph.phase);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    let rafId: number | null = null;
    let lastTime = 0;

    const tick = (now: number) => {
      const dtSec = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 1 / 60;
      lastTime = now;
      drawFrame(dtSec, now / 1000);
      rafId = requestAnimationFrame(tick);
    };

    drawFrame(0, 0);
    if (!reducedEffects && typeof requestAnimationFrame !== 'undefined') {
      rafId = requestAnimationFrame(tick);
    }

    const handleResize = () => {
      syncSize();
      if (reducedEffects) {
        drawFrame(0, 0);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [reducedEffects, maxLevel]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="quantum-orbital-bg"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
};

export default QuantumOrbitalBackground;
