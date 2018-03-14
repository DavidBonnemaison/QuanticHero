import React from 'react';
import PropTypes from 'prop-types';
import { range, min } from 'lodash';
import * as levels from './../data/levels';
import { Container, EditPanel, FieldEditor, DisplayPanel } from './Editor.style';
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

const DrawPlatform = ({ x, y, width, height, scale, color }) => (
  <div
    style={{
      position: 'absolute',
      left: `${x * scale}px`,
      top: `${y * scale}px`,
      height: `${height * scale}px`,
      width: `${width * scale}px`,
      backgroundColor: color
    }}
  />
);

const DrawParticle = ({ x, y, scale, type }) => (
  <div
    style={{
      position: 'absolute',
      left: `${x * scale}px`,
      top: `${y * scale}px`,
      height: `${20 * scale}px`,
      width: `${20 * scale}px`,
      backgroundColor: 'red',
      borderRadius: '50%'
    }}
  />
);

class Editor extends React.Component {
  state = {
    level: 1
  };

  onChange({ target }, type) {
    const { value, dataset } = target;
    const { n, prop } = dataset;
    this.props.update({ level: this.state.level, type, n, prop, value });
  }

  componentDidMount() {
    this.props.setLevels(levels);
  }

  render() {
    if (!this.props.levels) {
      return null;
    }
    const level = this.props.levels[`level${this.state.level}`];
    const { platforms, particles, hue, antiHue, width, height } = level;
    const scale = min([(window.innerWidth - 220) / width, window.innerHeight / height]);
    const levelsRange = range(1, 11);
    const changeLevel = e => this.setState({ level: Number(e.target.value) });
    return (
      <Container>
        <EditPanel>
          Level{' '}
          <select value={this.state.level} onChange={changeLevel}>
            {levelsRange.map(l => (
              <option key={`level${l}`} value={l}>
                {l}
              </option>
            ))}
          </select>
          <h3>Platforms</h3>
          {platforms.map((p, i) => (
            <PlatformsEditor
              {...p}
              key={`platform${p.x}${p.y}`}
              onChange={e => this.onChange(e, 'platform')}
              i={i}
            />
          ))}
          <hr />
          <h3>Particles</h3>
          {particles.map((p, i) => (
            <ParticlesEditor
              {...p}
              key={`particles${p.x}${p.y}`}
              onChange={e => this.onChange(e, 'particle')}
              i={i}
            />
          ))}
        </EditPanel>
        <DisplayPanel hue={hue}>
          {platforms.map(p => (
            <DrawPlatform
              key={`platformDrawing${p.x}${p.y}`}
              {...p}
              color={antiHue}
              scale={scale}
            />
          ))}
          {particles.map(p => (
            <DrawParticle key={`particleDrawing${p.x}${p.y}`} {...p} scale={scale} />
          ))}
        </DisplayPanel>
      </Container>
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
