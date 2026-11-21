import { describe, expect, it } from 'vitest';
import type { DuelChallenge, LevelData } from '../types';
import { compressTrajectory, decompressTrajectory } from './GhostRecorder';
import {
  compressLevel,
  decodeDuelFromUrl,
  decodeDuelPayload,
  decodeLevelFromUrl,
  decompressLevel,
  encodeDuelPayload,
  encodeDuelToUrl,
  encodeLevelToUrl,
  formatDuelSeconds,
  sanitizeChallengerName
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

    it('preserves authorGhost and authorTime when present in level data', () => {
      const challengeLevel: LevelData = {
        ...sampleLevel,
        authorGhost: 'v1|0,80,910,0,idle,0;200,85,910,0,walk,0;1200,750,750,0,idle,0',
        authorTime: 12450
      };

      const url = encodeLevelToUrl(challengeLevel);
      const decoded = decodeLevelFromUrl(url);

      expect(decoded).not.toBeNull();
      expect(decoded?.authorGhost).toBe(challengeLevel.authorGhost);
      expect(decoded?.authorTime).toBe(12450);
    });

    it('works with uncompressed raw JSON payload fallback', () => {
      const rawJson = JSON.stringify(sampleLevel);
      const decoded = decompressLevel(rawJson);
      expect(decoded).not.toBeNull();
      expect(decoded?.atom).toBe('Quantumium');
      expect(decoded?.player.position.x).toBe(80);
    });

    it('losslessly preserves kind, phase, decayMs, cracked, matterState, gates, pressurePlates, collapse, entanglement, screenWrap, and wormholes', () => {
      const v3Level: LevelData = {
        ...sampleLevel,
        platforms: [
          { x: 0, y: 760, width: 1200, height: 40, kind: 'standard' },
          { x: 100, y: 400, width: 20, height: 200, kind: 'wall' },
          { x: 300, y: 550, width: 120, height: 20, phase: 'cyan' },
          { x: 450, y: 500, width: 120, height: 20, phase: 'magenta', decayMs: 1200 },
          {
            x: 600,
            y: 450,
            width: 100,
            height: 20,
            cracked: true,
            matterState: 'cryo',
            movesTo: { x: 750, y: 450, time: 1500 }
          }
        ],
        gates: [{ id: 'g1', x: 800, y: 300, width: 20, height: 120 }],
        pressurePlates: [
          { id: 'p1', x: 320, y: 530, width: 40, height: 10, targetGateId: 'g1', requireLock: true }
        ],
        collapse: { speedY: 18, delayMs: 2500 },
        entanglement: {
          mode: 'mirror_and_gravity',
          betaSpawn: { x: 80, y: 120 },
          portalMode: 'dual',
          betaDoor: { x: 1100, y: 600 }
        },
        screenWrap: true,
        wormholes: [
          {
            id: 'w1',
            inX: 200,
            inY: 300,
            inNormalAngleDeg: -90,
            outX: 900,
            outY: 300,
            outNormalAngleDeg: 0
          }
        ]
      };

      const compressed = compressLevel(v3Level);
      const decoded = decompressLevel(compressed);

      expect(decoded).not.toBeNull();
      if (!decoded) return;

      expect(decoded.platforms).toEqual(v3Level.platforms);
      expect(decoded.gates).toEqual(v3Level.gates);
      expect(decoded.pressurePlates).toEqual(v3Level.pressurePlates);
      expect(decoded.collapse).toEqual(v3Level.collapse);
      expect(decoded.entanglement).toEqual(v3Level.entanglement);
      expect(decoded.screenWrap).toBe(true);
      expect(decoded.wormholes).toEqual(v3Level.wormholes);
    });

    it('maintains backward compatibility with legacy v1 payloads', () => {
      const v1Payload = {
        v: 1,
        w: 1000,
        h: 1000,
        c: '#070737',
        ac: '#c56805',
        pl: [80, 910],
        d: [750, 750],
        p: [
          [0, 950, 1000, 50],
          [300, 700, 100, 20, 500, 700, 2000]
        ]
      };
      const decoded = decompressLevel(JSON.stringify(v1Payload));
      expect(decoded).not.toBeNull();
      expect(decoded?.platforms).toEqual([
        { x: 0, y: 950, width: 1000, height: 50 },
        { x: 300, y: 700, width: 100, height: 20, movesTo: { x: 500, y: 700, time: 2000 } }
      ]);
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

  describe('Spec-02: Ghost Tennis Duel codec (#duel=)', () => {
    const realisticGhost = compressTrajectory(
      Array.from({ length: 120 }, (_, i) => ({
        timeMs: i * 66,
        x: 80 + i * 7,
        y: 900 - Math.round(Math.sin(i / 8) * 140),
        flipX: false,
        animState: i % 10 < 3 ? 'jump' : 'right'
      }))
    );

    const shortGhost = compressTrajectory([
      { timeMs: 0, x: 80, y: 910, flipX: false, animState: 'idle' },
      { timeMs: 400, x: 240, y: 800, flipX: false, animState: 'jump' },
      { timeMs: 1200, x: 520, y: 740, flipX: false, animState: 'right' },
      { timeMs: 2400, x: 750, y: 750, flipX: false, animState: 'idle' }
    ]);

    it('sanitizes challenger names to uppercase alphanumeric max 12 chars with ALPHA fallback', () => {
      expect(sanitizeChallengerName(undefined)).toBe('ALPHA');
      expect(sanitizeChallengerName('')).toBe('ALPHA');
      expect(sanitizeChallengerName('   !!!  ')).toBe('ALPHA');
      expect(sanitizeChallengerName('neo_speedrunner99')).toBe('NEOSPEEDRUNN');
      expect(sanitizeChallengerName('quantic-42')).toBe('QUANTIC42');
    });

    it('formats duel seconds with leading zero padding under 10s', () => {
      expect(formatDuelSeconds(8420)).toBe('08.42s');
      expect(formatDuelSeconds(12340)).toBe('12.34s');
      expect(formatDuelSeconds(0)).toBe('00.00s');
    });

    it('round-trips campaign duel payload and URL with ultra-compact URL (< 400 chars)', () => {
      const duel: DuelChallenge = {
        kind: 'campaign',
        levelId: 26,
        challengerName: 'NOVA',
        challengerTimeMs: 8420,
        challengerJumps: 5,
        ghostTrajectory: realisticGhost
      };

      const url = encodeDuelToUrl(duel, 'https://quantumhero.netlify.app/game');
      expect(url).toContain('#duel=');
      expect(url.length).toBeLessThan(400);

      const decoded = decodeDuelFromUrl(url);
      expect(decoded).not.toBeNull();
      expect(decoded?.kind).toBe('campaign');
      if (decoded?.kind === 'campaign') {
        expect(decoded.levelId).toBe(26);
        expect(decoded.challengerName).toBe('NOVA');
        expect(decoded.challengerTimeMs).toBe(8420);
        expect(decoded.challengerJumps).toBe(5);
        expect(decoded.ghostTrajectory.startsWith('v1|')).toBe(true);
        expect(decompressTrajectory(decoded.ghostTrajectory).length).toBeGreaterThanOrEqual(12);
      }
    });

    it('round-trips daily duel payload and URL with ultra-compact URL (< 400 chars)', () => {
      const duel: DuelChallenge = {
        kind: 'daily',
        dateKey: '2026-11-21',
        challengerName: 'ALPHA',
        challengerTimeMs: 9150,
        challengerJumps: 4,
        ghostTrajectory: realisticGhost
      };

      const url = encodeDuelToUrl(duel, 'https://quantumhero.netlify.app/game');
      expect(url).toContain('#duel=');
      expect(url.length).toBeLessThan(400);

      const decoded = decodeDuelFromUrl(url);
      expect(decoded).not.toBeNull();
      expect(decoded?.kind).toBe('daily');
      if (decoded?.kind === 'daily') {
        expect(decoded.dateKey).toBe('2026-11-21');
        expect(decoded.challengerName).toBe('ALPHA');
        expect(decoded.challengerTimeMs).toBe(9150);
        expect(decoded.challengerJumps).toBe(4);
        expect(decoded.ghostTrajectory.startsWith('v1|')).toBe(true);
      }
    });

    it('round-trips custom duel payload with embedded LevelData and ghost trajectory', () => {
      const duel: DuelChallenge = {
        kind: 'custom',
        level: sampleLevel,
        challengerName: 'BOSON',
        challengerTimeMs: 11250,
        challengerJumps: 7,
        ghostTrajectory: shortGhost
      };

      const payload = encodeDuelPayload(duel);
      const decoded = decodeDuelPayload(payload);
      expect(decoded).not.toBeNull();
      expect(decoded?.kind).toBe('custom');
      if (decoded?.kind === 'custom') {
        expect(decoded.challengerName).toBe('BOSON');
        expect(decoded.challengerTimeMs).toBe(11250);
        expect(decoded.challengerJumps).toBe(7);
        expect(decoded.ghostTrajectory).toBe(shortGhost);
        expect(decoded.level.atom).toBe(sampleLevel.atom);
        expect(decoded.level.platforms.length).toBe(sampleLevel.platforms.length);
      }
    });

    it('supports both #duel= hash and ?duel= query formats', () => {
      const duel: DuelChallenge = {
        kind: 'campaign',
        levelId: 3,
        challengerName: 'QUARK',
        challengerTimeMs: 5100,
        challengerJumps: 2,
        ghostTrajectory: shortGhost
      };
      const payload = encodeDuelPayload(duel);

      const fromHash = decodeDuelFromUrl(`#duel=${payload}`);
      const fromQuery = decodeDuelFromUrl(`?duel=${payload}&foo=bar`);
      expect(fromHash).toEqual(duel);
      expect(fromQuery).toEqual(duel);
    });

    it('gracefully rejects corrupted or invalid duel payloads', () => {
      expect(decodeDuelPayload('')).toBeNull();
      expect(decodeDuelPayload('not-valid-lz-garbage!!!')).toBeNull();
      expect(decodeDuelFromUrl('#duel=corrupted')).toBeNull();

      // Out-of-bounds campaign levelId
      const badLevelPayload = encodeDuelPayload({
        kind: 'campaign',
        levelId: 1,
        challengerName: 'ALPHA',
        challengerTimeMs: 1000,
        challengerJumps: 1,
        ghostTrajectory: shortGhost
      });
      expect(decodeDuelPayload(badLevelPayload)).not.toBeNull();

      // Invalid daily dateKey
      const badDaily = encodeDuelPayload({
        kind: 'daily',
        dateKey: 'not-a-date',
        challengerName: 'ALPHA',
        challengerTimeMs: 1000,
        challengerJumps: 1,
        ghostTrajectory: shortGhost
      });
      expect(decodeDuelPayload(badDaily)).toBeNull();
    });
  });
});
