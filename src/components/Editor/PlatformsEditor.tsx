import React from 'react';
import { FieldEditor, ItemNumber, DeleteItem } from './Editor.style';

interface PlatformsEditorProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  deletePlatform: React.MouseEventHandler<HTMLDivElement>;
  i: number;
}

export const PlatformsEditor: React.FC<PlatformsEditorProps> = ({
  x,
  y,
  width,
  height,
  onChange,
  deletePlatform,
  i
}) => (
  <FieldEditor>
    <ItemNumber>{i}</ItemNumber>
    <DeleteItem data-n={i} onClick={deletePlatform}>
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
  </FieldEditor>
);

export default PlatformsEditor;
