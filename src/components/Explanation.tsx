import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as levels from '../data/levels';
import { useGameStore } from '../store';
import { Button, Container, Text } from './Explanation.styles';

export default function Explanation() {
  const navigate = useNavigate();
  const currentLevel = useGameStore((state) => state.currentLevel);
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
