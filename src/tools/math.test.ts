import { describe, expect, it } from 'vitest';
import { inRange, random, range, remove, round, sample, uniqBy } from './math';

describe('math tools', () => {
  describe('sample', () => {
    it('returns an element from the given array', () => {
      const items = ['a', 'b', 'c'];
      const result = sample(items);
      expect(items).toContain(result);
    });

    it('returns the only element when array has length 1', () => {
      expect(sample([42])).toBe(42);
    });
  });

  describe('random', () => {
    it('returns an integer within default range [0, 1]', () => {
      for (let i = 0; i < 20; i++) {
        const val = random();
        expect(Number.isInteger(val)).toBe(true);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('returns an integer within specified [min, max]', () => {
      for (let i = 0; i < 20; i++) {
        const val = random(10, 20);
        expect(Number.isInteger(val)).toBe(true);
        expect(val).toBeGreaterThanOrEqual(10);
        expect(val).toBeLessThanOrEqual(20);
      }
    });

    it('returns floating point when requested', () => {
      const val = random(0, 1, true);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    });

    it('handles float bounds automatically as floating numbers', () => {
      const val = random(1.5, 4.5);
      expect(val).toBeGreaterThanOrEqual(1.5);
      expect(val).toBeLessThanOrEqual(4.5);
    });
  });

  describe('range', () => {
    it('generates an array from 0 to length - 1 with single argument', () => {
      expect(range(4)).toEqual([0, 1, 2, 3]);
      expect(range(0)).toEqual([]);
      expect(range(-3)).toEqual([]);
    });

    it('generates an array from start to end (exclusive) with two arguments', () => {
      expect(range(2, 6)).toEqual([2, 3, 4, 5]);
      expect(range(5, 5)).toEqual([]);
    });

    it('supports custom step values', () => {
      expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
      expect(range(1, 10, 3)).toEqual([1, 4, 7]);
    });

    it('defaults step to 1 if step is 0', () => {
      expect(range(0, 3, 0)).toEqual([0, 1, 2]);
    });
  });

  describe('round', () => {
    it('rounds numbers to nearest integer by default', () => {
      expect(round(4.4)).toBe(4);
      expect(round(4.5)).toBe(5);
      expect(round(4.6)).toBe(5);
    });

    it('rounds to specified decimal places', () => {
      expect(round(Math.PI, 2)).toBe(3.14);
      expect(round(3.145, 2)).toBe(3.15);
      expect(round(1.23456, 3)).toBe(1.235);
    });
  });

  describe('uniqBy', () => {
    it('removes duplicate elements according to key function', () => {
      const input = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 1, name: 'Charlie' }
      ];
      const result = uniqBy(input, (item) => item.id);
      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]);
    });

    it('handles already unique arrays without modification', () => {
      const numbers = [1, 2, 3, 4];
      expect(uniqBy(numbers, (x) => x)).toEqual([1, 2, 3, 4]);
    });

    it('handles empty arrays', () => {
      expect(uniqBy([], (x) => x)).toEqual([]);
    });
  });

  describe('inRange', () => {
    it('returns true if value is within [min, max)', () => {
      expect(inRange(3, 2, 5)).toBe(true);
      expect(inRange(2, 2, 5)).toBe(true);
      expect(inRange(5, 2, 5)).toBe(false);
      expect(inRange(1, 2, 5)).toBe(false);
      expect(inRange(6, 2, 5)).toBe(false);
    });

    it('swaps min and max when min > max', () => {
      expect(inRange(3, 5, 2)).toBe(true);
      expect(inRange(2, 5, 2)).toBe(true);
      expect(inRange(5, 5, 2)).toBe(false);
    });
  });

  describe('remove', () => {
    it('removes matching elements in-place and returns them', () => {
      const numbers = [1, 2, 3, 4, 5, 6];
      const removed = remove(numbers, (n) => n % 2 === 0);

      expect(removed).toEqual([2, 4, 6]);
      expect(numbers).toEqual([1, 3, 5]);
    });

    it('returns empty array when no elements match', () => {
      const list = [1, 3, 5];
      const removed = remove(list, (n) => n % 2 === 0);

      expect(removed).toEqual([]);
      expect(list).toEqual([1, 3, 5]);
    });

    it('removes all elements when all match', () => {
      const list = [2, 4, 6];
      const removed = remove(list, (n) => n % 2 === 0);

      expect(removed).toEqual([2, 4, 6]);
      expect(list).toEqual([]);
    });
  });
});
