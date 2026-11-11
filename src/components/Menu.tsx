import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as actions from '../actions/game';
import { setLevels } from '../actions/levels';
import { MenuWrapper, Title, Button } from './Menu.styles';
import Molecules from './Molecules';
import * as levels from '../data/levels';
import { RootState } from '../types';

export default function Menu() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentLevels = useSelector((state: RootState) => state.levels);

  useEffect(() => {
    Molecules.start();
    if (!currentLevels) {
      dispatch(setLevels(levels));
    }
    return () => {
      Molecules.end();
    };
  }, [currentLevels, dispatch]);

  const handleNewGame = () => {
    dispatch(actions.updateCurrentLevel(1));
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
