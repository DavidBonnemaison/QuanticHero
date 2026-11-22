import QRCode from 'qrcode';
import { SPECTROSCOPY_DATABASE } from '../data/spectroscopy';
import { type Locale, getStrings } from '../i18n/strings';
import { type GhostFrame, decompressTrajectory } from '../tools/GhostRecorder';
import type { CoherenceTier, IsotopeMedal, LevelData } from '../types';
import { getMedalDisplayInfo } from './MedalService';

export const REPLAY_CARD_WIDTH = 1200;
export const REPLAY_CARD_HEIGHT = 630;

export interface ReplayCardInput {
  level: LevelData;
  timeMs: number;
  jumps: number;
  medal: IsotopeMedal;
  coherenceTier?: CoherenceTier;
  ghostTrajectory?: string;
  badge?: 'DAILY ISOTOPE' | 'DUEL VICTORY' | string;
  shareUrl?: string;
  locale?: Locale;
}

export interface ShareReplayCardOptions {
  shareUrl?: string;
  text?: string;
  filename?: string;
}

export type ShareReplayCardResult = 'shared' | 'downloaded';

/**
 * Formats a run duration in milliseconds as MM:SS.CC (e.g., 7420 -> "00:07.42").
 */
export function formatCardTime(timeMs: number): string {
  if (!Number.isFinite(timeMs) || timeMs < 0) {
    return '00:00.00';
  }
  const totalMs = Math.floor(timeMs);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const centiseconds = Math.floor((totalMs % 1000) / 10);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const cc = String(centiseconds).padStart(2, '0');
  return `${mm}:${ss}.${cc}`;
}

function parseHexColor(
  hex: string | undefined,
  fallback: [number, number, number]
): [number, number, number] {
  if (!hex) return fallback;
  const cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    const r = Number.parseInt(cleaned[0] + cleaned[0], 16);
    const g = Number.parseInt(cleaned[1] + cleaned[1], 16);
    const b = Number.parseInt(cleaned[2] + cleaned[2], 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return [r, g, b];
    }
  } else if (cleaned.length === 6) {
    const r = Number.parseInt(cleaned.slice(0, 2), 16);
    const g = Number.parseInt(cleaned.slice(2, 4), 16);
    const b = Number.parseInt(cleaned.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return [r, g, b];
    }
  }
  return fallback;
}

function rgba(rgb: [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getCoherenceStyle(tier: CoherenceTier): { label: string; color: string; bg: string } {
  switch (tier) {
    case 'HYPER':
      return { label: '⚡ HYPER', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.16)' };
    case 'x3':
      return { label: '⚡ x3', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.16)' };
    case 'x2':
      return { label: '⚡ x2', color: '#00ffcc', bg: 'rgba(0, 255, 204, 0.14)' };
    default:
      return { label: 'x1', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)' };
  }
}

function getBadgeStyle(badge: string): { color: string; bg: string; border: string } {
  const upper = badge.toUpperCase();
  if (upper.includes('VICTORY') || upper.includes('VICTOIRE')) {
    return {
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.16)',
      border: 'rgba(52, 211, 153, 0.85)'
    };
  }
  if (upper.includes('DAILY')) {
    return {
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.16)',
      border: 'rgba(251, 191, 36, 0.85)'
    };
  }
  return {
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.16)',
    border: 'rgba(56, 189, 248, 0.85)'
  };
}

function resolveAtomicZLabel(level: LevelData): string {
  const rawId = String(level.id || '').trim();
  const numericZ = Number(rawId);
  if (Number.isInteger(numericZ) && numericZ > 0) {
    return `Z=${numericZ}`;
  }

  const symbolClean = (level.symbol || '').trim().toLowerCase();
  if (symbolClean) {
    const bySymbol = SPECTROSCOPY_DATABASE.find((el) => el.symbol.toLowerCase() === symbolClean);
    if (bySymbol) {
      return `Z=${bySymbol.z}`;
    }
  }

  const atomClean = (level.atom || '').trim().toLowerCase();
  if (atomClean) {
    const byAtom = SPECTROSCOPY_DATABASE.find((el) => el.name.toLowerCase() === atomClean);
    if (byAtom) {
      return `Z=${byAtom.z}`;
    }
  }

  return 'CUSTOM';
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  hueRgb: [number, number, number],
  antiRgb: [number, number, number]
): void {
  // Base spectral dark gradient
  if (typeof ctx.createLinearGradient === 'function') {
    const bgGrad = ctx.createLinearGradient(0, 0, REPLAY_CARD_WIDTH, REPLAY_CARD_HEIGHT);
    bgGrad.addColorStop(0, '#050814');
    bgGrad.addColorStop(0.5, rgba(hueRgb, 0.92));
    bgGrad.addColorStop(1, '#090d1c');
    ctx.fillStyle = bgGrad;
  } else {
    ctx.fillStyle = '#070b1a';
  }
  ctx.fillRect(0, 0, REPLAY_CARD_WIDTH, REPLAY_CARD_HEIGHT);

  // Darken overlay to guarantee high contrast regardless of element hue
  ctx.fillStyle = 'rgba(5, 8, 20, 0.58)';
  ctx.fillRect(0, 0, REPLAY_CARD_WIDTH, REPLAY_CARD_HEIGHT);

  // Spectral radial glows
  if (typeof ctx.createRadialGradient === 'function') {
    const glowLeft = ctx.createRadialGradient(210, 210, 20, 210, 210, 380);
    glowLeft.addColorStop(0, rgba(antiRgb, 0.24));
    glowLeft.addColorStop(1, rgba(antiRgb, 0));
    ctx.fillStyle = glowLeft;
    ctx.fillRect(0, 0, REPLAY_CARD_WIDTH, REPLAY_CARD_HEIGHT);

    const glowRight = ctx.createRadialGradient(900, 280, 30, 900, 280, 420);
    glowRight.addColorStop(0, rgba(hueRgb, 0.3));
    glowRight.addColorStop(1, rgba(hueRgb, 0));
    ctx.fillStyle = glowRight;
    ctx.fillRect(0, 0, REPLAY_CARD_WIDTH, REPLAY_CARD_HEIGHT);
  }

  // Bohr orbital watermark rings
  const centerX = 215;
  const centerY = 250;
  const radii = [125, 195, 275, 360];
  ctx.save();
  for (let i = 0; i < radii.length; i++) {
    const r = radii[i];
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(antiRgb, 0.14 - i * 0.022);
    ctx.lineWidth = i === 0 ? 2 : 1.5;
    ctx.stroke();

    // Orbital electron dot
    const angle = -0.6 + i * 1.35;
    const ex = centerX + Math.cos(angle) * r;
    const ey = centerY + Math.sin(angle) * r;
    ctx.beginPath();
    ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = rgba(antiRgb, 0.42);
    ctx.fill();
  }
  ctx.restore();

  // Outer card border frame
  drawRoundedRectPath(ctx, 18, 18, REPLAY_CARD_WIDTH - 36, REPLAY_CARD_HEIGHT - 36, 18);
  ctx.strokeStyle = rgba(antiRgb, 0.45);
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawElementAndMetrics(
  ctx: CanvasRenderingContext2D,
  input: ReplayCardInput,
  hueRgb: [number, number, number],
  antiRgb: [number, number, number]
): void {
  const locale = input.locale ?? 'en';
  const medalInfo = getMedalDisplayInfo(input.medal, locale);
  const leftX = 56;
  let currentY = 56;

  // Optional badge pill (DAILY ISOTOPE / DUEL VICTORY / custom)
  if (input.badge && input.badge.trim().length > 0) {
    const badgeText = input.badge.trim().toUpperCase();
    const style = getBadgeStyle(badgeText);
    const pillW = Math.min(470, Math.max(190, badgeText.length * 14 + 44));
    const pillH = 38;

    drawRoundedRectPath(ctx, leftX, currentY, pillW, pillH, 8);
    ctx.fillStyle = style.bg;
    ctx.fill();
    ctx.strokeStyle = style.border;
    ctx.lineWidth = 1.75;
    ctx.stroke();

    ctx.fillStyle = style.color;
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(`★ ${badgeText}`, leftX + 16, currentY + pillH / 2 + 1);
    currentY += pillH + 20;
  }

  // Element periodic-table tile
  const tileSize = 148;
  drawRoundedRectPath(ctx, leftX, currentY, tileSize, tileSize, 14);
  ctx.fillStyle = rgba(hueRgb, 0.85);
  ctx.fill();
  ctx.strokeStyle = rgba(antiRgb, 0.9);
  ctx.lineWidth = 3;
  ctx.stroke();

  // Atomic number Z
  const zLabel = resolveAtomicZLabel(input.level);
  ctx.fillStyle = rgba(antiRgb, 0.95);
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(zLabel, leftX + 14, currentY + 12);

  // Element symbol
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 74px "JetBrains Mono", monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(input.level.symbol || '?', leftX + tileSize / 2, currentY + tileSize / 2 + 10);

  // Atom name beside the tile
  const nameX = leftX + tileSize + 24;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = rgba(antiRgb, 0.9);
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillText(
    locale === 'fr' ? 'ISOTOPE SYNTHÉTISÉ' : 'ELEMENT SYNTHESIZED',
    nameX,
    currentY + 18
  );

  ctx.fillStyle = '#f8fafc';
  const atomName = (input.level.atom || 'Unknown').toUpperCase();
  ctx.font =
    atomName.length > 12
      ? 'bold 40px "JetBrains Mono", monospace'
      : 'bold 50px "JetBrains Mono", monospace';
  ctx.fillText(atomName, nameX, currentY + 46);

  // Medal line under atom name
  if (medalInfo.medal !== 'none') {
    ctx.fillStyle = medalInfo.color;
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.fillText(`${medalInfo.symbol} ${medalInfo.label}`, nameX, currentY + 108);
  }

  currentY += tileSize + 28;

  // Key metrics row: Time + Jumps + Coherence Tier
  const metricHeight = 96;
  const timeBoxW = 228;
  const jumpsBoxW = 104;
  const gap = 12;

  // Time box
  drawRoundedRectPath(ctx, leftX, currentY, timeBoxW, metricHeight, 12);
  ctx.fillStyle = 'rgba(11, 15, 25, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(locale === 'fr' ? 'TEMPS' : 'TIME', leftX + 14, currentY + 12);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px "JetBrains Mono", monospace';
  ctx.fillText(formatCardTime(input.timeMs), leftX + 14, currentY + 38);

  // Jumps box
  const jumpsX = leftX + timeBoxW + gap;
  drawRoundedRectPath(ctx, jumpsX, currentY, jumpsBoxW, metricHeight, 12);
  ctx.fillStyle = 'rgba(11, 15, 25, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.fillText(locale === 'fr' ? 'SAUTS' : 'JUMPS', jumpsX + 12, currentY + 12);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 38px "JetBrains Mono", monospace';
  ctx.fillText(`${Math.max(0, Math.round(input.jumps))}J`, jumpsX + 12, currentY + 39);

  // Coherence Tier box (optional)
  if (input.coherenceTier) {
    const cohX = jumpsX + jumpsBoxW + gap;
    const cohW = 148;
    const cohStyle = getCoherenceStyle(input.coherenceTier);

    drawRoundedRectPath(ctx, cohX, currentY, cohW, metricHeight, 12);
    ctx.fillStyle = cohStyle.bg;
    ctx.fill();
    ctx.strokeStyle = cohStyle.color;
    ctx.lineWidth = 1.75;
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText(locale === 'fr' ? 'FLUX' : 'FLOW', cohX + 12, currentY + 12);

    ctx.fillStyle = cohStyle.color;
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.fillText(cohStyle.label, cohX + 12, currentY + 44);
  }
}

function drawMinimapAndTrajectory(
  ctx: CanvasRenderingContext2D,
  input: ReplayCardInput,
  antiRgb: [number, number, number]
): void {
  const locale = input.locale ?? 'en';
  const boxX = 584;
  const boxY = 56;
  const boxW = 560;
  const boxH = 442;

  // Panel background
  drawRoundedRectPath(ctx, boxX, boxY, boxW, boxH, 16);
  ctx.fillStyle = 'rgba(5, 8, 20, 0.8)';
  ctx.fill();
  ctx.strokeStyle = rgba(antiRgb, 0.55);
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header label
  ctx.fillStyle = rgba(antiRgb, 0.85);
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    locale === 'fr' ? 'TRAJECTOIRE QUANTIQUE' : 'QUANTUM TRAJECTORY MAP',
    boxX + 18,
    boxY + 14
  );

  // Decode ghost trajectory safely (handles empty/undefined/corrupt strings)
  const frames: GhostFrame[] = input.ghostTrajectory
    ? decompressTrajectory(input.ghostTrajectory)
    : [];

  // Compute world bounds
  const level = input.level;
  let minX = 0;
  let minY = 0;
  let maxX = level.width > 0 ? level.width : 800;
  let maxY = level.height > 0 ? level.height : 600;

  for (const p of level.platforms ?? []) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.width);
    maxY = Math.max(maxY, p.y + p.height);
  }
  if (level.player?.position) {
    minX = Math.min(minX, level.player.position.x);
    minY = Math.min(minY, level.player.position.y);
    maxX = Math.max(maxX, level.player.position.x);
    maxY = Math.max(maxY, level.player.position.y);
  }
  if (level.door) {
    minX = Math.min(minX, level.door.x);
    minY = Math.min(minY, level.door.y);
    maxX = Math.max(maxX, level.door.x);
    maxY = Math.max(maxY, level.door.y);
  }
  for (const f of frames) {
    minX = Math.min(minX, f.x);
    minY = Math.min(minY, f.y);
    maxX = Math.max(maxX, f.x);
    maxY = Math.max(maxY, f.y);
  }

  const worldW = Math.max(1, maxX - minX);
  const worldH = Math.max(1, maxY - minY);

  const innerPadX = 24;
  const innerPadTop = 44;
  const innerPadBottom = 24;
  const availW = boxW - innerPadX * 2;
  const availH = boxH - innerPadTop - innerPadBottom;
  const scale = Math.min(availW / worldW, availH / worldH);
  const offsetX = boxX + innerPadX + (availW - worldW * scale) / 2;
  const offsetY = boxY + innerPadTop + (availH - worldH * scale) / 2;

  const mapX = (wx: number) => offsetX + (wx - minX) * scale;
  const mapY = (wy: number) => offsetY + (wy - minY) * scale;

  // Draw platforms in wireframe/watermark
  for (const plat of level.platforms ?? []) {
    const px = mapX(plat.x);
    const py = mapY(plat.y);
    const pw = Math.max(2, plat.width * scale);
    const ph = Math.max(2, plat.height * scale);

    if (plat.phase === 'cyan') {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.22)';
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.65)';
    } else if (plat.phase === 'magenta') {
      ctx.fillStyle = 'rgba(236, 72, 153, 0.22)';
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.65)';
    } else {
      ctx.fillStyle = rgba(antiRgb, 0.18);
      ctx.strokeStyle = rgba(antiRgb, 0.5);
    }
    ctx.fillRect(px, py, pw, ph);
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);
  }

  // Draw luminous ghost trajectory curve if available
  if (frames.length >= 2) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer glow stroke
    ctx.beginPath();
    ctx.moveTo(mapX(frames[0].x), mapY(frames[0].y));
    for (let i = 1; i < frames.length; i++) {
      ctx.lineTo(mapX(frames[i].x), mapY(frames[i].y));
    }
    ctx.strokeStyle = rgba(antiRgb, 0.28);
    ctx.lineWidth = 8;
    ctx.stroke();

    // Inner bright core stroke
    ctx.beginPath();
    ctx.moveTo(mapX(frames[0].x), mapY(frames[0].y));
    for (let i = 1; i < frames.length; i++) {
      ctx.lineTo(mapX(frames[i].x), mapY(frames[i].y));
    }
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2.8;
    ctx.stroke();
    ctx.restore();
  } else if (frames.length === 1) {
    ctx.beginPath();
    ctx.arc(mapX(frames[0].x), mapY(frames[0].y), 5, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffcc';
    ctx.fill();
  }

  // Draw spawn marker
  if (level.player?.position) {
    const sx = mapX(level.player.position.x);
    const sy = mapY(level.player.position.y);
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(52, 211, 153, 0.28)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#34d399';
    ctx.fill();
  }

  // Draw portal/door marker
  if (level.door) {
    const dx = mapX(level.door.x);
    const dy = mapY(level.door.y);
    ctx.beginPath();
    ctx.arc(dx, dy, 11, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(dx, dy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
  }
}

function drawQrCodeMiniature(
  ctx: CanvasRenderingContext2D,
  shareUrl: string,
  x: number,
  y: number,
  size: number
): void {
  // Keep miniature QR scannable & fast
  if (!shareUrl || shareUrl.length > 1800) return;

  try {
    const qr = QRCode.create(shareUrl, { errorCorrectionLevel: 'L' });
    const count = qr.modules.size;
    if (count <= 0) return;

    const pad = 4;
    const inner = size - pad * 2;
    const cell = inner / count;

    // White quiet-zone background
    drawRoundedRectPath(ctx, x, y, size, size, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.fillStyle = '#050814';
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.modules.get(row, col)) {
          ctx.fillRect(
            x + pad + col * cell,
            y + pad + row * cell,
            Math.ceil(cell),
            Math.ceil(cell)
          );
        }
      }
    }
  } catch {
    // Gracefully skip QR code if URL exceeds QR capacity or fails encoding
  }
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  input: ReplayCardInput,
  antiRgb: [number, number, number]
): void {
  const dividerY = 524;
  ctx.beginPath();
  ctx.moveTo(56, dividerY);
  ctx.lineTo(REPLAY_CARD_WIDTH - 56, dividerY);
  ctx.strokeStyle = rgba(antiRgb, 0.3);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Branding
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px "Silkscreen", "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('QUANTUM HERO', 56, 562);
  const measuredBrandWidth =
    typeof ctx.measureText === 'function' ? ctx.measureText('QUANTUM HERO').width : 260;
  const subtitleX = Math.max(260, Math.ceil(56 + measuredBrandWidth + 24));

  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px "JetBrains Mono", monospace';
  ctx.fillText('ISOTOPE RECORD CARD', subtitleX, 564);

  // Optional miniature QR code
  if (input.shareUrl) {
    const qrSize = 72;
    drawQrCodeMiniature(
      ctx,
      input.shareUrl,
      REPLAY_CARD_WIDTH - 56 - qrSize,
      dividerY + 12,
      qrSize
    );
  }
}

/**
 * Renders a 1200×630 Replay Record Card onto an offscreen HTMLCanvasElement.
 */
export async function renderReplayCardCanvas(input: ReplayCardInput): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = REPLAY_CARD_WIDTH;
  canvas.height = REPLAY_CARD_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to acquire 2D canvas context for replay card');
  }

  const hueRgb = parseHexColor(input.level.hue, [7, 7, 55]);
  const antiRgb = parseHexColor(input.level.antiHue, [0, 229, 255]);

  drawBackground(ctx, hueRgb, antiRgb);
  drawElementAndMetrics(ctx, input, hueRgb, antiRgb);
  drawMinimapAndTrajectory(ctx, input, antiRgb);
  drawFooter(ctx, input, antiRgb);

  return canvas;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = /data:([^;]+);/.exec(parts[0] ?? '');
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const base64 = parts[1] ?? '';
  const binary = typeof atob === 'function' ? atob(base64) : '';
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Generates a PNG Blob for the 1200×630 Replay Card.
 */
export async function generateReplayCardBlob(input: ReplayCardInput): Promise<Blob> {
  const canvas = await renderReplayCardCanvas(input);

  if (typeof canvas.toBlob === 'function') {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/png');
    });
    if (blob) {
      return blob;
    }
  }

  if (typeof canvas.toDataURL === 'function') {
    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl) {
      return dataUrlToBlob(dataUrl);
    }
  }

  return new Blob([], { type: 'image/png' });
}

function buildDefaultFilename(level: LevelData): string {
  const safeSymbol = (level.symbol || 'atom').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const safeId = String(level.id || '0')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-');
  return `quantum-hero-${safeSymbol}-${safeId}.png`;
}

/**
 * Generates a PNG File ready for Web Share API or download.
 */
export async function generateReplayCardFile(
  input: ReplayCardInput,
  filename?: string
): Promise<File> {
  const blob = await generateReplayCardBlob(input);
  const resolvedName = filename?.trim() || buildDefaultFilename(input.level);
  return new File([blob], resolvedName, { type: 'image/png' });
}

/**
 * Shares the 1200×630 Replay Card via Web Share API (with files) when supported,
 * or falls back cleanly to downloading the PNG and copying the share URL to clipboard.
 */
export async function shareReplayCard(
  input: ReplayCardInput,
  options: ShareReplayCardOptions = {}
): Promise<ShareReplayCardResult> {
  const resolvedShareUrl = options.shareUrl ?? input.shareUrl;
  const effectiveInput: ReplayCardInput = {
    ...input,
    shareUrl: resolvedShareUrl
  };

  const cardFile = await generateReplayCardFile(effectiveInput, options.filename);
  const locale = input.locale ?? 'en';
  const t = getStrings(locale);
  const shareText =
    options.text ??
    `QUANTUM HERO — ${input.level.symbol} ${input.level.atom} • ${formatCardTime(input.timeMs)} • ${Math.max(0, Math.round(input.jumps))}J (${getMedalDisplayInfo(input.medal, locale).shortLabel})`;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const canShareFiles =
      typeof navigator.canShare === 'function' ? navigator.canShare({ files: [cardFile] }) : true;

    if (canShareFiles) {
      try {
        await navigator.share({
          files: [cardFile],
          title: `${t.menu.title} — ${input.level.symbol} ${input.level.atom}`,
          text: shareText,
          ...(resolvedShareUrl ? { url: resolvedShareUrl } : {})
        });
        return 'shared';
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return 'shared';
        }
        // Otherwise fall back cleanly to desktop download
      }
    }
  }

  // Desktop fallback: trigger PNG download + copy link to clipboard
  if (
    typeof document !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  ) {
    const objectUrl = URL.createObjectURL(cardFile);
    try {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = cardFile.name;
      link.rel = 'noopener';
      document.body?.appendChild(link);
      link.click();
      document.body?.removeChild(link);
    } finally {
      if (typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }

  if (resolvedShareUrl && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(resolvedShareUrl);
    } catch {
      // Clipboard write is best-effort on desktop fallback
    }
  }

  return 'downloaded';
}
