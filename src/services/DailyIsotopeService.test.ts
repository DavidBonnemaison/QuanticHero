import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearDailyIsotopeCache,
  dateKeyToSeed,
  generateDailyIsotope,
  getDailyDateKey,
  getDailyIsotopePreview,
  getPreviousDateKey,
  getTimeUntilNextDailyUtc
} from './DailyIsotopeService';

describe('DailyIsotopeService', () => {
  beforeEach(() => {
    clearDailyIsotopeCache();
  });

  describe('getDailyDateKey (UTC timezone handling)', () => {
    it('formats UTC dates as YYYY-MM-DD', () => {
      expect(getDailyDateKey(new Date('2026-03-05T12:00:00Z'))).toBe('2026-03-05');
    });

    it('converts non-UTC timezone offsets strictly to UTC calendar day', () => {
      // 23:30 UTC-5 on June 15 is 04:30 UTC on June 16
      expect(getDailyDateKey(new Date('2026-06-15T23:30:00-05:00'))).toBe('2026-06-16');
      // 00:30 UTC+2 on June 15 is 22:30 UTC on June 14
      expect(getDailyDateKey(new Date('2026-06-15T00:30:00+02:00'))).toBe('2026-06-14');
    });
  });

  describe('getPreviousDateKey (UTC rollovers)', () => {
    it('handles normal day, month, leap year, and year boundaries in UTC', () => {
      expect(getPreviousDateKey('2026-05-15')).toBe('2026-05-14');
      expect(getPreviousDateKey('2026-06-01')).toBe('2026-05-31');
      expect(getPreviousDateKey('2026-03-01')).toBe('2026-02-28');
      expect(getPreviousDateKey('2024-03-01')).toBe('2024-02-29');
      expect(getPreviousDateKey('2027-01-01')).toBe('2026-12-31');
    });
  });

  describe('dateKeyToSeed & getDailyIsotopePreview', () => {
    it('produces deterministic 32-bit unsigned FNV-1a seeds', () => {
      const seedA1 = dateKeyToSeed('2026-11-21');
      const seedA2 = dateKeyToSeed('2026-11-21');
      const seedB = dateKeyToSeed('2026-11-22');

      expect(seedA1).toBe(seedA2);
      expect(seedA1).not.toBe(seedB);
      expect(seedA1).toBeGreaterThanOrEqual(0);
      expect(seedA1).toBeLessThanOrEqual(0xffffffff);
    });

    it('selects Z in [3..118] and medium/hard difficulty deterministically', () => {
      const previewA = getDailyIsotopePreview('2026-11-21');
      const previewB = getDailyIsotopePreview('2026-11-21');
      expect(previewA).toEqual(previewB);
      expect(previewA.dateKey).toBe('2026-11-21');
      expect(previewA.z).toBeGreaterThanOrEqual(3);
      expect(previewA.z).toBeLessThanOrEqual(118);
      expect(['medium', 'hard']).toContain(previewA.difficulty);
      expect(previewA.symbol.length).toBeGreaterThan(0);
      expect(previewA.atom.length).toBeGreaterThan(0);
    });
  });

  describe('getTimeUntilNextDailyUtc', () => {
    it('computes exact remaining hours, minutes, seconds until UTC midnight', () => {
      const res = getTimeUntilNextDailyUtc(new Date('2026-11-21T22:15:30Z'));
      expect(res.hours).toBe(1);
      expect(res.minutes).toBe(44);
      expect(res.seconds).toBe(30);
      expect(res.formatted).toBe('01:44:30');
    });

    it('returns 24:00:00 at exact UTC midnight', () => {
      const res = getTimeUntilNextDailyUtc(new Date('2026-11-21T00:00:00Z'));
      expect(res.formatted).toBe('24:00:00');
    });
  });

  describe('generateDailyIsotope (deterministic generation & caching)', () => {
    it('generates the exact same LevelData for the same dateKey even after clearing cache', async () => {
      const first = await generateDailyIsotope('2026-11-21');
      clearDailyIsotopeCache();
      const second = await generateDailyIsotope('2026-11-21');

      expect(first.id).toBe('daily:2026-11-21');
      expect(first).toEqual(second);
      expect(first.platforms.length).toBeGreaterThan(0);
      expect(first.parTimeMs).toBeGreaterThan(0);
      expect(first.parJumps).toBeGreaterThan(0);
    });

    it('generates different levels for different dates', async () => {
      const dayOne = await generateDailyIsotope('2026-11-21');
      const dayTwo = await generateDailyIsotope('2026-11-22');

      expect(dayOne.id).toBe('daily:2026-11-21');
      expect(dayTwo.id).toBe('daily:2026-11-22');
      expect(dayOne.meta?.seed).not.toBe(dayTwo.meta?.seed);
      expect(dayOne.platforms).not.toEqual(dayTwo.platforms);
    });

    it('returns cached instance on subsequent calls for the same dateKey', async () => {
      const first = await generateDailyIsotope('2026-11-25');
      const second = await generateDailyIsotope('2026-11-25');
      expect(second).toBe(first);
    });
  });
});
