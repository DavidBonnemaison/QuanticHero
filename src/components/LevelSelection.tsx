import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import formatScore from '../tools/formatScore';
import * as actions from '../actions/game';
import * as levelsData from '../data/levels';
import { RootState, LevelData } from '../types';
import {
  SelectionContainer,
  Header,
  BackButton,
  Title,
  MenuItem,
  Atom,
  AtomicNumber,
  AtomDescription,
  AtomTitle,
  AtomScore
} from './LevelSelection.styles';

const allLevels = levelsData as unknown as Record<string, LevelData>;

export const LevelSelection: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const game = useSelector((state: RootState) => state.game);
  const score = useSelector((state: RootState) => state.score);

  const raw = Object.keys(allLevels)
    .filter(key => key.startsWith('level'))
    .sort((a, b) => Number(allLevels[a].id) - Number(allLevels[b].id))
    .map(key => {
      const { id, hue, antiHue, symbol, atom } = allLevels[key];
      return { id, hue, antiHue, symbol, atom };
    });

  const enriched = raw.map(r => ({
    ...r,
    score: score[Number(r.id)] ? formatScore(score[Number(r.id)].best) : '00:00:00'
  }));

  const isDisabled = (id: string | number) => Number(id) > game.maxLevel;

  const handleSelect = (n: string | number) => {
    if (isDisabled(n)) return;
    dispatch(actions.updateCurrentLevel(Number(n)));
    const targetLevel = allLevels[`level${n}`];
    if (targetLevel && targetLevel.explanations && targetLevel.explanations.length > 0) {
      navigate('/explanation');
    } else {
      navigate('/game');
    }
  };

  return (
    <SelectionContainer>
      <Header>
        <BackButton onClick={() => navigate('/')}>← Menu</BackButton>
        <Title>Level Selection</Title>
        <div style={{ width: 70 }} />
      </Header>
      {enriched.map(({ id, hue, antiHue, symbol, atom, score: levelScore }) => (
        <MenuItem
          key={`${id}-${symbol}`}
          onClick={() => handleSelect(id)}
          disabled={isDisabled(id)}
        >
          <Atom color={antiHue} bgColor={hue}>
            {symbol}
            <AtomicNumber>{id}</AtomicNumber>
          </Atom>
          <AtomDescription>
            <AtomTitle>{atom}</AtomTitle>
            <AtomScore>{levelScore}</AtomScore>
          </AtomDescription>
        </MenuItem>
      ))}
    </SelectionContainer>
  );
};

export default LevelSelection;
