import type React from 'react';
import { PARTICLE_VISUAL_SPECS } from '../../scenes/ProceduralTextures';
import type { ParticleType } from '../../types';

interface DrawParticleProps {
  x: number;
  y: number;
  i: number;
  scale: number;
  type: ParticleType | string;
}

function renderGlyphSvg(type: string): React.ReactElement {
  switch (type) {
    case 'duplicate':
      return (
        <>
          <circle cx="9.5" cy="12" r="4.5" fill="none" stroke="#ffffff" strokeWidth="1.8" />
          <circle cx="14.5" cy="12" r="4.5" fill="none" stroke="#e0f2fe" strokeWidth="1.8" />
        </>
      );
    case 'speed':
      return (
        <path
          d="M6.5 7.5 L11 12 L6.5 16.5 M12 7.5 L16.5 12 L12 16.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'lowGravity':
      return (
        <>
          <path
            d="M12 16.5 V7.5 M8 11 L12 7 L16 11"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 18.5 Q12 16 17 18.5"
            fill="none"
            stroke="#d1fae5"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      );
    case 'antiGravity':
      return (
        <>
          <path
            d="M12 7.5 V16.5 M8 13 L12 17 L16 13"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 5.5 Q12 8 17 5.5"
            fill="none"
            stroke="#cffafe"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      );
    case 'tunnel':
      return (
        <>
          <rect x="11" y="5" width="2" height="14" fill="#facc15" />
          <path
            d="M5 12 Q8.5 7 12 12 T19 12"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </>
      );
    case 'pauli':
      return (
        <>
          <path
            d="M8.5 16.5 V7.5 M6 10 L8.5 7.5 L11 10"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.5 7.5 V16.5 M13 14 L15.5 16.5 L18 14"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case 'timeDilation':
      return (
        <path
          d="M7.5 6.5 H16.5 M7.5 17.5 H16.5 M8.5 6.5 L15.5 17.5 M15.5 6.5 L8.5 17.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      );
    case 'condense':
      return (
        <path
          d="M4.5 12 L8.5 7.5 L12 12 L15.5 16.5 L19.5 12"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    default:
      return <circle cx="12" cy="12" r="4" fill="#ffffff" />;
  }
}

export const DrawParticle: React.FC<DrawParticleProps> = ({ x, y, scale, type, i }) => {
  const spec = PARTICLE_VISUAL_SPECS[type as ParticleType];
  const borderColor = spec?.colorHex || '#94a3b8';
  const sizePx = Math.max(18, 24 * scale);

  return (
    <div
      data-particle-type={type}
      title={`${type} (#${i})`}
      style={{
        position: 'absolute',
        left: `${x * scale}px`,
        top: `${y * scale}px`,
        height: `${sizePx}px`,
        width: `${sizePx}px`,
        backgroundColor: '#070d1f',
        border: `2px solid ${borderColor}`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        boxShadow: `0 0 6px ${borderColor}66`
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        {renderGlyphSvg(type)}
      </svg>
      <span
        style={{
          position: 'absolute',
          right: '-4px',
          bottom: '-6px',
          fontSize: `${Math.max(9, 10 * scale)}px`,
          lineHeight: 1,
          padding: '1px 3px',
          borderRadius: '4px',
          backgroundColor: borderColor,
          color: spec?.darkText ? '#050814' : '#ffffff',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700
        }}
      >
        {i}
      </span>
    </div>
  );
};

export default DrawParticle;
