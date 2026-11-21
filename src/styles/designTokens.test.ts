import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('Epic 06 Spec 01 — Self-Hosted Typography & Design Tokens', () => {
  it('removes all Google Fonts references and VT323 from index.html and vite.config.js', () => {
    const indexHtml = readRepoFile('index.html');
    const viteConfig = readRepoFile('vite.config.js');

    expect(indexHtml).not.toContain('fonts.googleapis.com');
    expect(indexHtml).not.toContain('fonts.gstatic.com');
    expect(indexHtml).not.toContain('VT323');
    expect(indexHtml).toContain('content="#050814"');

    expect(viteConfig).not.toContain('fonts.googleapis.com');
    expect(viteConfig).not.toContain('fonts.gstatic.com');
    expect(viteConfig).toContain("theme_color: '#050814'");
    expect(viteConfig).toContain("background_color: '#050814'");
  });

  it('imports self-hosted Silkscreen, JetBrains Mono, and centralized tokens in src/main.tsx', () => {
    const mainTsx = readRepoFile('src/main.tsx');
    expect(mainTsx).toContain('@fontsource/silkscreen/');
    expect(mainTsx).toContain('@fontsource/jetbrains-mono/');
    expect(mainTsx).toContain('./styles/tokens.css');
  });

  it('defines dark-lab glassmorphism tokens and dynamic atom hue variables in src/styles/tokens.css', () => {
    const tokensCss = readRepoFile('src/styles/tokens.css');
    expect(tokensCss).toMatch(/--font-display:\s*['"]Silkscreen['"]/);
    expect(tokensCss).toMatch(/--font-ui:\s*['"]JetBrains Mono['"]/);
    expect(tokensCss).toMatch(/--font-mono:\s*['"]JetBrains Mono['"]/);
    expect(tokensCss).toContain('--bg-deep: #050814');
    expect(tokensCss).toContain('--surface-glass: rgba(15, 23, 42, 0.72)');
    expect(tokensCss).toContain('--glass-blur: blur(12px)');
    expect(tokensCss).toContain('--border-subtle: 1px solid rgba(148, 163, 184, 0.18)');
    expect(tokensCss).toContain('--atom-hue:');
    expect(tokensCss).toContain('--atom-anti-hue:');
  });

  it('uses tabular-nums on chrono, timer, and score CSS modules and zero VT323', () => {
    const cssFiles = [
      'src/components/Menu.module.css',
      'src/components/LevelSelection.module.css',
      'src/components/LevelFinished.module.css',
      'src/components/QuantumModesHub.module.css',
      'src/components/AcceleratorMode.module.css',
      'src/components/PeriodicTable.module.css',
      'src/components/MoleculeCodex.module.css',
      'src/components/Explanation.module.css',
      'src/components/Editor/ShareModal.module.css',
      'src/components/Editor/Editor.module.css'
    ];

    for (const file of cssFiles) {
      const css = readRepoFile(file);
      expect(css, `${file} should not reference VT323`).not.toContain('VT323');
      expect(css, `${file} should not reference Orbitron`).not.toContain('Orbitron');
    }

    for (const chronoFile of [
      'src/components/Menu.module.css',
      'src/components/LevelSelection.module.css',
      'src/components/LevelFinished.module.css',
      'src/components/QuantumModesHub.module.css',
      'src/components/AcceleratorMode.module.css'
    ]) {
      expect(
        readRepoFile(chronoFile),
        `${chronoFile} should enforce font-variant-numeric: tabular-nums`
      ).toContain('font-variant-numeric: tabular-nums');
    }
  });

  it('preserves Menu.tsx accessibility/E2E contract (no modern emojis)', () => {
    const menuTsx = readRepoFile('src/components/Menu.tsx');
    const forbiddenEmojis = ['🔊', '🔇', '📳', '📴', '✨', '⚡', '👻', '📤', '✏️', '📱'];
    for (const emoji of forbiddenEmojis) {
      expect(menuTsx).not.toContain(emoji);
    }
  });
});
