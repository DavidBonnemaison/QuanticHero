import { describe, expect, it } from 'vitest';
import config, { DESKTOP_MAX_HEIGHT, DESKTOP_MAX_WIDTH, computeViewportSize } from './config';

describe('config adaptive viewport (Spec-02)', () => {
  it('uses wide desktop format (> 1000px) capped at 1280x800 on a 1440x900 screen', () => {
    const vp = computeViewportSize(1440, 900);
    expect(vp.width).toBe(1280);
    expect(vp.height).toBe(800);
    expect(vp.width).toBeGreaterThan(1000);
    expect(vp.isMobilePortrait).toBe(false);
  });

  it('caps ultra-wide desktop resolutions to 1280x800', () => {
    const vp = computeViewportSize(2560, 1440);
    expect(vp.width).toBe(DESKTOP_MAX_WIDTH);
    expect(vp.height).toBe(DESKTOP_MAX_HEIGHT);
    expect(vp.isMobilePortrait).toBe(false);
  });

  it('fills available viewport on medium desktop / tablet landscape screens', () => {
    const vp = computeViewportSize(1024, 768);
    expect(vp.width).toBe(1024);
    expect(vp.height).toBe(768);
    expect(vp.isMobilePortrait).toBe(false);
  });

  it('uses full 100vw x 100dvh on mobile portrait screens', () => {
    const vp = computeViewportSize(390, 844);
    expect(vp.width).toBe(390);
    expect(vp.height).toBe(844);
    expect(vp.isMobilePortrait).toBe(true);
  });

  it('adapts cleanly when rotating mobile from portrait to landscape', () => {
    const portrait = computeViewportSize(390, 844);
    const landscape = computeViewportSize(844, 390);

    expect(portrait.isMobilePortrait).toBe(true);
    expect(landscape.isMobilePortrait).toBe(false);
    expect(landscape.width).toBe(844);
    expect(landscape.height).toBe(390);
  });

  it('exports default config with localStorageName and desktop max bounds', () => {
    expect(config.localStorageName).toBe('quanticherov1');
    expect(config.maxDesktopWidth).toBe(1280);
    expect(config.maxDesktopHeight).toBe(800);
    expect(config.width).toBeGreaterThan(0);
    expect(config.height).toBeGreaterThan(0);
  });
});
