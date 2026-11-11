import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../store';
import Explanation from './Explanation';

describe('Explanation component', () => {
  beforeEach(() => {
    useGameStore.setState({
      currentLevel: 1,
      maxLevel: 1,
      scores: {},
      customLevels: null
    });
  });

  const renderWithRouter = () => {
    return render(
      <MemoryRouter initialEntries={['/explanation']}>
        <Routes>
          <Route path="/explanation" element={<Explanation />} />
          <Route path="/game" element={<div>Game Screen</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders explanations for current level 1 and the "Got it" button', () => {
    renderWithRouter();

    expect(screen.getByText(/reduced to a veeery small size/i)).toBeInTheDocument();
    expect(screen.getByText(/try to get that electron/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /got it/i })).toBeInTheDocument();
  });

  it('navigates to /game when "Got it" is clicked', () => {
    renderWithRouter();

    const button = screen.getByRole('button', { name: /got it/i });
    fireEvent.click(button);

    expect(screen.getByText('Game Screen')).toBeInTheDocument();
  });

  it('renders empty text gracefully when level has no explanations', () => {
    // Current level 0 has no level0 defined
    useGameStore.setState({ currentLevel: 0 });
    renderWithRouter();

    expect(screen.getByRole('button', { name: /got it/i })).toBeInTheDocument();
    expect(screen.queryByText(/reduced to a veeery small size/i)).not.toBeInTheDocument();
  });
});
