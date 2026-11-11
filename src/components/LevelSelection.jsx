import React from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import { push } from 'react-router-redux';
import formatScore from './../tools/formatScore';
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
    const { updateCurrentLevel, beginLevel, goToExplanation, game, score } = this.props;
    const raw = Object.keys(levels)
      .filter(key => key.indexOf('level') !== -1)
      .sort((a, b) => Number(levels[a].id) - Number(levels[b].id))
      .map((key, i) => {
        const { id, hue, antiHue, symbol, atom } = levels[key];
        return { id, hue, antiHue, symbol, atom };
      });

    const enriched = raw.map(r => ({
      ...r,
      score: score[Number(r.id)] ? formatScore(score[Number(r.id)].best) : '00:00:00'
    }));

    const isDisabled = id => Number(id) > game.maxLevel;

    const handleClick = n => e => {
      if (isDisabled(n)) return;
      updateCurrentLevel(n);
      const { explanations } = levels[`level${n}`];
      if (!explanations) {
        beginLevel();
        return;
      }
      goToExplanation();
    };

    return (
      <div>
        <Title>Level Selection</Title>
        {enriched.map(({ id, hue, antiHue, symbol, atom, score = '00:00:00' }) => (
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

const mapStateToProps = ({ game, score }) => ({ game, score });
const mapDispatchToProps = dispatch => ({
  updateCurrentLevel: n => dispatch(actions.updateCurrentLevel(n)),
  updateMaxLevel: n => dispatch(actions.updateMaxLevel(n)),
  beginLevel: () => dispatch(push('/game')),
  goToExplanation: () => dispatch(push('/explanation'))
});

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
