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

  it('renders ghost toggle button and toggles state when clicked', () => {
    useGameStore.setState({ ghostEnabled: true });
    renderWithRouter();

    const ghostBtn = screen.getByRole('button', { name: /ghost enabled/i });
    expect(ghostBtn).toBeInTheDocument();
    expect(ghostBtn).toHaveTextContent('ON');

    fireEvent.click(ghostBtn);
    expect(useGameStore.getState().ghostEnabled).toBe(false);
    expect(screen.getByRole('button', { name: /ghost disabled/i })).toHaveTextContent('OFF');

    fireEvent.click(screen.getByRole('button', { name: /ghost disabled/i }));
    expect(useGameStore.getState().ghostEnabled).toBe(true);
    expect(screen.getByRole('button', { name: /ghost enabled/i })).toHaveTextContent('ON');
  });

  it('switches between Classic and Entanglement tabs and displays entangled levels', () => {
    useGameStore.setState({ maxEntanglementLevel: 110 });
    renderWithRouter();

    // In Classic tab by default
    expect(screen.getByText('Hydrogen')).toBeInTheDocument();
    expect(screen.queryByText('Darmstadtium')).not.toBeInTheDocument();

    // Click Entanglement tab
    const entanglementTab = screen.getByRole('button', { name: /entanglement/i });
    fireEvent.click(entanglementTab);

    // Entangled levels 110-114 should now be visible
    expect(screen.getByText('Darmstadtium')).toBeInTheDocument();
    expect(screen.getByText('Roentgenium')).toBeInTheDocument();
    expect(screen.getByText('Copernicium')).toBeInTheDocument();
    expect(screen.getByText('Nihonium')).toBeInTheDocument();
    expect(screen.getByText('Flerovium')).toBeInTheDocument();

    // Level 110 (Darmstadtium) is unlocked
    const ds = screen.getByText('Darmstadtium').closest('[role="button"]') as HTMLElement;
    expect(ds).toHaveAttribute('tabindex', '0');
    expect(ds.className).not.toMatch(/menuItemDisabled/);

    // Level 111 (Roentgenium) is locked when maxEntanglementLevel = 110
    const rg = screen.getByText('Roentgenium').closest('[role="button"]') as HTMLElement;
    expect(rg).toHaveAttribute('tabindex', '-1');
    expect(rg.className).toMatch(/menuItemDisabled/);
  });

  it('unlocks level 111 when maxEntanglementLevel is 111', () => {
    useGameStore.setState({ maxEntanglementLevel: 111 });
    renderWithRouter('/levels?tab=entanglement');

    // Level 111 (Roentgenium) is now unlocked
    const rg = screen.getByText('Roentgenium').closest('[role="button"]') as HTMLElement;
    expect(rg).toHaveAttribute('tabindex', '0');
    expect(rg.className).not.toMatch(/menuItemDisabled/);
  });
});
