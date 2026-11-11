import type React from 'react';
import type { ParticleType } from '../../types';

interface DrawParticleProps {
  x: number;
  y: number;
  i: number;
  scale: number;
  type: ParticleType | string;
}

const colors: Record<string, string> = {
  duplicate: 'blue',
  speed: 'red',
  lowGravity: 'green',
  antiGravity: 'cyan'
};

export const DrawParticle: React.FC<DrawParticleProps> = ({ x, y, scale, type, i }) => (
  <div
    style={{
      position: 'absolute',
      left: `${x * scale}px`,
      top: `${y * scale}px`,
      height: `${20 * scale}px`,
      width: `${20 * scale}px`,
      backgroundColor: colors[type] || 'gray',
      borderRadius: '50%',
      textAlign: 'center',
      fontSize: `${20 * scale}px`,
      color: type === 'antiGravity' ? 'black' : 'white'
    }}
  >
    <span>{i}</span>
  </div>
);

export default DrawParticle;
