import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import * as actions from './../actions/game';
import {
  Container,
  Done,
  Score,
  ScoreType,
  Button,
  Best,
  Molecule,
  ButtonContainer
} from './LevelFinished.styles';
import formatScore from './../tools/formatScore';
import * as levels from './../data/levels';

class LevelFinished extends React.Component {
  static propTypes = {
    game: PropTypes.object.isRequired,
    score: PropTypes.object.isRequired,
    nextLevel: PropTypes.func.isRequired,
    setCurrentLevel: PropTypes.func.isRequired,
    goToMenu: PropTypes.func.isRequired
  };

  nextLevel = () => {
    const { explanations } = levels[`level${this.props.game.currentLevel}`];
    if (!explanations) {
      this.props.nextLevel();
      return;
    }
    this.props.goToExplanation();
  };

  render() {
    const { game, score, nextLevel, setCurrentLevel, goToMenu } = this.props;
    const currentLevels = score[game.currentLevel - 1] || {
      best: 0,
      last: 0
    };
    const { last, best } = currentLevels;
    const { id, hue, antiHue, symbol, atom } = levels[`level${game.currentLevel - 1}`];
    const retry = () => {
      setCurrentLevel(game.currentLevel - 1);
      nextLevel();
    };
    return (
      <Container>
        <Done>{atom}</Done>
        <Score>
          {formatScore(last)}
          <ScoreType>Last game</ScoreType>
          {best === last && <Best>New record !</Best>}
        </Score>
        <Score>
          {formatScore(best)}
          <ScoreType>All Time Best</ScoreType>
        </Score>
        <Molecule bgColor={hue} color={antiHue}>
          <span>{id}</span>
          <span>{symbol}</span>
        </Molecule>
        <ButtonContainer>
          <Button onClick={goToMenu}>Menu</Button>
          <Button type="retry" onClick={retry}>
            Retry
          </Button>
          <Button type="next" onClick={this.nextLevel}>
            Next
          </Button>
        </ButtonContainer>
      </Container>
    );
  }
}

const mapStateToProps = ({ game, score }) => ({ game, score });
const mapDispatchToProps = dispatch => ({
  nextLevel: () => dispatch(push('/game')),
  goToMenu: () => dispatch(push('/')),
  setCurrentLevel: n => dispatch(actions.updateCurrentLevel(n)),
  goToExplanation: () => dispatch(push('/explanation'))
});

export default connect(mapStateToProps, mapDispatchToProps)(LevelFinished);
