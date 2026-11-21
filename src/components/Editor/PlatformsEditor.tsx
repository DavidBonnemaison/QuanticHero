import type React from 'react';
import type { SuperpositionConfig } from '../../types';
import styles from './Editor.module.css';

interface PlatformsEditorProps {
  x: number;
  y: number;
  width: number;
  height: number;
  superposition?: SuperpositionConfig;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onToggleSuperposition?: (index: number, enabled: boolean) => void;
  onChangeSuperposition?: React.ChangeEventHandler<HTMLInputElement>;
  deletePlatform: React.MouseEventHandler<HTMLDivElement>;
  i: number;
}

export const PlatformsEditor: React.FC<PlatformsEditorProps> = ({
  x,
  y,
  width,
  height,
  superposition,
  onChange,
  onToggleSuperposition,
  onChangeSuperposition,
  deletePlatform,
  i
}) => (
  <div className={styles.fieldEditor}>
    <div className={styles.itemNumber}>{i}</div>
    <div
      className={styles.deleteItem}
      data-n={i}
      onClick={deletePlatform}
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
      <label>width:</label>
      <input
        type="number"
        value={width}
        onChange={onChange}
        step="10"
        data-n={i}
        data-prop="width"
      />
    </div>
    <div>
      <label>height:</label>
      <input
        type="number"
        value={height}
        onChange={onChange}
        step="10"
        data-n={i}
        data-prop="height"
      />
    </div>
    {onToggleSuperposition && (
      <div>
        <label>Superposition:</label>
        <input
          type="checkbox"
          checked={Boolean(superposition)}
          onChange={(e) => onToggleSuperposition(i, e.target.checked)}
        />
      </div>
    )}
    {superposition && onChangeSuperposition && (
      <>
        <div>
          <label>altX:</label>
          <input
            type="number"
            value={superposition.altX}
            onChange={onChangeSuperposition}
            step="10"
            data-n={i}
            data-prop="altX"
          />
        </div>
        <div>
          <label>altY:</label>
          <input
            type="number"
            value={superposition.altY}
            onChange={onChangeSuperposition}
            step="10"
            data-n={i}
            data-prop="altY"
          />
        </div>
        <div>
          <label>period (ms):</label>
          <input
            type="number"
            value={superposition.periodMs}
            onChange={onChangeSuperposition}
            step="200"
            min="800"
            max="10000"
            data-n={i}
            data-prop="periodMs"
          />
        </div>
        <div>
          <label>lock (ms):</label>
          <input
            type="number"
            value={superposition.lockDurationMs ?? 3000}
            onChange={onChangeSuperposition}
            step="250"
            min="500"
            max="10000"
            data-n={i}
            data-prop="lockDurationMs"
          />
        </div>
      </>
    )}
  </div>
);

export default PlatformsEditor;
