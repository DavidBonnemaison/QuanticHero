import React from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import { push } from 'react-router-redux';
import * as actions from './../actions/game';
import { Container, Done, Score, ScoreType, Button, Best, Molecule } from './LevelFinished.styles';
import formatScore from './../tools/formatScore';
import * as levels from './../data/levels';

class LevelFinished extends React.Component {
  render() {
    const { game, score, nextLevel, goToMenu } = this.props;
    const currentLevels = score[game.currentLevel - 1] || {
      best: 0,
      last: 0
    };
    const { last, best } = currentLevels;
    const { id, hue, antiHue, symbol, atom } = levels[`level${game.currentLevel - 1}`];
    return (
      <Container>
        <Done>{atom}</Done>
        <Score>
          {formatScore(best)}
          <ScoreType>Best</ScoreType>
        </Score>
        <Score>
          {formatScore(last)}
          <ScoreType>Last</ScoreType>
          {best === last && <Best>New record !</Best>}
        </Score>
        <Molecule bgColor={hue} color={antiHue}>
          <span>{id}</span>
          <span>{symbol}</span>
        </Molecule>
        <Button onClick={goToMenu}>Menu</Button>
        <Button type="next" onClick={nextLevel}>
          Next
        </Button>
      </Container>
    );
  }
}

const mapStateToProps = ({ game, score }) => ({ game, score });
const mapDispatchToProps = dispatch => ({
  nextLevel: () => dispatch(push('/game')),
  goToMenu: () => dispatch(push('/'))
});

export default connect(mapStateToProps, mapDispatchToProps)(LevelFinished);
