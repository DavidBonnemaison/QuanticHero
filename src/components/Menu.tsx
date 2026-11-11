import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as levels from '../data/levels';
import { useGameStore } from '../store';
import type { LevelData } from '../types';
import { Button, MenuWrapper, Title } from './Menu.styles';
import Molecules from './Molecules';

export default function Menu() {
  const navigate = useNavigate();
  const customLevels = useGameStore((state) => state.customLevels);
  const setLevels = useGameStore((state) => state.setLevels);
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);

  useEffect(() => {
    Molecules.start();
    if (!customLevels) {
      setLevels(levels as unknown as Record<string, LevelData>);
    }
    return () => {
      Molecules.end();
    };
  }, [customLevels, setLevels]);

  const handleNewGame = () => {
    updateCurrentLevel(1);
    navigate('/explanation');
  };

  const handleGoToLevels = () => {
    navigate('/levels');
  };

  return (
    <MenuWrapper>
      <div id="container" />
      <Title>Quantum Hero</Title>
      <Button onClick={handleNewGame}>New game</Button>
      <Button onClick={handleGoToLevels}>Levels</Button>
    </MenuWrapper>
  );
}
