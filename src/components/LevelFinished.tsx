import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as levels from '../data/levels';
import { useGameStore } from '../store';
import formatScore from '../tools/formatScore';
import {
  BestBadge,
  Button,
  ButtonContainer,
  Container,
  Done,
  Molecule,
  ScoreBox,
  ScoreType,
  ScoreValue,
  ScoresWrapper
} from './LevelFinished.styles';

export default function LevelFinished() {
  const navigate = useNavigate();

  const currentLevel = useGameStore((state) => state.currentLevel);
  const scores = useGameStore((state) => state.scores);
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);

  const levelIndex = Math.max(1, currentLevel - 1);
  const currentLevelScore = scores[levelIndex] || { best: 0, last: 0 };
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
    const nextLevelData = (levels as any)[`level${currentLevel}`];
    if (nextLevelData?.explanations && nextLevelData.explanations.length > 0) {
      navigate('/explanation');
    } else {
      navigate('/game');
    }
  };

  const handleRetry = () => {
    updateCurrentLevel(levelIndex);
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
