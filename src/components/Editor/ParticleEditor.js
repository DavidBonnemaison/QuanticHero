import React from 'react';
import PropTypes from 'prop-types';
import { FieldEditor, ItemNumber, DeleteItem } from './Editor.style';

const ParticlesEditor = ({ x, y, type, onChange, i, deleteParticle }) => (
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
  i: PropTypes.number.isRequired,
  deleteParticle: PropTypes.func.isRequired
};

export default ParticlesEditor;
