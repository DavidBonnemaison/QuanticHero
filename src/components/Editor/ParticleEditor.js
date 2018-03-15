import React from 'react';
import PropTypes from 'prop-types';
import { FieldEditor } from './Editor.style';

const ParticlesEditor = ({ x, y, type, onChange, i }) => (
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
      <label>type:</label>
      <select onBlur={onChange} data-n={i} data-prop="type">
        <option>duplicate</option>
        <option>lowGravity</option>
        <option>speed</option>
        <option>antiGravity</option>
      </select>
    </div>
  </FieldEditor>
);

ParticlesEditor.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  type: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  i: PropTypes.number.isRequired
};

export default ParticlesEditor;
