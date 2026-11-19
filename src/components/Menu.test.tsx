import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../store';
import Menu from './Menu';

describe('Menu component', () => {
  beforeEach(() => {
    useGameStore.setState({
      currentLevel: 0,
      maxLevel: 1,
      maxEntanglementLevel: 110,
      scores: {},
      customLevels: null,
      isMuted: false,
      hapticsEnabled: true,
      reducedEffects: false,
      locale: 'en',
      unlockedMolecules: []
    });
  });

  const renderWithRouter = () => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/explanation" element={<div>Explanation Page</div>} />
          <Route path="/game" element={<div>Game Page</div>} />
          <Route path="/levels" element={<div>Levels Page</div>} />
          <Route path="/editor" element={<div>Editor Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders the game title and main navigation buttons when no progress exists', () => {
    renderWithRouter();

    expect(screen.getByRole('heading', { level: 1, name: /quantum hero/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /periodic table/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /level lab/i })).toBeInTheDocument();
  });

  it('navigates directly to explanation and sets current level to 1 on "New Game" click without progress', () => {
    renderWithRouter();

    const newGameButton = screen.getByRole('button', { name: /new game/i });
    fireEvent.click(newGameButton);

    expect(useGameStore.getState().currentLevel).toBe(1);
    expect(screen.getByText('Explanation Page')).toBeInTheDocument();
  });

  it('displays Continue button with Atom #Z (Symbol) when player has progress and resumes game', () => {
    useGameStore.setState({
      currentLevel: 0,
      maxLevel: 6,
      scores: { 1: { last: 10000, best: 10000 } }
    });
    renderWithRouter();

    const continueBtn = screen.getByRole('button', { name: /continue — atom #6 \(C\)/i });
    expect(continueBtn).toBeInTheDocument();

    fireEvent.click(continueBtn);
    expect(useGameStore.getState().currentLevel).toBe(6);
    expect(screen.getByText('Game Page')).toBeInTheDocument();
  });

  it('opens confirmation modal on "New Game" when progress exists and preserves progress on Cancel', () => {
    useGameStore.setState({
      currentLevel: 5,
      maxLevel: 8,
      scores: { 1: { last: 10000, best: 10000, medal: 'gold' } },
      unlockedMolecules: ['H2O']
    });
    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(/reset all progress, medals and unlocked molecules\?/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useGameStore.getState().maxLevel).toBe(8);
    expect(useGameStore.getState().unlockedMolecules).toEqual(['H2O']);
  });

  it('resets progress and navigates to /explanation when confirming New Game reset modal', () => {
    useGameStore.setState({
      currentLevel: 5,
      maxLevel: 8,
      scores: { 1: { last: 10000, best: 10000, medal: 'gold' } },
      unlockedMolecules: ['H2O']
    });
    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: /new game/i }));
    fireEvent.click(screen.getByRole('button', { name: /reset & start/i }));

    const state = useGameStore.getState();
    expect(state.currentLevel).toBe(1);
    expect(state.maxLevel).toBe(1);
    expect(state.scores).toEqual({});
    expect(state.unlockedMolecules).toEqual([]);
    expect(screen.getByText('Explanation Page')).toBeInTheDocument();
  });

  it('navigates to /levels on "Periodic Table" click and /editor on "Level Lab" click', () => {
    const { unmount } = renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: /periodic table/i }));
    expect(screen.getByText('Levels Page')).toBeInTheDocument();
    unmount();

    renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: /level lab/i }));
    expect(screen.getByText('Editor Page')).toBeInTheDocument();
  });

  it('toggles EN / FR locale and renders fully localized French labels', () => {
    useGameStore.setState({ maxLevel: 2 });
    renderWithRouter();

    const localeToggle = screen.getByTestId('locale-toggle');
    expect(localeToggle).toHaveTextContent('EN/FR');

    fireEvent.click(localeToggle);
    expect(useGameStore.getState().locale).toBe('fr');

    expect(
      screen.getByRole('button', { name: /continuer — atome #2 \(He\)/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tableau périodique/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /labo de niveaux/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nouvelle partie/i })).toBeInTheDocument();
  });

  it('shows install button when beforeinstallprompt event is fired', () => {
    renderWithRouter();

    expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();

    const promptEvent = new Event('beforeinstallprompt');
    Object.assign(promptEvent, {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' })
    });

    fireEvent(window, promptEvent);

    expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
  });

  it('renders sound toggle button and toggles mute state on click', () => {
    renderWithRouter();

    const soundButton = screen.getByRole('button', { name: /mute sound/i });
    expect(soundButton).toBeInTheDocument();
    expect(soundButton).toHaveTextContent('SND:ON');

    fireEvent.click(soundButton);
    expect(useGameStore.getState().isMuted).toBe(true);
    expect(screen.getByRole('button', { name: /unmute sound/i })).toHaveTextContent('SND:OFF');

    fireEvent.click(screen.getByRole('button', { name: /unmute sound/i }));
    expect(useGameStore.getState().isMuted).toBe(false);
    expect(screen.getByRole('button', { name: /mute sound/i })).toHaveTextContent('SND:ON');
  });

  it('renders haptics toggle button and toggles haptics state on click', () => {
    renderWithRouter();

    const hapticsButton = screen.getByRole('button', { name: /disable haptics/i });
    expect(hapticsButton).toBeInTheDocument();
    expect(hapticsButton).toHaveTextContent('HAP:ON');

    fireEvent.click(hapticsButton);
    expect(useGameStore.getState().hapticsEnabled).toBe(false);
    expect(screen.getByRole('button', { name: /enable haptics/i })).toHaveTextContent('HAP:OFF');

    fireEvent.click(screen.getByRole('button', { name: /enable haptics/i }));
    expect(useGameStore.getState().hapticsEnabled).toBe(true);
    expect(screen.getByRole('button', { name: /disable haptics/i })).toHaveTextContent('HAP:ON');
  });

  it('renders reduced effects toggle button and toggles reducedEffects state on click', () => {
    renderWithRouter();

    const fxButton = screen.getByRole('button', { name: /enable reduced visual effects/i });
    expect(fxButton).toBeInTheDocument();
    expect(fxButton).toHaveTextContent('FX:HI');

    fireEvent.click(fxButton);
    expect(useGameStore.getState().reducedEffects).toBe(true);
    expect(screen.getByRole('button', { name: /enable full visual effects/i })).toHaveTextContent(
      'FX:LO'
    );

    fireEvent.click(screen.getByRole('button', { name: /enable full visual effects/i }));
    expect(useGameStore.getState().reducedEffects).toBe(false);
    expect(
      screen.getByRole('button', { name: /enable reduced visual effects/i })
    ).toHaveTextContent('FX:HI');
  });
});
