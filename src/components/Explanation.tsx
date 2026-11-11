import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as levels from '../data/levels';
import type { RootState } from '../types';
import { Button, Container, Text } from './Explanation.styles';

export default function Explanation() {
  const navigate = useNavigate();
  const game = useSelector((state: RootState) => state.game);
  const { currentLevel } = game;
  const levelData = (levels as any)[`level${currentLevel}`] || { explanations: [] };
  const explanations: string[] = levelData.explanations || [];

  const handlePlay = () => {
    navigate('/game');
  };

  return (
    <Container>
      <Text>
        {explanations.map((e, i) => (
          <p key={`exp-${i}`}>{e}</p>
        ))}
      </Text>
      <Button onClick={handlePlay}>Got it</Button>
    </Container>
  );
}
