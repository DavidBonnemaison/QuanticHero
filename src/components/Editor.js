import React from 'react';
import PropTypes from 'prop-types';
import * as levels from './../data/levels';
import { EditPanel, FieldEditor } from './Editor.style';
import { connect } from 'react-redux';
import * as actions from './../actions/levels';

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
        value={height}
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

class Editor extends React.Component {
  onChange({ target }, type) {
    const { value, dataset } = target;
    const { n, prop } = dataset;
    this.props.update({ level: 1, type, n, prop, value });
  }

  componentDidMount() {
    this.props.setLevels(levels);
  }
  render() {
    if (!this.props.levels) {
      return null;
    }
    const level = this.props.levels[`level${1}`];
    const { platforms } = level;
    return (
      <div>
        <EditPanel>
          <h3>Platforms</h3>
          {platforms.map((p, i) => (
            <PlatformsEditor
              {...p}
              key={`platform${p.x}${p.y}`}
              onChange={e => this.onChange(e, 'platform')}
              i={i}
            />
          ))}
          <h3>Particles</h3>
        </EditPanel>
      </div>
    );
  }
}

const mapStateToProps = ({ levels }) => ({ levels });
const mapDispatchToProps = dispatch => ({
  update: ({ level, type, n, prop, value }) =>
    dispatch(actions.update({ level, type, n, prop, value })),
  setLevels: data => dispatch(actions.setLevels(data))
});

export default connect(mapStateToProps, mapDispatchToProps)(Editor);
