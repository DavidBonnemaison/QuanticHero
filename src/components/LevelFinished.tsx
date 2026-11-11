import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as actions from '../actions/game';
import {
  Container,
  Done,
  ScoresWrapper,
  ScoreBox,
  ScoreType,
  ScoreValue,
  BestBadge,
  ButtonContainer,
  Button,
  Molecule
} from './LevelFinished.styles';
import formatScore from '../tools/formatScore';
import * as levels from '../data/levels';
import { RootState } from '../types';

export default function LevelFinished() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const game = useSelector((state: RootState) => state.game);
  const score = useSelector((state: RootState) => state.score);

  const levelIndex = Math.max(1, game.currentLevel - 1);
  const currentLevelScore = score[levelIndex] || { best: 0, last: 0 };
  const { last, best } = currentLevelScore;

  const currentLevelData = (levels as any)[`level${levelIndex}`] || {
    id: String(levelIndex),
    hue: '#070737',
    antiHue: '#c56805',
    symbol: '?',
    atom: 'Unknown'
  };
  const { id, hue, antiHue, symbol, atom } = currentLevelData;

  const handleNextLevel = () => {
    const nextLevelData = (levels as any)[`level${game.currentLevel}`];
    if (nextLevelData && nextLevelData.explanations && nextLevelData.explanations.length > 0) {
      navigate('/explanation');
    } else {
      navigate('/game');
    }
  };

  const handleRetry = () => {
    dispatch(actions.updateCurrentLevel(levelIndex));
    navigate('/game');
  };

  const handleGoToMenu = () => {
    navigate('/');
  };

  return (
    <Container>
      <Done>{atom}</Done>

      <ScoresWrapper>
        <ScoreBox>
          <ScoreType>Last game</ScoreType>
          <ScoreValue>{formatScore(last)}</ScoreValue>
          {best === last && best > 0 && <BestBadge>New record !</BestBadge>}
        </ScoreBox>

        <ScoreBox>
          <ScoreType>All Time Best</ScoreType>
          <ScoreValue>{formatScore(best)}</ScoreValue>
        </ScoreBox>
      </ScoresWrapper>

      <Molecule bgColor={hue} color={antiHue}>
        <span>{id}</span>
        <span>{symbol}</span>
      </Molecule>

      <ButtonContainer>
        <Button buttonType="menu" onClick={handleGoToMenu}>
          Menu
        </Button>
        <Button buttonType="retry" onClick={handleRetry}>
          Retry
        </Button>
        <Button buttonType="next" onClick={handleNextLevel}>
          Next
        </Button>
      </ButtonContainer>
    </Container>
  );
}
