import { describe, expect, it } from 'vitest';
import type { LevelData } from '../types';
import {
  compressLevel,
  decodeLevelFromUrl,
  decompressLevel,
  encodeLevelToUrl
} from './levelCodec';

const sampleLevel: LevelData = {
  id: 'custom-1',
  symbol: 'Qh',
  atom: 'Quantumium',
  uncertainty: 2,
  width: 1200,
  height: 800,
  hue: '#070737',
  antiHue: '#c56805',
  explanations: ['Jump high to reach the quantum portal!'],
  player: {
    position: { x: 80, y: 700 }
  },
  door: {
    x: 1100,
    y: 200
  },
  platforms: [
    { x: 0, y: 760, width: 1200, height: 40 },
    { x: 200, y: 640, width: 180, height: 20 },
    { x: 500, y: 500, width: 150, height: 20, movesTo: { x: 700, y: 500, time: 1800 } }
  ],
  particles: [
    { x: 220, y: 600, type: 'speed' },
    { x: 550, y: 460, type: 'lowGravity' }
  ],
  spikes: [{ x: 400, y: 740, width: 60, height: 20 }]
};

describe('levelCodec', () => {
  describe('encode & decode lossless round-trip', () => {
    it('accurately preserves level geometry, player, door, platforms, and particles', () => {
      const url = encodeLevelToUrl(sampleLevel);
      expect(url).toContain('#custom=');

      const decoded = decodeLevelFromUrl(url);
      expect(decoded).not.toBeNull();
      if (!decoded) return;

      expect(decoded.width).toBe(sampleLevel.width);
      expect(decoded.height).toBe(sampleLevel.height);
      expect(decoded.hue).toBe(sampleLevel.hue);
      expect(decoded.antiHue).toBe(sampleLevel.antiHue);
      expect(decoded.player.position.x).toBe(sampleLevel.player.position.x);
      expect(decoded.player.position.y).toBe(sampleLevel.player.position.y);
      expect(decoded.door.x).toBe(sampleLevel.door.x);
      expect(decoded.door.y).toBe(sampleLevel.door.y);
      expect(decoded.atom).toBe(sampleLevel.atom);
      expect(decoded.symbol).toBe(sampleLevel.symbol);
      expect(decoded.uncertainty).toBe(sampleLevel.uncertainty);

      // Platforms
      expect(decoded.platforms.length).toBe(sampleLevel.platforms.length);
      expect(decoded.platforms[0]).toEqual(sampleLevel.platforms[0]);
      expect(decoded.platforms[1]).toEqual(sampleLevel.platforms[1]);
      expect(decoded.platforms[2].movesTo).toEqual({
        x: 700,
        y: 500,
        time: 1800
      });

      // Particles
      expect(decoded.particles.length).toBe(2);
      expect(decoded.particles[0]).toEqual(sampleLevel.particles[0]);
      expect(decoded.particles[1]).toEqual(sampleLevel.particles[1]);

      // Spikes
      expect(decoded.spikes.length).toBe(1);
      expect(decoded.spikes[0]).toEqual(sampleLevel.spikes[0]);

      // Explanations
      expect(decoded.explanations).toEqual(sampleLevel.explanations);
    });

    it('works with uncompressed raw JSON payload fallback', () => {
      const rawJson = JSON.stringify(sampleLevel);
      const decoded = decompressLevel(rawJson);
      expect(decoded).not.toBeNull();
      expect(decoded?.atom).toBe('Quantumium');
      expect(decoded?.player.position.x).toBe(80);
    });
  });

  describe('URL length optimization (acceptance criteria)', () => {
    it('produces an URL under 400 characters for a medium level (15 platforms, 5 particles, 1 portal)', () => {
      const mediumLevel: LevelData = {
        id: 'custom',
        symbol: '?',
        atom: 'Custom Level',
        width: 1200,
        height: 800,
        hue: '#070737',
        antiHue: '#c56805',
        player: { position: { x: 80, y: 700 } },
        door: { x: 1100, y: 200 },
        platforms: Array.from({ length: 15 }, (_, i) => ({
          x: i * 70,
          y: 750 - i * 30,
          width: 60,
          height: 20
        })),
        particles: Array.from({ length: 5 }, (_, i) => ({
          x: 200 + i * 150,
          y: 600 - i * 50,
          type: (['duplicate', 'speed', 'lowGravity', 'antiGravity'] as const)[i % 4]
        })),
        spikes: []
      };

      const fullUrl = encodeLevelToUrl(mediumLevel, 'https://quantumhero.netlify.app/game');
      expect(fullUrl.length).toBeLessThan(400);

      // Verify that this compressed URL decodes correctly
      const decoded = decodeLevelFromUrl(fullUrl);
      expect(decoded).not.toBeNull();
      expect(decoded?.platforms.length).toBe(15);
      expect(decoded?.particles.length).toBe(5);
    });
  });

  describe('URL parameter format parsing', () => {
    it('decodes from a full URL with #custom= parameter', () => {
      const compressed = compressLevel(sampleLevel);
      const fullUrl = `https://quantumhero.netlify.app/game#custom=${compressed}`;
      const decoded = decodeLevelFromUrl(fullUrl);
      expect(decoded?.atom).toBe('Quantumium');
    });

    it('decodes from a URL with ?custom= query parameter', () => {
      const compressed = compressLevel(sampleLevel);
      const queryUrl = `https://quantumhero.netlify.app/game?custom=${compressed}&foo=bar`;
      const decoded = decodeLevelFromUrl(queryUrl);
      expect(decoded?.atom).toBe('Quantumium');
    });

    it('decodes from raw hash string "#custom=..."', () => {
      const compressed = compressLevel(sampleLevel);
      const decoded = decodeLevelFromUrl(`#custom=${compressed}`);
      expect(decoded?.atom).toBe('Quantumium');
    });

    it('decodes from raw compressed string directly', () => {
      const compressed = compressLevel(sampleLevel);
      const decoded = decodeLevelFromUrl(compressed);
      expect(decoded?.atom).toBe('Quantumium');
    });

    it('returns null on empty or whitespace strings', () => {
      expect(decodeLevelFromUrl('')).toBeNull();
      expect(decodeLevelFromUrl('   ')).toBeNull();
    });
  });

  describe('Robustness against corrupted or malicious payloads', () => {
    it('returns null on random invalid garbage', () => {
      expect(decodeLevelFromUrl('#custom=not-a-valid-payload-XYZ123')).toBeNull();
      expect(decompressLevel('some_random_string_###')).toBeNull();
    });

    it('returns null if player coordinates are missing', () => {
      const missingPlayer = {
        v: 1,
        w: 1000,
        h: 1000,
        d: [500, 500],
        p: [[0, 900, 1000, 20]]
      };
      const json = JSON.stringify(missingPlayer);
      expect(decompressLevel(json)).toBeNull();
    });

    it('returns null if door coordinates are missing', () => {
      const missingDoor = {
        v: 1,
        w: 1000,
        h: 1000,
        pl: [100, 900],
        p: [[0, 900, 1000, 20]]
      };
      const json = JSON.stringify(missingDoor);
      expect(decompressLevel(json)).toBeNull();
    });

    it('returns null if coordinates are out of reasonable game world bounds', () => {
      const outOfBounds = {
        v: 1,
        w: 1000,
        h: 1000,
        pl: [50000, 50000],
        d: [500, 500],
        p: []
      };
      const json = JSON.stringify(outOfBounds);
      expect(decompressLevel(json)).toBeNull();
    });

    it('sanitizes malicious script tags and HTML injection in text fields', () => {
      const xssLevel: LevelData = {
        ...sampleLevel,
        atom: '<script>alert("xss")</script>Quantum',
        symbol: '<Q>',
        id: '<b>hacked</b>'
      };

      const url = encodeLevelToUrl(xssLevel);
      const decoded = decodeLevelFromUrl(url);

      expect(decoded).not.toBeNull();
      expect(decoded?.atom).not.toContain('<script>');
      expect(decoded?.symbol).not.toContain('<');
      expect(decoded?.id).not.toContain('<b>');
    });

    it('limits platform count to prevent Denial of Service', () => {
      const hugePlatformCount: LevelData = {
        ...sampleLevel,
        platforms: Array.from({ length: 600 }, (_, i) => ({
          x: i,
          y: i,
          width: 20,
          height: 10
        }))
      };
      const url = encodeLevelToUrl(hugePlatformCount);
      const decoded = decodeLevelFromUrl(url);
      expect(decoded?.platforms.length).toBeLessThanOrEqual(300);
    });
  });
});
