import React from 'react';
import PropTypes from 'prop-types';
import { range, max } from 'lodash';
import { push } from 'react-router-redux';
import * as levels from './../../data/levels';
import {
  Container,
  EditPanel,
  DisplayPanel,
  FieldEditor,
  PlayButton,
  ResetButton,
  AddButton
} from './Editor.style';
import { connect } from 'react-redux';
import * as actions from './../../actions/levels';
import { updateCurrentLevel } from './../../actions/game';
import PlatformsEditor from './PlatformsEditor';
import ParticlesEditor from './ParticleEditor';
import DrawPlatform from './DrawPlatform';
import DrawParticle from './DrawParticle';

class Editor extends React.Component {
  static propTypes = {
    game: PropTypes.object.isRequired,
    levels: PropTypes.object.isRequired,
    update: PropTypes.func.isRequired,
    addPlatform: PropTypes.func.isRequired,
    deletePlatform: PropTypes.func.isRequired,
    addParticle: PropTypes.func.isRequired,
    deleteParticle: PropTypes.func.isRequired,
    setLevels: PropTypes.func.isRequired,
    play: PropTypes.func.isRequired,
    updateCurrentGameLevel: PropTypes.func.isRequired
  };

  state = {
    level: 1
  };

  onChange({ target }, type) {
    const { value, dataset } = target;
    const { n, prop } = dataset;
    this.props.update({ level: this.state.level, type, n, prop, value });
    target.focus();
  }

  componentDidMount() {
    const { game: { currentLevel }, setLevels, levels } = this.props;
    if (!levels) {
      setLevels(levels);
    }
    if (currentLevel) {
      this.setState({ level: currentLevel });
    }
  }

  changeLevel = e => {
    this.props.updateCurrentGameLevel(Number(e.target.value));
    this.setState({ level: Number(e.target.value) });
  };

  resetLevels = () => {
    this.props.setLevels(levels);
  };

  getScale = ({ width, height }) =>
    max([(window.innerWidth - 220) / width, window.innerHeight / height]);

  deletePlatform = ({ target }) =>
    this.props.deletePlatform({
      level: this.state.level,
      n: target.dataset.n
    });

  deleteParticle = ({ target }) =>
    this.props.deleteParticle({
      level: this.state.level,
      n: target.dataset.n
    });

  render() {
    if (!this.props.levels) {
      return null;
    }
    const { play, levels, addPlatform, addParticle } = this.props;
    const level = levels[`level${this.state.level}`];
    const { platforms, particles, hue, antiHue, width, height, player, door } = level;
    const scale = this.getScale({ width, height });
    const levelsRange = range(1, 11);

    return (
      <Container>
        <EditPanel>
          Level{' '}
          <select value={this.state.level} onChange={this.changeLevel}>
            {levelsRange.map(l => (
              <option key={`level${l}`} value={l}>
                {l} - {levels[`level${l}`].atom}
              </option>
            ))}
          </select>
          <FieldEditor>
            <div>
              <label>width:</label>
              <input
                type="number"
                value={width}
                onChange={e => this.onChange(e, 'width')}
                step="10"
                data-n={0}
                data-prop="width"
              />
            </div>
            <div>
              <label>height:</label>
              <input
                type="number"
                value={height}
                onChange={e => this.onChange(e, 'height')}
                step="10"
                data-n={0}
                data-prop="height"
              />
            </div>
          </FieldEditor>
          <h3>
            Platforms
            <AddButton onClick={() => addPlatform({ level: this.state.level })}>+</AddButton>
          </h3>
          {platforms.map((p, i) => (
            <PlatformsEditor
              {...p}
              key={`platform${i}`}
              onChange={e => this.onChange(e, 'platform')}
              deletePlatform={this.deletePlatform}
              i={i}
            />
          ))}
          <hr />
          <h3>
            Particles
            <AddButton onClick={() => addParticle({ level: this.state.level })}>+</AddButton>
          </h3>
          {particles.map((p, i) => (
            <ParticlesEditor
              {...p}
              key={`particles${i}`}
              onChange={e => this.onChange(e, 'particle')}
              deleteParticle={this.deleteParticle}
              i={i}
            />
          ))}
          <h3>Player</h3>
          <FieldEditor>
            <div>
              <label>x:</label>
              <input
                type="number"
                value={player.position.x}
                onChange={e => this.onChange(e, 'player')}
                step="10"
                data-n={0}
                data-prop="x"
              />
            </div>
            <div>
              <label>y:</label>
              <input
                type="number"
                value={player.position.y}
                onChange={e => this.onChange(e, 'player')}
                step="10"
                data-n={0}
                data-prop="y"
              />
            </div>
          </FieldEditor>
          <h3>Portal</h3>
          <FieldEditor>
            <div>
              <label>x:</label>
              <input
                type="number"
                value={door.x}
                onChange={e => this.onChange(e, 'portal')}
                step="10"
                data-n={0}
                data-prop="x"
              />
            </div>
            <div>
              <label>y:</label>
              <input
                type="number"
                value={door.y}
                onChange={e => this.onChange(e, 'portal')}
                step="10"
                data-n={0}
                data-prop="y"
              />
            </div>
          </FieldEditor>
        </EditPanel>
        <DisplayPanel hue={hue} width={width * scale} height={height * scale}>
          <PlayButton onClick={play}>PLAY</PlayButton>
          <ResetButton onClick={this.resetLevels}>RESET</ResetButton>
          {platforms.map((p, i) => (
            <DrawPlatform
              key={`platformDrawing${p.x}${p.y}`}
              {...p}
              color={antiHue}
              scale={scale}
              antiHue={antiHue}
              i={i}
            />
          ))}
          {particles.map((p, i) => (
            <DrawParticle key={`particleDrawing${p.x}${p.y}`} {...p} scale={scale} i={i} />
          ))}
          <div
            style={{
              position: 'absolute',
              left: `${player.position.x * scale}px`,
              top: `${player.position.y * scale}px`,
              width: `${20 * scale}px`,
              height: `${50 * scale}px`,
              backgroundColor: 'red'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${door.x * scale - 25}px`,
              top: `${door.y * scale - 60}px`,
              width: `${70 * scale}px`,
              height: `${70 * scale}px`,
              backgroundColor: 'rgba(255,255,255,0.5)',
              border: `${5 * scale}px solid black`,
              borderRadius: '50%'
            }}
          />
        </DisplayPanel>
      </Container>
    );
  }
}

const mapStateToProps = ({ levels, game }) => ({ levels, game });
const mapDispatchToProps = dispatch => ({
  update: ({ level, type, n, prop, value }) =>
    dispatch(actions.update({ level, type, n, prop, value })),
  setLevels: data => dispatch(actions.setLevels(data)),
  play: () => dispatch(push('/game')),
  updateCurrentGameLevel: n => dispatch(updateCurrentLevel(n)),
  addPlatform: n => dispatch(actions.addPlatform(n)),
  deletePlatform: ({ level, n }) => dispatch(actions.deletePlatform({ level, n })),
  addParticle: n => dispatch(actions.addParticle(n)),
  deleteParticle: ({ level, n }) => dispatch(actions.deleteParticle({ level, n }))
});

export default connect(mapStateToProps, mapDispatchToProps)(Editor);
