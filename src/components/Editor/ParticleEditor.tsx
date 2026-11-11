import type React from 'react';
import styles from './Editor.module.css';

interface ParticleEditorProps {
  x: number;
  y: number;
  type?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement>;
  i: number;
  deleteParticle: React.MouseEventHandler<HTMLDivElement>;
}

export const ParticleEditor: React.FC<ParticleEditorProps> = ({
  x,
  y,
  type = 'duplicate',
  onChange,
  i,
  deleteParticle
}) => (
  <div className={styles.fieldEditor}>
    <div className={styles.itemNumber}>{i}</div>
    <div
      className={styles.deleteItem}
      data-n={i}
      onClick={deleteParticle}
      role="button"
      tabIndex={0}
    >
      ✕
    </div>
    <div>
      <label>x:</label>
      <input type="number" value={x} onChange={onChange} step="10" data-n={i} data-prop="x" />
    </div>
    <div>
      <label>y:</label>
      <input type="number" value={y} onChange={onChange} step="10" data-n={i} data-prop="y" />
    </div>
    <div>
      <label>type:</label>
      <select onChange={onChange} data-n={i} data-prop="type" value={type}>
        <option value="duplicate">duplicate</option>
        <option value="lowGravity">lowGravity</option>
        <option value="speed">speed</option>
        <option value="antiGravity">antiGravity</option>
      </select>
    </div>
  </div>
);

export default ParticleEditor;
