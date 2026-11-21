import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compressTrajectory } from '../tools/GhostRecorder';
import type { LevelData } from '../types';
import {
  REPLAY_CARD_HEIGHT,
  REPLAY_CARD_WIDTH,
  formatCardTime,
  generateReplayCardBlob,
  generateReplayCardFile,
  renderReplayCardCanvas,
  shareReplayCard
} from './ReplayCardGenerator';

const sampleLevel: LevelData = {
  id: '6',
  symbol: 'C',
  atom: 'Carbon',
  width: 1200,
  height: 800,
  hue: '#0f172a',
  antiHue: '#00e5ff',
  player: { position: { x: 80, y: 700 } },
  door: { x: 1080, y: 220 },
  platforms: [
    { x: 0, y: 740, width: 420, height: 32 },
    { x: 460, y: 540, width: 280, height: 28, phase: 'cyan' },
    { x: 820, y: 280, width: 320, height: 28, phase: 'magenta' }
  ],
  particles: [],
  spikes: []
};

const sampleGhost = compressTrajectory([
  { timeMs: 0, x: 80, y: 700, flipX: false, animState: 'idle' },
  { timeMs: 1800, x: 380, y: 560, flipX: false, animState: 'jump' },
  { timeMs: 4200, x: 640, y: 460, flipX: false, animState: 'right' },
  { timeMs: 7420, x: 1080, y: 220, flipX: false, animState: 'right' }
]);

interface MockCanvasContext {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  font: string;
  textAlign: string;
  textBaseline: string;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  closePath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  quadraticCurveTo: ReturnType<typeof vi.fn>;
  arc: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  strokeRect: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
  createLinearGradient: ReturnType<typeof vi.fn>;
  createRadialGradient: ReturnType<typeof vi.fn>;
}

function createMock2dContext(): MockCanvasContext {
  const gradient = { addColorStop: vi.fn() };
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient)
  };
}

describe('ReplayCardGenerator', () => {
  let mockCtx: MockCanvasContext;
  let origGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let origToBlob: typeof HTMLCanvasElement.prototype.toBlob;
  let origToDataURL: typeof HTMLCanvasElement.prototype.toDataURL;

  beforeEach(() => {
    mockCtx = createMock2dContext();
    origGetContext = HTMLCanvasElement.prototype.getContext;
    origToBlob = HTMLCanvasElement.prototype.toBlob;
    origToDataURL = HTMLCanvasElement.prototype.toDataURL;

    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => mockCtx as unknown as CanvasRenderingContext2D
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.toBlob = vi.fn((cb: BlobCallback, type?: string) => {
      cb(new Blob(['png-bytes'], { type: type ?? 'image/png' }));
    });

    HTMLCanvasElement.prototype.toDataURL = vi.fn(
      () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'
    );
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
    HTMLCanvasElement.prototype.toBlob = origToBlob;
    HTMLCanvasElement.prototype.toDataURL = origToDataURL;
    vi.restoreAllMocks();
  });

  it('formats card times as MM:SS.CC', () => {
    expect(formatCardTime(7420)).toBe('00:07.42');
    expect(formatCardTime(65120)).toBe('01:05.12');
    expect(formatCardTime(0)).toBe('00:00.00');
    expect(formatCardTime(-50)).toBe('00:00.00');
  });

  it('renders an exact 1200x630 canvas with Bohr rings, metrics, minimap, ghost curve, and QR code', async () => {
    const start = performance.now();
    const canvas = await renderReplayCardCanvas({
      level: sampleLevel,
      timeMs: 7420,
      jumps: 6,
      medal: 'gold',
      coherenceTier: 'HYPER',
      ghostTrajectory: sampleGhost,
      badge: 'DAILY ISOTOPE',
      shareUrl: 'https://quantumhero.app/#duel=test123',
      locale: 'en'
    });
    const elapsedMs = performance.now() - start;

    expect(canvas.width).toBe(REPLAY_CARD_WIDTH);
    expect(canvas.height).toBe(REPLAY_CARD_HEIGHT);
    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(630);
    expect(elapsedMs).toBeLessThan(100);

    // Core Canvas draw calls
    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalled();
    // Ghost curve plotted with moveTo/lineTo across 4 frames (2 passes: glow + core)
    expect(mockCtx.moveTo).toHaveBeenCalled();
    expect(mockCtx.lineTo).toHaveBeenCalled();

    const drawnTexts = mockCtx.fillText.mock.calls.map((c) => String(c[0]));
    expect(drawnTexts.some((txt) => txt.includes('DAILY ISOTOPE'))).toBe(true);
    expect(drawnTexts.some((txt) => txt === 'Z=6')).toBe(true);
    expect(drawnTexts.some((txt) => txt === 'C')).toBe(true);
    expect(drawnTexts.some((txt) => txt === 'CARBON')).toBe(true);
    expect(drawnTexts.some((txt) => txt === '00:07.42')).toBe(true);
    expect(drawnTexts.some((txt) => txt === '6J')).toBe(true);
    expect(drawnTexts.some((txt) => txt.includes('HYPER'))).toBe(true);
    expect(drawnTexts.some((txt) => txt === 'QUANTIC HERO')).toBe(true);
  });

  it('renders DUEL VICTORY badge cleanly', async () => {
    await renderReplayCardCanvas({
      level: sampleLevel,
      timeMs: 6890,
      jumps: 4,
      medal: 'silver',
      badge: 'DUEL VICTORY',
      ghostTrajectory: sampleGhost
    });

    const drawnTexts = mockCtx.fillText.mock.calls.map((c) => String(c[0]));
    expect(drawnTexts.some((txt) => txt.includes('DUEL VICTORY'))).toBe(true);
    expect(drawnTexts.some((txt) => txt === '00:06.89')).toBe(true);
    expect(drawnTexts.some((txt) => txt === '4J')).toBe(true);
  });

  it('resolves atomic number Z=113 from SPECTROSCOPY_DATABASE for Daily Isotope levels and falls back to CUSTOM', async () => {
    const dailyNhLevel: LevelData = {
      ...sampleLevel,
      id: 'daily:2026-11-21',
      symbol: 'Nh',
      atom: 'Nihonium'
    };

    await renderReplayCardCanvas({
      level: dailyNhLevel,
      timeMs: 8420,
      jumps: 5,
      medal: 'gold',
      badge: 'DAILY ISOTOPE'
    });

    const dailyTexts = mockCtx.fillText.mock.calls.map((c) => String(c[0]));
    expect(dailyTexts).toContain('Z=113');
    expect(dailyTexts).not.toContain('DAILY:20');

    mockCtx.fillText.mockClear();
    const customLevel: LevelData = {
      ...sampleLevel,
      id: 'custom-99',
      symbol: 'Qx',
      atom: 'Quarkonium'
    };

    await renderReplayCardCanvas({
      level: customLevel,
      timeMs: 9100,
      jumps: 4,
      medal: 'silver'
    });

    const customTexts = mockCtx.fillText.mock.calls.map((c) => String(c[0]));
    expect(customTexts).toContain('CUSTOM');
  });

  it('handles empty, undefined, or corrupt ghostTrajectory without throwing', async () => {
    const emptyCanvas = await renderReplayCardCanvas({
      level: sampleLevel,
      timeMs: 9100,
      jumps: 5,
      medal: 'bronze',
      ghostTrajectory: ''
    });
    expect(emptyCanvas.width).toBe(1200);
    expect(emptyCanvas.height).toBe(630);
    const lineToCountWithoutGhost = mockCtx.lineTo.mock.calls.length;

    mockCtx.lineTo.mockClear();
    const undefinedCanvas = await renderReplayCardCanvas({
      level: sampleLevel,
      timeMs: 9100,
      jumps: 5,
      medal: 'bronze',
      ghostTrajectory: undefined
    });
    expect(undefinedCanvas.width).toBe(1200);
    expect(mockCtx.lineTo.mock.calls.length).toBe(lineToCountWithoutGhost);

    mockCtx.lineTo.mockClear();
    await renderReplayCardCanvas({
      level: sampleLevel,
      timeMs: 9100,
      jumps: 5,
      medal: 'bronze',
      ghostTrajectory: 'corrupt-garbage-payload'
    });
    expect(mockCtx.lineTo.mock.calls.length).toBe(lineToCountWithoutGhost);

    // With a 4-frame ghost, 2 passes * 3 segments = 6 additional lineTo calls
    mockCtx.lineTo.mockClear();
    await renderReplayCardCanvas({
      level: sampleLevel,
      timeMs: 9100,
      jumps: 5,
      medal: 'bronze',
      ghostTrajectory: sampleGhost
    });
    expect(mockCtx.lineTo.mock.calls.length).toBe(lineToCountWithoutGhost + 6);
  });

  it('generates PNG Blob and PNG File within 100 ms', async () => {
    const start = performance.now();
    const blob = await generateReplayCardBlob({
      level: sampleLevel,
      timeMs: 7420,
      jumps: 6,
      medal: 'gold',
      ghostTrajectory: sampleGhost
    });
    const file = await generateReplayCardFile({
      level: sampleLevel,
      timeMs: 7420,
      jumps: 6,
      medal: 'gold',
      ghostTrajectory: sampleGhost
    });
    const elapsedMs = performance.now() - start;

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/png');
    expect(file.name).toBe('quantic-hero-c-6.png');
    expect(elapsedMs).toBeLessThan(100);
  });

  it('uses Web Share API with files when navigator.share and navigator.canShare support it', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const canShareMock = vi.fn().mockReturnValue(true);

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareMock
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: canShareMock
    });

    const shareUrl = 'https://quantumhero.app/#duel=abc';
    const result = await shareReplayCard(
      {
        level: sampleLevel,
        timeMs: 7420,
        jumps: 6,
        medal: 'gold',
        ghostTrajectory: sampleGhost
      },
      { shareUrl }
    );

    expect(result).toBe('shared');
    expect(canShareMock).toHaveBeenCalledTimes(1);
    expect(shareMock).toHaveBeenCalledTimes(1);
    const shareArg = shareMock.mock.calls[0][0];
    expect(shareArg.files).toHaveLength(1);
    expect(shareArg.files[0]).toBeInstanceOf(File);
    expect(shareArg.files[0].type).toBe('image/png');
    expect(shareArg.url).toBe(shareUrl);
  });

  it('falls back to PNG download and clipboard link copy on desktop when Web Share is unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: undefined
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock }
    });

    const createObjectURLMock = vi.fn(() => 'blob:mock-card-url');
    const revokeObjectURLMock = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock
    });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const shareUrl = 'https://quantumhero.app/#duel=desktop42';
    const result = await shareReplayCard(
      {
        level: sampleLevel,
        timeMs: 7420,
        jumps: 6,
        medal: 'gold',
        ghostTrajectory: sampleGhost
      },
      { shareUrl }
    );

    expect(result).toBe('downloaded');
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-card-url');
    expect(writeTextMock).toHaveBeenCalledWith(shareUrl);

    vi.unstubAllGlobals();
  });
});
