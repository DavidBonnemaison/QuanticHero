import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../store';
import LevelSelection from './LevelSelection';

describe('LevelSelection component', () => {
  beforeEach(() => {
    useGameStore.setState({
      currentLevel: 0,
      maxLevel: 1,
      scores: {},
      customLevels: null
    });
  });

  const renderWithRouter = (initialRoute = '/levels') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/" element={<div>Menu Page</div>} />
          <Route path="/levels" element={<LevelSelection />} />
          <Route path="/explanation" element={<div>Explanation Page</div>} />
          <Route path="/game" element={<div>Game Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders title and back button', () => {
    renderWithRouter();

    expect(screen.getByRole('heading', { level: 1, name: /level selection/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /← menu/i })).toBeInTheDocument();
  });

  it('navigates back to menu when clicking back button', () => {
    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: /← menu/i }));
    expect(screen.getByText('Menu Page')).toBeInTheDocument();
  });

  it('enables level 1 and disables levels beyond maxLevel (when maxLevel = 1)', () => {
    renderWithRouter();

    const _items = screen.getAllByRole('button');
    // Find item for level 1 (Hydrogen)
    const hydrogen = screen.getByText('Hydrogen').closest('[role="button"]') as HTMLElement;
    expect(hydrogen).toBeInTheDocument();
    expect(hydrogen).toHaveAttribute('tabindex', '0');
    expect(hydrogen.className).not.toMatch(/menuItemDisabled/);

    // Find item for level 2 (Helium)
    const helium = screen.getByText('Helium').closest('[role="button"]') as HTMLElement;
    expect(helium).toBeInTheDocument();
    expect(helium).toHaveAttribute('tabindex', '-1');
    expect(helium.className).toMatch(/menuItemDisabled/);
  });

  it('allows clicking unlocked level 1 to select it and navigate', () => {
    renderWithRouter();

    const hydrogen = screen.getByText('Hydrogen').closest('[role="button"]') as HTMLElement;
    fireEvent.click(hydrogen);

    expect(useGameStore.getState().currentLevel).toBe(1);
    expect(screen.getByText('Explanation Page')).toBeInTheDocument();
  });

  it('does nothing when clicking locked level beyond maxLevel', () => {
    renderWithRouter();

    const helium = screen.getByText('Helium').closest('[role="button"]') as HTMLElement;
    fireEvent.click(helium);

    expect(useGameStore.getState().currentLevel).toBe(0);
    expect(screen.queryByText('Explanation Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Game Page')).not.toBeInTheDocument();
  });

  it('enables level 2 when maxLevel is increased to 2', () => {
    useGameStore.setState({ maxLevel: 2 });
    renderWithRouter();

    const helium = screen.getByText('Helium').closest('[role="button"]') as HTMLElement;
    expect(helium).toHaveAttribute('tabindex', '0');
    expect(helium.className).not.toMatch(/menuItemDisabled/);
  });

  it('displays recorded scores for levels', () => {
    useGameStore.setState({
      maxLevel: 2,
      scores: {
        1: { last: 12340, best: 12340 }
      }
    });
    renderWithRouter();

    // 12340 ms = 00:12:34
    expect(screen.getByText('00:12:34')).toBeInTheDocument();
  });
});
