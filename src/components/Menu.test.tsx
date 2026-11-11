import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../store';
import Menu from './Menu';

vi.mock('./Molecules', () => ({
  default: {
    start: vi.fn(),
    end: vi.fn()
  }
}));

describe('Menu component', () => {
  beforeEach(() => {
    useGameStore.setState({
      currentLevel: 0,
      maxLevel: 1,
      scores: {},
      customLevels: null,
      isMuted: false
    });
  });

  const renderWithRouter = () => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/explanation" element={<div>Explanation Page</div>} />
          <Route path="/levels" element={<div>Levels Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders the game title and main navigation buttons', () => {
    renderWithRouter();

    expect(screen.getByRole('heading', { level: 1, name: /quantum hero/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /levels/i })).toBeInTheDocument();
  });

  it('navigates to explanation and sets current level to 1 on "New game" click', () => {
    renderWithRouter();

    const newGameButton = screen.getByRole('button', { name: /new game/i });
    fireEvent.click(newGameButton);

    expect(useGameStore.getState().currentLevel).toBe(1);
    expect(screen.getByText('Explanation Page')).toBeInTheDocument();
  });

  it('navigates to levels page on "Levels" click', () => {
    renderWithRouter();

    const levelsButton = screen.getByRole('button', { name: /levels/i });
    fireEvent.click(levelsButton);

    expect(screen.getByText('Levels Page')).toBeInTheDocument();
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
    expect(soundButton).toHaveTextContent('🔊');

    fireEvent.click(soundButton);
    expect(useGameStore.getState().isMuted).toBe(true);
    expect(screen.getByRole('button', { name: /unmute sound/i })).toHaveTextContent('🔇');

    fireEvent.click(screen.getByRole('button', { name: /unmute sound/i }));
    expect(useGameStore.getState().isMuted).toBe(false);
    expect(screen.getByRole('button', { name: /mute sound/i })).toHaveTextContent('🔊');
  });

  it('renders haptics toggle button and toggles haptics state on click', () => {
    renderWithRouter();

    const hapticsButton = screen.getByRole('button', { name: /disable haptics/i });
    expect(hapticsButton).toBeInTheDocument();
    expect(hapticsButton).toHaveTextContent('📳');

    fireEvent.click(hapticsButton);
    expect(useGameStore.getState().hapticsEnabled).toBe(false);
    expect(screen.getByRole('button', { name: /enable haptics/i })).toHaveTextContent('📴');

    fireEvent.click(screen.getByRole('button', { name: /enable haptics/i }));
    expect(useGameStore.getState().hapticsEnabled).toBe(true);
    expect(screen.getByRole('button', { name: /disable haptics/i })).toHaveTextContent('📳');
  });

  it('renders reduced effects toggle button and toggles reducedEffects state on click', () => {
    renderWithRouter();

    const fxButton = screen.getByRole('button', { name: /enable reduced visual effects/i });
    expect(fxButton).toBeInTheDocument();
    expect(fxButton).toHaveTextContent('✨');

    fireEvent.click(fxButton);
    expect(useGameStore.getState().reducedEffects).toBe(true);
    expect(screen.getByRole('button', { name: /enable full visual effects/i })).toHaveTextContent(
      '⚡'
    );

    fireEvent.click(screen.getByRole('button', { name: /enable full visual effects/i }));
    expect(useGameStore.getState().reducedEffects).toBe(false);
    expect(
      screen.getByRole('button', { name: /enable reduced visual effects/i })
    ).toHaveTextContent('✨');
  });
});
