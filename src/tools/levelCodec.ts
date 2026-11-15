import LZString from 'lz-string';
import type {
  EntanglementConfig,
  EntanglementMode,
  Gate,
  LevelData,
  Particle,
  ParticleType,
  Platform,
  PressurePlate,
  Spike
} from '../types';

export const PARTICLE_TYPES: ParticleType[] = [
  'duplicate',
  'speed',
  'lowGravity',
  'antiGravity',
  'tunnel',
  'pauli',
  'timeDilation'
];

export interface MinifiedPlatformOptions {
  k?: 'wall' | 'standard';
  ph?: 'c' | 'm';
  dc?: number;
  cr?: 1;
  ms?: string;
}

export type MinifiedPlatformTuple =
  | [number, number, number, number]
  | [number, number, number, number, MinifiedPlatformOptions]
  | [number, number, number, number, number, number, number]
  | [number, number, number, number, number, number, number, MinifiedPlatformOptions];

export interface MinifiedEntanglement {
  m: EntanglementMode;
  bs?: [number, number];
  pm?: 'single' | 'dual';
  bd?: [number, number];
}

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
  p: MinifiedPlatformTuple[];
  t?: Array<[number, number, number]>;
  sp?: Array<[number, number] | [number, number, number, number]>;
  e?: string[];
  g?: string;
  bt?: number;
  gt?: Array<[string, number, number, number, number]>;
  pp?: Array<[string, number, number, number, number, string, 0 | 1]>;
  cl?: [number, number];
  en?: MinifiedEntanglement;
  sw?: 1;
  wh?: Array<Record<string, unknown>>;
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
    v: 2,
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
    p: (level.platforms || []).slice(0, 300).map((plat): MinifiedPlatformTuple => {
      const x = Math.round(plat.x);
      const y = Math.round(plat.y);
      const w = Math.round(plat.width);
      const h = Math.round(plat.height);

      const opts: MinifiedPlatformOptions = {};
      if (plat.kind === 'wall' || plat.kind === 'standard') {
        opts.k = plat.kind;
      }
      if (plat.phase === 'cyan') {
        opts.ph = 'c';
      } else if (plat.phase === 'magenta') {
        opts.ph = 'm';
      }
      if (typeof plat.decayMs === 'number' && plat.decayMs > 0) {
        opts.dc = Math.round(plat.decayMs);
      }
      if (plat.cracked) {
        opts.cr = 1;
      }
      if (typeof plat.matterState === 'string' && plat.matterState) {
        opts.ms = sanitizeText(plat.matterState, 20, '');
      }
      const hasOpts = Object.keys(opts).length > 0;

      if (plat.movesTo && (plat.movesTo.x !== undefined || plat.movesTo.y !== undefined)) {
        const mx = Math.round(plat.movesTo.x ?? x);
        const my = Math.round(plat.movesTo.y ?? y);
        const mt = Math.round(plat.movesTo.time ?? 2000);
        return hasOpts ? [x, y, w, h, mx, my, mt, opts] : [x, y, w, h, mx, my, mt];
      }
      return hasOpts ? [x, y, w, h, opts] : [x, y, w, h];
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

  if (level.gates && level.gates.length > 0) {
    minified.gt = level.gates.slice(0, 50).map((gate) => [
      sanitizeText(gate.id, 30, 'g'),
      Math.round(gate.x),
      Math.round(gate.y),
      Math.round(gate.width),
      Math.round(gate.height)
    ]);
  }

  if (level.pressurePlates && level.pressurePlates.length > 0) {
    minified.pp = level.pressurePlates.slice(0, 50).map((plate) => [
      sanitizeText(plate.id, 30, 'p'),
      Math.round(plate.x),
      Math.round(plate.y),
      Math.round(plate.width),
      Math.round(plate.height),
      sanitizeText(plate.targetGateId, 30, 'g'),
      plate.requireLock ? 1 : 0
    ]);
  }

  if (
    level.collapse &&
    typeof level.collapse.speedY === 'number' &&
    typeof level.collapse.delayMs === 'number'
  ) {
    minified.cl = [Math.round(level.collapse.speedY), Math.round(level.collapse.delayMs)];
  }

  if (level.entanglement?.mode) {
    const en: MinifiedEntanglement = {
      m: level.entanglement.mode
    };
    if (level.entanglement.betaSpawn) {
      en.bs = [
        Math.round(level.entanglement.betaSpawn.x),
        Math.round(level.entanglement.betaSpawn.y)
      ];
    }
    if (level.entanglement.portalMode) {
      en.pm = level.entanglement.portalMode;
    }
    if (level.entanglement.betaDoor) {
      en.bd = [
        Math.round(level.entanglement.betaDoor.x),
        Math.round(level.entanglement.betaDoor.y)
      ];
    }
    minified.en = en;
  }

  if (level.screenWrap) {
    minified.sw = 1;
  }

  if (level.wormholes && level.wormholes.length > 0) {
    minified.wh = level.wormholes.slice(0, 50);
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
// biome-ignore lint/suspicious/noExplicitAny: parsing untyped external JSON
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

  const applyPlatformOpts = (plat: Platform, opts: Record<string, unknown>) => {
    if (opts.k === 'wall' || opts.k === 'standard') {
      plat.kind = opts.k;
    }
    if (opts.ph === 'c' || opts.ph === 'cyan') {
      plat.phase = 'cyan';
    } else if (opts.ph === 'm' || opts.ph === 'magenta') {
      plat.phase = 'magenta';
    }
    if (typeof opts.dc === 'number' && Number.isFinite(opts.dc) && opts.dc > 0) {
      plat.decayMs = Math.round(opts.dc);
    }
    if (opts.cr === 1 || opts.cr === true) {
      plat.cracked = true;
    }
    if (typeof opts.ms === 'string' && opts.ms) {
      plat.matterState = sanitizeText(opts.ms, 20, '');
    }
  };

  const platforms: Platform[] = [];
  for (const item of rawPlatforms.slice(0, 300)) {
    if (Array.isArray(item)) {
      if (
        item.length >= 4 &&
        typeof item[0] === 'number' &&
        Number.isFinite(item[0]) &&
        typeof item[1] === 'number' &&
        Number.isFinite(item[1]) &&
        typeof item[2] === 'number' &&
        Number.isFinite(item[2]) &&
        typeof item[3] === 'number' &&
        Number.isFinite(item[3])
      ) {
        const plat: Platform = {
          x: item[0],
          y: item[1],
          width: Math.max(1, item[2]),
          height: Math.max(1, item[3])
        };
        if (
          item.length >= 7 &&
          typeof item[4] === 'number' &&
          Number.isFinite(item[4]) &&
          typeof item[5] === 'number' &&
          Number.isFinite(item[5]) &&
          typeof item[6] === 'number' &&
          Number.isFinite(item[6])
        ) {
          plat.movesTo = {
            x: item[4],
            y: item[5],
            time: Math.max(100, item[6])
          };
          if (item.length >= 8 && item[7] && typeof item[7] === 'object' && !Array.isArray(item[7])) {
            applyPlatformOpts(plat, item[7] as Record<string, unknown>);
          }
        } else if (
          item.length === 5 &&
          item[4] &&
          typeof item[4] === 'object' &&
          !Array.isArray(item[4])
        ) {
          applyPlatformOpts(plat, item[4] as Record<string, unknown>);
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
        if (item.kind === 'wall' || item.kind === 'standard') {
          plat.kind = item.kind;
        }
        if (item.phase === 'cyan' || item.phase === 'magenta') {
          plat.phase = item.phase;
        }
        if (typeof item.decayMs === 'number' && item.decayMs > 0) {
          plat.decayMs = item.decayMs;
        }
        if (item.cracked === true) {
          plat.cracked = true;
        }
        if (typeof item.matterState === 'string' && item.matterState) {
          plat.matterState = sanitizeText(item.matterState, 20, '');
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

  // Unpack gates
  const rawGates = raw.gt ?? raw.gates;
  const gates: Gate[] = [];
  if (Array.isArray(rawGates)) {
    for (const item of rawGates.slice(0, 50)) {
      if (Array.isArray(item) && item.length >= 5) {
        const [gid, gx, gy, gw, gh] = item;
        if (
          typeof gid === 'string' &&
          typeof gx === 'number' &&
          typeof gy === 'number' &&
          typeof gw === 'number' &&
          typeof gh === 'number'
        ) {
          gates.push({
            id: sanitizeText(gid, 30, 'g'),
            x: gx,
            y: gy,
            width: Math.max(1, gw),
            height: Math.max(1, gh)
          });
        }
      } else if (item && typeof item === 'object') {
        if (
          typeof item.id === 'string' &&
          typeof item.x === 'number' &&
          typeof item.y === 'number' &&
          typeof item.width === 'number' &&
          typeof item.height === 'number'
        ) {
          gates.push({
            id: sanitizeText(item.id, 30, 'g'),
            x: item.x,
            y: item.y,
            width: Math.max(1, item.width),
            height: Math.max(1, item.height)
          });
        }
      }
    }
  }

  // Unpack pressurePlates
  const rawPlates = raw.pp ?? raw.pressurePlates;
  const pressurePlates: PressurePlate[] = [];
  if (Array.isArray(rawPlates)) {
    for (const item of rawPlates.slice(0, 50)) {
      if (Array.isArray(item) && item.length >= 6) {
        const [pid, px, py, pw, ph, targetGateId, reqLock] = item;
        if (
          typeof pid === 'string' &&
          typeof px === 'number' &&
          typeof py === 'number' &&
          typeof pw === 'number' &&
          typeof ph === 'number' &&
          typeof targetGateId === 'string'
        ) {
          pressurePlates.push({
            id: sanitizeText(pid, 30, 'p'),
            x: px,
            y: py,
            width: Math.max(1, pw),
            height: Math.max(1, ph),
            targetGateId: sanitizeText(targetGateId, 30, 'g'),
            ...(reqLock === 1 || reqLock === true ? { requireLock: true } : {})
          });
        }
      } else if (item && typeof item === 'object') {
        if (
          typeof item.id === 'string' &&
          typeof item.x === 'number' &&
          typeof item.y === 'number' &&
          typeof item.width === 'number' &&
          typeof item.height === 'number' &&
          typeof item.targetGateId === 'string'
        ) {
          pressurePlates.push({
            id: sanitizeText(item.id, 30, 'p'),
            x: item.x,
            y: item.y,
            width: Math.max(1, item.width),
            height: Math.max(1, item.height),
            targetGateId: sanitizeText(item.targetGateId, 30, 'g'),
            ...(item.requireLock ? { requireLock: true } : {})
          });
        }
      }
    }
  }

  // Unpack collapse
  let collapse: LevelData['collapse'];
  if (
    Array.isArray(raw.cl) &&
    raw.cl.length >= 2 &&
    typeof raw.cl[0] === 'number' &&
    typeof raw.cl[1] === 'number'
  ) {
    collapse = { speedY: raw.cl[0], delayMs: raw.cl[1] };
  } else if (
    raw.collapse &&
    typeof raw.collapse === 'object' &&
    typeof raw.collapse.speedY === 'number' &&
    typeof raw.collapse.delayMs === 'number'
  ) {
    collapse = { speedY: raw.collapse.speedY, delayMs: raw.collapse.delayMs };
  }

  // Unpack entanglement
  let entanglement: EntanglementConfig | undefined;
  const VALID_ENTANGLE_MODES: EntanglementMode[] = [
    'mirror_x',
    'inverted_gravity',
    'mirror_and_gravity'
  ];
  if (raw.en && typeof raw.en === 'object' && VALID_ENTANGLE_MODES.includes(raw.en.m)) {
    entanglement = { mode: raw.en.m };
    if (
      Array.isArray(raw.en.bs) &&
      raw.en.bs.length >= 2 &&
      typeof raw.en.bs[0] === 'number' &&
      typeof raw.en.bs[1] === 'number'
    ) {
      entanglement.betaSpawn = { x: raw.en.bs[0], y: raw.en.bs[1] };
    }
    if (raw.en.pm === 'single' || raw.en.pm === 'dual') {
      entanglement.portalMode = raw.en.pm;
    }
    if (
      Array.isArray(raw.en.bd) &&
      raw.en.bd.length >= 2 &&
      typeof raw.en.bd[0] === 'number' &&
      typeof raw.en.bd[1] === 'number'
    ) {
      entanglement.betaDoor = { x: raw.en.bd[0], y: raw.en.bd[1] };
    }
  } else if (
    raw.entanglement &&
    typeof raw.entanglement === 'object' &&
    VALID_ENTANGLE_MODES.includes(raw.entanglement.mode)
  ) {
    entanglement = { mode: raw.entanglement.mode };
    if (
      raw.entanglement.betaSpawn &&
      typeof raw.entanglement.betaSpawn.x === 'number' &&
      typeof raw.entanglement.betaSpawn.y === 'number'
    ) {
      entanglement.betaSpawn = {
        x: raw.entanglement.betaSpawn.x,
        y: raw.entanglement.betaSpawn.y
      };
    }
    if (raw.entanglement.portalMode === 'single' || raw.entanglement.portalMode === 'dual') {
      entanglement.portalMode = raw.entanglement.portalMode;
    }
    if (
      raw.entanglement.betaDoor &&
      typeof raw.entanglement.betaDoor.x === 'number' &&
      typeof raw.entanglement.betaDoor.y === 'number'
    ) {
      entanglement.betaDoor = {
        x: raw.entanglement.betaDoor.x,
        y: raw.entanglement.betaDoor.y
      };
    }
  }

  // Unpack screenWrap & wormholes
  const screenWrap = raw.sw === 1 || raw.sw === true || raw.screenWrap === true ? true : undefined;
  const rawWormholes = raw.wh ?? raw.wormholes;
  const wormholes =
    Array.isArray(rawWormholes) && rawWormholes.length > 0
      ? (rawWormholes.slice(0, 50).filter((w) => w && typeof w === 'object') as Array<
          Record<string, unknown>
        >)
      : undefined;

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
    ...(gates.length > 0 ? { gates } : {}),
    ...(pressurePlates.length > 0 ? { pressurePlates } : {}),
    ...(collapse ? { collapse } : {}),
    ...(entanglement ? { entanglement } : {}),
    ...(screenWrap ? { screenWrap } : {}),
    ...(wormholes && wormholes.length > 0 ? { wormholes } : {}),
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
