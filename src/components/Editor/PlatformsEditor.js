import React from 'react';
import PropTypes from 'prop-types';
import { FieldEditor } from './Editor.style';

const PlatformsEditor = ({ x, y, width, height, onChange, i }) => (
  <FieldEditor>
    <div>
      <label>x:</label>
      <input type="number" defaultValue={x} onBlur={onChange} step="10" data-n={i} data-prop="x" />
    </div>
    <div>
      <label>y:</label>
      <input type="number" defaultValue={y} onBlur={onChange} step="10" data-n={i} data-prop="y" />
    </div>
    <div>
      <label>width:</label>
      <input
        type="number"
        defaultValue={width}
        onBlur={onChange}
        step="10"
        data-n={i}
        data-prop="width"
      />
    </div>
    <div>
      <label>height:</label>
      <input
        type="number"
        defaultValue={height}
        onBlur={onChange}
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
  i: PropTypes.number.isRequired
};

export default PlatformsEditor;
