export function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function random(min = 0, max = 1, floating?: boolean): number {
  const actualMin = max === undefined ? 0 : min;
  const actualMax = max === undefined ? min : max;
  const isFloat = floating ?? (!Number.isInteger(actualMin) || !Number.isInteger(actualMax));
  if (isFloat) {
    return Math.random() * (actualMax - actualMin) + actualMin;
  }
  return Math.floor(Math.random() * (actualMax - actualMin + 1)) + actualMin;
}

export function range(startOrLength: number, end?: number, step = 1): number[] {
  if (end === undefined) {
    return Array.from({ length: Math.max(0, startOrLength) }, (_, i) => i);
  }
  const stepVal = step === 0 ? 1 : step;
  const length = Math.max(0, Math.ceil((end - startOrLength) / stepVal));
  return Array.from({ length }, (_, i) => startOrLength + i * stepVal);
}

export function round(n: number, precision = 0): number {
  if (precision === 0) {
    return Math.round(n);
  }
  const factor = 10 ** precision;
  return Math.round(n * factor) / factor;
}

export function uniqBy<T, K>(arr: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  for (const item of arr) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

export function inRange(val: number, min: number, max: number): boolean {
  const [start, end] = min > max ? [max, min] : [min, max];
  return val >= start && val < end;
}

export function remove<T>(arr: T[], predicate: (item: T) => boolean): T[] {
  const removed: T[] = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) {
      removed.unshift(arr.splice(i, 1)[0]);
    }
  }
  return removed;
}
