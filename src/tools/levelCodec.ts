import LZString from 'lz-string';
import type { LevelData, Particle, ParticleType, Platform, Spike } from '../types';

export const PARTICLE_TYPES: ParticleType[] = ['duplicate', 'speed', 'lowGravity', 'antiGravity'];

/**
 * Minified representation of LevelData for compact URL transmission.
 * Uses short keys and tuple arrays to minimize JSON size before compression.
 */
export interface MinifiedLevel {
  v: number;
  i?: string;
  s?: string;
  a?: string;
  u?: number;
  w: number;
  h: number;
  c: string;
  ac: string;
  pl: [number, number];
  d: [number, number];
  p: Array<
    [number, number, number, number] | [number, number, number, number, number, number, number]
  >;
  t?: Array<[number, number, number]>;
  sp?: Array<[number, number] | [number, number, number, number]>;
  e?: string[];
  g?: string;
  bt?: number;
}

function sanitizeNumber(val: unknown, min: number, max: number, defaultVal: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return defaultVal;
  }
  return Math.min(Math.max(val, min), max);
}

function sanitizeColor(val: unknown, defaultColor: string): string {
  if (typeof val !== 'string') return defaultColor;
  const trimmed = val.trim();
  if (/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return trimmed;
  }
  if (/^(?:rgb|hsl)a?\([^)]*\)$/i.test(trimmed)) {
    return trimmed;
  }
  return defaultColor;
}

function sanitizeText(val: unknown, maxLength: number, defaultText: string): string {
  if (typeof val !== 'string') return defaultText;
  const cleaned = val.replace(/[<>]/g, '').trim().slice(0, maxLength);
  return cleaned || defaultText;
}

/**
 * Minifies and compresses a LevelData structure into a URI-safe string.
 */
export function compressLevel(level: LevelData): string {
  const minified: MinifiedLevel = {
    v: 1,
    w: Math.round(sanitizeNumber(level.width, 100, 10000, 1000)),
    h: Math.round(sanitizeNumber(level.height, 100, 10000, 1000)),
    c: sanitizeColor(level.hue, '#070737'),
    ac: sanitizeColor(level.antiHue, '#c56805'),
    pl: [
      Math.round(sanitizeNumber(level.player?.position?.x, 0, 10000, 80)),
      Math.round(sanitizeNumber(level.player?.position?.y, 0, 10000, 910))
    ],
    d: [
      Math.round(sanitizeNumber(level.door?.x, 0, 10000, 750)),
      Math.round(sanitizeNumber(level.door?.y, 0, 10000, 750))
    ],
    p: (level.platforms || []).slice(0, 300).map((plat) => {
      const x = Math.round(plat.x);
      const y = Math.round(plat.y);
      const w = Math.round(plat.width);
      const h = Math.round(plat.height);
      if (plat.movesTo && (plat.movesTo.x !== undefined || plat.movesTo.y !== undefined)) {
        return [
          x,
          y,
          w,
          h,
          Math.round(plat.movesTo.x ?? x),
          Math.round(plat.movesTo.y ?? y),
          Math.round(plat.movesTo.time ?? 2000)
        ];
      }
      return [x, y, w, h];
    })
  };

  if (level.particles && level.particles.length > 0) {
    minified.t = level.particles.slice(0, 100).map((part) => {
      const typeIdx = PARTICLE_TYPES.indexOf(part.type);
      return [Math.round(part.x), Math.round(part.y), typeIdx >= 0 ? typeIdx : 0];
    });
  }

  if (level.spikes && level.spikes.length > 0) {
    minified.sp = level.spikes.slice(0, 100).map((sp) => {
      if (sp.width !== undefined || sp.height !== undefined) {
        return [
          Math.round(sp.x),
          Math.round(sp.y),
          Math.round(sp.width ?? 20),
          Math.round(sp.height ?? 20)
        ];
      }
      return [Math.round(sp.x), Math.round(sp.y)];
    });
  }

  if (level.atom && level.atom !== 'Custom Level') {
    minified.a = sanitizeText(level.atom, 40, 'Custom Level');
  }
  if (level.symbol && level.symbol !== '?') {
    minified.s = sanitizeText(level.symbol, 5, '?');
  }
  if (level.id && level.id !== 'custom') {
    minified.i = sanitizeText(level.id, 20, 'custom');
  }
  if (level.uncertainty !== undefined && level.uncertainty !== 3) {
    minified.u = sanitizeNumber(level.uncertainty, 1, 10, 3);
  }
  if (level.explanations && level.explanations.length > 0) {
    minified.e = level.explanations
      .slice(0, 5)
      .map((ex) => sanitizeText(ex, 150, ''))
      .filter(Boolean);
  }
  if (level.authorGhost) {
    minified.g = level.authorGhost;
  }
  if (level.authorTime !== undefined && level.authorTime > 0) {
    minified.bt = Math.round(level.authorTime);
  }

  const json = JSON.stringify(minified);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * Validates, sanitizes, and unpacks an object into LevelData.
 * Returns null if the structure is corrupt, invalid, or missing required fields.
 */
function unpackAndValidateLevel(raw: any): LevelData | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  // Check player coordinates
  let playerX: number | undefined;
  let playerY: number | undefined;

  if (Array.isArray(raw.pl) && raw.pl.length >= 2) {
    playerX = raw.pl[0];
    playerY = raw.pl[1];
  } else if (raw.player?.position && typeof raw.player.position.x === 'number') {
    playerX = raw.player.position.x;
    playerY = raw.player.position.y;
  }

  // Check door coordinates
  let doorX: number | undefined;
  let doorY: number | undefined;

  if (Array.isArray(raw.d) && raw.d.length >= 2) {
    doorX = raw.d[0];
    doorY = raw.d[1];
  } else if (raw.door && typeof raw.door.x === 'number') {
    doorX = raw.door.x;
    doorY = raw.door.y;
  }

  // Player and door positions are strictly required
  if (
    playerX === undefined ||
    playerY === undefined ||
    doorX === undefined ||
    doorY === undefined ||
    !Number.isFinite(playerX) ||
    !Number.isFinite(playerY) ||
    !Number.isFinite(doorX) ||
    !Number.isFinite(doorY)
  ) {
    return null;
  }

  const rawWidth = raw.w ?? raw.width;
  const rawHeight = raw.h ?? raw.height;
  if (
    (rawWidth !== undefined &&
      (typeof rawWidth !== 'number' || rawWidth <= 0 || !Number.isFinite(rawWidth))) ||
    (rawHeight !== undefined &&
      (typeof rawHeight !== 'number' || rawHeight <= 0 || !Number.isFinite(rawHeight)))
  ) {
    return null;
  }

  const width = Math.round(sanitizeNumber(rawWidth, 200, 10000, 1000));
  const height = Math.round(sanitizeNumber(rawHeight, 200, 10000, 1000));

  // Ensure player and door are within reasonable world bounds
  if (playerX < -100 || playerX > width + 100 || playerY < -100 || playerY > height + 100) {
    return null;
  }
  if (doorX < -100 || doorX > width + 100 || doorY < -100 || doorY > height + 100) {
    return null;
  }

  const hue = sanitizeColor(raw.c ?? raw.hue, '#070737');
  const antiHue = sanitizeColor(raw.ac ?? raw.antiHue, '#c56805');
  const atom = sanitizeText(raw.a ?? raw.atom, 40, 'Custom Level');
  const symbol = sanitizeText(raw.s ?? raw.symbol, 5, '?');
  const id = sanitizeText(raw.i ?? raw.id, 20, 'custom');
  const uncertainty = sanitizeNumber(raw.u ?? raw.uncertainty, 1, 10, 3);

  // Unpack platforms
  const rawPlatforms = raw.p ?? raw.platforms ?? [];
  if (!Array.isArray(rawPlatforms)) {
    return null;
  }

  const platforms: Platform[] = [];
  for (const item of rawPlatforms.slice(0, 300)) {
    if (Array.isArray(item)) {
      if (
        item.length >= 4 &&
        item.every((n: unknown) => typeof n === 'number' && Number.isFinite(n))
      ) {
        const plat: Platform = {
          x: item[0],
          y: item[1],
          width: Math.max(1, item[2]),
          height: Math.max(1, item[3])
        };
        if (item.length >= 7) {
          plat.movesTo = {
            x: item[4],
            y: item[5],
            time: Math.max(100, item[6])
          };
        }
        platforms.push(plat);
      }
    } else if (item && typeof item === 'object') {
      if (
        typeof item.x === 'number' &&
        typeof item.y === 'number' &&
        typeof item.width === 'number' &&
        typeof item.height === 'number'
      ) {
        const plat: Platform = {
          x: item.x,
          y: item.y,
          width: Math.max(1, item.width),
          height: Math.max(1, item.height)
        };
        if (
          item.movesTo &&
          (typeof item.movesTo.x === 'number' || typeof item.movesTo.y === 'number')
        ) {
          plat.movesTo = {
            x: item.movesTo.x ?? item.x,
            y: item.movesTo.y ?? item.y,
            time: typeof item.movesTo.time === 'number' ? Math.max(100, item.movesTo.time) : 2000
          };
        }
        platforms.push(plat);
      }
    }
  }

  // Unpack particles
  const rawParticles = raw.t ?? raw.particles ?? [];
  const particles: Particle[] = [];
  if (Array.isArray(rawParticles)) {
    for (const item of rawParticles.slice(0, 100)) {
      if (Array.isArray(item) && item.length >= 3) {
        const [px, py, rawType] = item;
        if (typeof px === 'number' && typeof py === 'number') {
          let pType: ParticleType = 'duplicate';
          if (typeof rawType === 'number' && rawType >= 0 && rawType < PARTICLE_TYPES.length) {
            pType = PARTICLE_TYPES[rawType];
          } else if (
            typeof rawType === 'string' &&
            PARTICLE_TYPES.includes(rawType as ParticleType)
          ) {
            pType = rawType as ParticleType;
          }
          particles.push({ x: px, y: py, type: pType });
        }
      } else if (item && typeof item === 'object') {
        if (typeof item.x === 'number' && typeof item.y === 'number') {
          const pType: ParticleType = PARTICLE_TYPES.includes(item.type) ? item.type : 'duplicate';
          particles.push({ x: item.x, y: item.y, type: pType });
        }
      }
    }
  }

  // Unpack spikes
  const rawSpikes = raw.sp ?? raw.spikes ?? [];
  const spikes: Spike[] = [];
  if (Array.isArray(rawSpikes)) {
    for (const item of rawSpikes.slice(0, 100)) {
      if (Array.isArray(item) && item.length >= 2) {
        const [sx, sy, sw, sh] = item;
        if (typeof sx === 'number' && typeof sy === 'number') {
          spikes.push({
            x: sx,
            y: sy,
            ...(typeof sw === 'number' ? { width: sw } : {}),
            ...(typeof sh === 'number' ? { height: sh } : {})
          });
        }
      } else if (item && typeof item === 'object') {
        if (typeof item.x === 'number' && typeof item.y === 'number') {
          spikes.push({
            x: item.x,
            y: item.y,
            ...(typeof item.width === 'number' ? { width: item.width } : {}),
            ...(typeof item.height === 'number' ? { height: item.height } : {})
          });
        }
      }
    }
  }

  const explanations: string[] = [];
  const rawExp = raw.e ?? raw.explanations;
  if (Array.isArray(rawExp)) {
    for (const text of rawExp.slice(0, 10)) {
      if (typeof text === 'string') {
        const cleaned = sanitizeText(text, 200, '');
        if (cleaned) explanations.push(cleaned);
      }
    }
  }

  let authorGhost: string | undefined;
  if (typeof raw.g === 'string' && raw.g.startsWith('v1|')) {
    authorGhost = raw.g;
  } else if (typeof raw.authorGhost === 'string' && raw.authorGhost.startsWith('v1|')) {
    authorGhost = raw.authorGhost;
  }

  let authorTime: number | undefined;
  if (typeof raw.bt === 'number' && raw.bt > 0) {
    authorTime = Math.round(raw.bt);
  } else if (typeof raw.authorTime === 'number' && raw.authorTime > 0) {
    authorTime = Math.round(raw.authorTime);
  }

  const level: LevelData = {
    id,
    symbol,
    atom,
    uncertainty,
    width,
    height,
    hue,
    antiHue,
    player: {
      position: {
        x: playerX,
        y: playerY
      }
    },
    door: {
      x: doorX,
      y: doorY
    },
    platforms,
    particles,
    spikes,
    ...(explanations.length > 0 ? { explanations } : {}),
    ...(authorGhost ? { authorGhost } : {}),
    ...(authorTime ? { authorTime } : {})
  };

  return level;
}

/**
 * Decompresses an encoded URI component string into LevelData.
 * Returns null if the string is corrupt or invalid.
 */
export function decompressLevel(compressed: string): LevelData | null {
  if (!compressed || typeof compressed !== 'string') return null;

  const trimmed = compressed.trim();
  // If it directly looks like JSON, attempt to parse it directly
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const level = unpackAndValidateLevel(parsed);
      if (level) return level;
    } catch {
      // Fall through to LZ decompress
    }
  }

  let rawJson: string | null = null;
  try {
    rawJson = LZString.decompressFromEncodedURIComponent(compressed);
  } catch {
    return null;
  }

  if (!rawJson) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }

  return unpackAndValidateLevel(parsed);
}

/**
 * Encodes a LevelData object into a full playable URL containing #custom=<compressed>.
 */
export function encodeLevelToUrl(level: LevelData, baseUrl?: string): string {
  const compressed = compressLevel(level);
  let base = baseUrl;
  if (!base) {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://quantumhero.netlify.app';
    base = `${origin}/game`;
  }
  return `${base}#custom=${compressed}`;
}

/**
 * Decodes a LevelData object from a URL, hash, or query string.
 * Extracts the 'custom' param and decompresses it safely.
 */
export function decodeLevelFromUrl(hashOrQueryOrUrl: string): LevelData | null {
  if (!hashOrQueryOrUrl || typeof hashOrQueryOrUrl !== 'string') {
    return null;
  }

  let payload = '';

  const customIndex = hashOrQueryOrUrl.indexOf('custom=');
  if (customIndex !== -1) {
    const start = customIndex + 'custom='.length;
    const end = hashOrQueryOrUrl.indexOf('&', start);
    payload = end === -1 ? hashOrQueryOrUrl.slice(start) : hashOrQueryOrUrl.slice(start, end);
  } else {
    let cleaned = hashOrQueryOrUrl.trim();
    if (cleaned.startsWith('#') || cleaned.startsWith('?')) {
      cleaned = cleaned.slice(1);
    }
    payload = cleaned;
  }

  if (!payload) return null;

  try {
    payload = decodeURIComponent(payload);
  } catch {
    // Keep raw payload if decode fails
  }

  return decompressLevel(payload);
}
