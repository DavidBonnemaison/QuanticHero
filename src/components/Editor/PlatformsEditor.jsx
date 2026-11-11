import React from 'react';
import PropTypes from 'prop-types';
import { FieldEditor, ItemNumber, DeleteItem } from './Editor.style';

const PlatformsEditor = ({ x, y, width, height, onChange, deletePlatform, i }) => (
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

PlatformsEditor.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  deletePlatform: PropTypes.func.isRequired,
  i: PropTypes.number.isRequired
};

export default PlatformsEditor;
