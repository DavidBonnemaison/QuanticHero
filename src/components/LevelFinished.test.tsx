import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../store';
import LevelFinished from './LevelFinished';

describe('LevelFinished component', () => {
  beforeEach(() => {
    useGameStore.setState({
      currentLevel: 2, // just finished level 1
      maxLevel: 2,
      scores: {
        1: { last: 15200, best: 15200 }
      },
      customLevels: null
    });
  });

  const renderWithRouter = () => {
    return render(
      <MemoryRouter initialEntries={['/done']}>
        <Routes>
          <Route path="/" element={<div>Menu Screen</div>} />
          <Route path="/done" element={<LevelFinished />} />
          <Route path="/game" element={<div>Game Screen</div>} />
          <Route path="/explanation" element={<div>Explanation Screen</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders level atom name, formatted scores, and "New record !" badge when last equals best', () => {
    renderWithRouter();

    // Level 1 atom is Hydrogen
    expect(screen.getByRole('heading', { level: 1, name: 'Hydrogen' })).toBeInTheDocument();
    expect(screen.getByText('Last game')).toBeInTheDocument();
    expect(screen.getByText('All Time Best')).toBeInTheDocument();

    // 15200 ms = 00:15:20
    const scores = screen.getAllByText('00:15:20');
    expect(scores.length).toBe(2);

    expect(screen.getByText('New record !')).toBeInTheDocument();
  });

  it('does not display "New record !" badge when last is slower than best', () => {
    useGameStore.setState({
      currentLevel: 2,
      scores: {
        1: { last: 20000, best: 15000 }
      }
    });

    renderWithRouter();

    // 20000 ms = 00:20:00, 15000 ms = 00:15:00
    expect(screen.getByText('00:20:00')).toBeInTheDocument();
    expect(screen.getByText('00:15:00')).toBeInTheDocument();
    expect(screen.queryByText('New record !')).not.toBeInTheDocument();
  });

  it('navigates to menu on Menu button click', () => {
    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    expect(screen.getByText('Menu Screen')).toBeInTheDocument();
  });

  it('navigates to game and resets currentLevel to finished level on Retry click', () => {
    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(useGameStore.getState().currentLevel).toBe(1);
    expect(screen.getByText('Game Screen')).toBeInTheDocument();
  });

  it('navigates to next level on Next click', () => {
    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Next level 2 has explanations or game
    expect(
      screen.queryByText('Explanation Screen') || screen.queryByText('Game Screen')
    ).toBeInTheDocument();
  });
});
