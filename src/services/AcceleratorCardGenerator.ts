import type { Locale } from '../i18n/strings';
import {
  type AcceleratorElementInfo,
  resolveAcceleratorElement
} from '../roguelite/AcceleratorRunManager';
import { detectActiveSynergies, getMutationById } from '../roguelite/mutations';
import { REPLAY_CARD_HEIGHT, REPLAY_CARD_WIDTH, formatCardTime } from './ReplayCardGenerator';

export interface AcceleratorCardInput {
  maxZ: number;
  roomsCleared: number;
  totalTimeMs: number;
  mutations: string[];
  isNewRecord?: boolean;
  locale?: Locale;
}

function drawRoundedRect(
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

export function buildAcceleratorShareText(input: AcceleratorCardInput): string {
  const el: AcceleratorElementInfo = resolveAcceleratorElement(input.maxZ);
  const formattedTime = formatCardTime(input.totalTimeMs);
  const locale = input.locale ?? 'en';
  const mutNames = input.mutations
    .map((id) => {
      const m = getMutationById(id);
      if (!m) return id;
      return locale === 'fr' ? m.nameFr : m.nameEn;
    })
    .slice(0, 8);
  const synergies = detectActiveSynergies(input.mutations).map((s) =>
    locale === 'fr' ? s.nameFr : s.nameEn
  );

  const lines =
    locale === 'fr'
      ? [
          'QUANTUM HERO // ACCELERATEUR DE PARTICULES',
          `Z = ${el.z} (${el.symbol} - ${el.name}) | SALLES: ${input.roomsCleared} | TEMPS: ${formattedTime}`,
          mutNames.length > 0 ? `MUTATIONS: ${mutNames.join(', ')}` : 'MUTATIONS: AUCUNE',
          ...(synergies.length > 0 ? [`SYNERGIES: ${synergies.join(', ')}`] : [])
        ]
      : [
          'QUANTUM HERO // PARTICLE ACCELERATOR',
          `Z = ${el.z} (${el.symbol} - ${el.name}) | ROOMS: ${input.roomsCleared} | TIME: ${formattedTime}`,
          mutNames.length > 0 ? `MUTATIONS: ${mutNames.join(', ')}` : 'MUTATIONS: NONE',
          ...(synergies.length > 0 ? [`SYNERGIES: ${synergies.join(', ')}`] : [])
        ];

  return lines.join('\n');
}

export async function generateAcceleratorCard(input: AcceleratorCardInput): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = REPLAY_CARD_WIDTH;
  canvas.height = REPLAY_CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const el = resolveAcceleratorElement(input.maxZ);
  const locale = input.locale ?? 'en';
  const accent = el.antiHue || '#00e5ff';

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, REPLAY_CARD_WIDTH, REPLAY_CARD_HEIGHT);
  bgGrad.addColorStop(0, '#050814');
  bgGrad.addColorStop(0.55, el.hue || '#0f172a');
  bgGrad.addColorStop(1, '#090d1f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, REPLAY_CARD_WIDTH, REPLAY_CARD_HEIGHT);

  // Subtle retro grid
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= REPLAY_CARD_WIDTH; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, REPLAY_CARD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= REPLAY_CARD_HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(REPLAY_CARD_WIDTH, y);
    ctx.stroke();
  }

  // Outer neon frame
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 24, 24, REPLAY_CARD_WIDTH - 48, REPLAY_CARD_HEIGHT - 48, 16);
  ctx.stroke();

  // Header
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 26px "JetBrains Mono", monospace';
  ctx.fillText(
    locale === 'fr'
      ? 'ACCELERATEUR DE PARTICULES // RUN FUSION'
      : 'PARTICLE ACCELERATOR // ENDLESS FUSION',
    56,
    80
  );

  if (input.isNewRecord) {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, REPLAY_CARD_WIDTH - 280, 48, 224, 44, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText(locale === 'fr' ? 'NOUVEAU RECORD' : 'NEW RECORD', REPLAY_CARD_WIDTH - 255, 77);
  }

  // Element emblem box
  ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, 56, 118, 260, 240, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = 'bold 24px "JetBrains Mono", monospace';
  ctx.fillText(`Z = ${el.z}`, 82, 160);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 94px "JetBrains Mono", monospace';
  ctx.fillText(el.symbol, 82, 268);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.fillText(el.name.toUpperCase(), 82, 326);

  // Core stats
  const statsX = 356;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '24px "JetBrains Mono", monospace';
  ctx.fillText(locale === 'fr' ? 'SALLES FRANCHIES' : 'ROOMS CLEARED', statsX, 156);
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 54px "JetBrains Mono", monospace';
  ctx.fillText(String(input.roomsCleared), statsX, 214);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '24px "JetBrains Mono", monospace';
  ctx.fillText(locale === 'fr' ? 'TEMPS TOTAL' : 'TOTAL TIME', statsX + 340, 156);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 50px "JetBrains Mono", monospace';
  ctx.fillText(formatCardTime(input.totalTimeMs), statsX + 340, 214);

  // Mutations list
  ctx.fillStyle = '#94a3b8';
  ctx.font = '24px "JetBrains Mono", monospace';
  ctx.fillText(
    locale === 'fr'
      ? `MUTATIONS ACTIVES (${input.mutations.length})`
      : `ACTIVE MUTATIONS (${input.mutations.length})`,
    statsX,
    280
  );

  const uniqueMutIds = Array.from(new Set(input.mutations)).slice(0, 8);
  let chipX = statsX;
  let chipY = 298;
  for (const id of uniqueMutIds) {
    const def = getMutationById(id);
    const label = def ? `${def.icon} ${locale === 'fr' ? def.nameFr : def.nameEn}` : id;
    ctx.font = '22px "JetBrains Mono", monospace';
    const textW = ctx.measureText(label).width;
    const chipW = Math.min(360, textW + 24);
    if (chipX + chipW > REPLAY_CARD_WIDTH - 56) {
      chipX = statsX;
      chipY += 42;
    }
    ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, chipX, chipY, chipW, 34, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.fillText(label, chipX + 12, chipY + 24);
    chipX += chipW + 10;
  }

  // Synergies row
  const synergies = detectActiveSynergies(input.mutations);
  if (synergies.length > 0) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = '24px "JetBrains Mono", monospace';
    const synText = synergies
      .map((s) => `[SYN] ${locale === 'fr' ? s.nameFr : s.nameEn}`)
      .join('   ');
    ctx.fillText(synText, 56, 470);
  }

  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '22px "JetBrains Mono", monospace';
  ctx.fillText('QUANTUM HERO', 56, REPLAY_CARD_HEIGHT - 54);

  return new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } else {
      resolve(null);
    }
  });
}
