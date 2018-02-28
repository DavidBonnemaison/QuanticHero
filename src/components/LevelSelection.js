import React from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import * as actions from './../actions/game';
import * as levels from './../data/levels';
import {
  MenuItem,
  Atom,
  AtomicNumber,
  AtomDescription,
  AtomTitle,
  AtomScore,
  Title
} from './LevelSelection.styles';

class Menu extends React.Component {
  render() {
    const raw = Object.keys(levels)
      .filter(key => key.indexOf('level') !== -1)
      .sort((a, b) => Number(levels[a].id) - Number(levels[b].id))
      .map((key, i) => {
        const { id, hue, antiHue, symbol, atom } = levels[key];
        return { id, hue, antiHue, symbol, atom };
      });

    const isDisabled = id => Number(id) > this.props.game.maxLevel;

    const handleClick = n => e => {
      if (isDisabled(n)) return;
      this.props.updateCurrentLevel(n);
      this.props.beginLevel();
    };

    return (
      <div>
        <Title>Level Selection</Title>
        {raw.map(({ id, hue, antiHue, symbol, atom, score = '00:00:00' }) => (
          <MenuItem key={`${id}-${symbol}`} onClick={handleClick(id)} disabled={isDisabled(id)}>
            <Atom color={antiHue} bgColor={hue}>
              {symbol}
              <AtomicNumber>{id}</AtomicNumber>
            </Atom>
            <AtomDescription>
              <AtomTitle>{atom}</AtomTitle>
              <AtomScore>{score}</AtomScore>
            </AtomDescription>
          </MenuItem>
        ))}
      </div>
    );
  }
}

const mapStateToProps = ({ game }) => ({ game });
const mapDispatchToProps = dispatch => ({
  updateCurrentLevel: n => dispatch(actions.updateCurrentLevel(n)),
  updateMaxLevel: n => dispatch(actions.updateMaxLevel(n)),
  beginLevel: () => dispatch(push('/game'))
});

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
