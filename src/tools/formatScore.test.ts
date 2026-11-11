import { describe, expect, it } from 'vitest';
import { formatScore } from './formatScore';

describe('formatScore', () => {
  it('converts 0 milliseconds to 00:00:00', () => {
    expect(formatScore(0)).toBe('00:00:00');
  });

  it('handles negative numbers by returning 00:00:00', () => {
    expect(formatScore(-1)).toBe('00:00:00');
    expect(formatScore(-5000)).toBe('00:00:00');
  });

  it('handles NaN by returning 00:00:00', () => {
    expect(formatScore(Number.NaN)).toBe('00:00:00');
  });

  it('formats typical milliseconds correctly into mm:ss:SS', () => {
    // 500 ms = 00:00:50
    expect(formatScore(500)).toBe('00:00:50');
    // 1230 ms = 1 sec 23 cs -> 00:01:23
    expect(formatScore(1230)).toBe('00:01:23');
    // 65430 ms = 1 min 5 sec 43 cs -> 01:05:43
    expect(formatScore(65430)).toBe('01:05:43');
  });

  it('handles fractional milliseconds by flooring', () => {
    expect(formatScore(1234.9)).toBe('00:01:23');
  });

  it('handles large numbers (over 60 minutes)', () => {
    // 61 minutes, 1 second, 50 ms (5 cs)
    const ms = 61 * 60 * 1000 + 1 * 1000 + 50;
    expect(formatScore(ms)).toBe('61:01:05');

    // 100 minutes
    expect(formatScore(100 * 60 * 1000)).toBe('100:00:00');
  });
});
