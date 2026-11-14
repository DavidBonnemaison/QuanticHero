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
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
  });

  it('navigates back to menu when clicking back button', () => {
    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
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

  it('renders ghost toggle button and toggles 3-state when clicked', () => {
    // When no personal best run is recorded: off -> optimal -> off
    useGameStore.setState({ ghostMode: 'optimal', ghostEnabled: true, scores: {} });
    renderWithRouter();

    const ghostBtn = screen.getByRole('button', { name: /ghost enabled/i });
    expect(ghostBtn).toBeInTheDocument();
    expect(ghostBtn).toHaveTextContent('[GHOST: OPTIMAL]');

    fireEvent.click(ghostBtn);
    expect(useGameStore.getState().ghostMode).toBe('off');
    expect(useGameStore.getState().ghostEnabled).toBe(false);
    expect(screen.getByRole('button', { name: /ghost disabled/i })).toHaveTextContent(
      '[GHOST: OFF]'
    );

    fireEvent.click(screen.getByRole('button', { name: /ghost disabled/i }));
    expect(useGameStore.getState().ghostMode).toBe('optimal');
    expect(useGameStore.getState().ghostEnabled).toBe(true);
    expect(screen.getByRole('button', { name: /ghost enabled/i })).toHaveTextContent(
      '[GHOST: OPTIMAL]'
    );
  });

  it('cycles through off -> optimal -> best -> off when personal best exists', () => {
    useGameStore.setState({
      ghostMode: 'optimal',
      ghostEnabled: true,
      scores: { 1: { best: 10000, last: 10000, ghostTrajectory: 'v1|0,10,20,0,i' } }
    });
    renderWithRouter();

    const ghostBtn = screen.getByRole('button', { name: /ghost enabled/i });
    expect(ghostBtn).toHaveTextContent('[GHOST: OPTIMAL]');

    // Click optimal -> best
    fireEvent.click(ghostBtn);
    expect(useGameStore.getState().ghostMode).toBe('best');
    expect(screen.getByRole('button', { name: /ghost enabled/i })).toHaveTextContent(
      '[GHOST: BEST]'
    );

    // Click best -> off
    fireEvent.click(screen.getByRole('button', { name: /ghost enabled/i }));
    expect(useGameStore.getState().ghostMode).toBe('off');
    expect(screen.getByRole('button', { name: /ghost disabled/i })).toHaveTextContent(
      '[GHOST: OFF]'
    );

    // Click off -> optimal
    fireEvent.click(screen.getByRole('button', { name: /ghost disabled/i }));
    expect(useGameStore.getState().ghostMode).toBe('optimal');
    expect(screen.getByRole('button', { name: /ghost enabled/i })).toHaveTextContent(
      '[GHOST: OPTIMAL]'
    );
  });

  it('hides Entanglement tab when maxLevel < 10', () => {
    useGameStore.setState({ maxLevel: 9, maxEntanglementLevel: 110 });
    renderWithRouter();

    // In Classic view by default
    expect(screen.getByText('Hydrogen')).toBeInTheDocument();
    expect(screen.queryByText('Darmstadtium')).not.toBeInTheDocument();
    // Entanglement tab is hidden
    expect(screen.queryByRole('button', { name: /intrication/i })).not.toBeInTheDocument();
  });

  it('shows Entanglement tab and allows switching once maxLevel >= 10', () => {
    useGameStore.setState({ maxLevel: 10, maxEntanglementLevel: 110 });
    renderWithRouter();

    // Entanglement tab is visible
    const entanglementTab = screen.getByRole('button', { name: /entanglement/i });
    expect(entanglementTab).toBeInTheDocument();

    // Click Entanglement tab
    fireEvent.click(entanglementTab);

    // Entangled levels 110-114 should now be visible
    expect(screen.getByText('Darmstadtium')).toBeInTheDocument();
    expect(screen.getByText('Roentgenium')).toBeInTheDocument();

    // Click Classic tab to return
    const classicTab = screen.getByRole('button', { name: /classic/i });
    fireEvent.click(classicTab);
    expect(screen.getByText('Hydrogen')).toBeInTheDocument();
  });

  it('displays entangled levels when query flag ?entanglement=1 is provided', () => {
    useGameStore.setState({ maxLevel: 1, maxEntanglementLevel: 110 });
    renderWithRouter('/levels?entanglement=1');

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

  it('unlocks level 111 when maxEntanglementLevel is 111 with ?entanglement=1', () => {
    useGameStore.setState({ maxEntanglementLevel: 111 });
    renderWithRouter('/levels?entanglement=1');

    // Level 111 (Roentgenium) is now unlocked
    const rg = screen.getByText('Roentgenium').closest('[role="button"]') as HTMLElement;
    expect(rg).toHaveAttribute('tabindex', '0');
    expect(rg.className).not.toMatch(/menuItemDisabled/);
  });
});
