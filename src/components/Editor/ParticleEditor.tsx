import React from 'react';
import { FieldEditor, ItemNumber, DeleteItem } from './Editor.style';

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
  <FieldEditor>
    <ItemNumber>{i}</ItemNumber>
    <DeleteItem data-n={i} onClick={deleteParticle}>
      ✕
    </DeleteItem>
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
  </FieldEditor>
);

export default ParticleEditor;
