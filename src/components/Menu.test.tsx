import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDailyIsotopePreview, getPreviousDateKey } from '../services/DailyIsotopeService';
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
      unlockedMolecules: [],
      dailyHistory: {},
      dailyStreak: { current: 0, longest: 0, lastCompletedDate: null }
    });
  });

  const renderWithRouter = () => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/explanation" element={<div>Explanation Page</div>} />
          <Route path="/game" element={<div>Game Page</div>} />
          <Route path="/daily" element={<div>Daily Isotope Page</div>} />
          <Route path="/levels" element={<div>Levels Page</div>} />
          <Route path="/modes" element={<div>Quantum Modes Page</div>} />
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
    expect(screen.getByRole('button', { name: /quantum modes/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /level lab/i })).not.toBeInTheDocument();
  });

  it('navigates to /modes on "Quantum Modes" button click', () => {
    renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: /quantum modes/i }));
    expect(screen.getByText('Quantum Modes Page')).toBeInTheDocument();
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

  it('navigates to /levels on "Periodic Table" click and keeps Level Lab hidden', () => {
    renderWithRouter();
    expect(screen.queryByRole('button', { name: /level lab/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /periodic table/i }));
    expect(screen.getByText('Levels Page')).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: /labo de niveaux/i })).not.toBeInTheDocument();
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

  it('renders the Daily Isotope card with atom preview, countdown, and navigates to /daily on click', () => {
    const preview = getDailyIsotopePreview();
    renderWithRouter();

    const dailyCard = screen.getByTestId('daily-isotope-card');
    expect(dailyCard).toHaveTextContent(`DAILY ISOTOPE — ${preview.symbol} ${preview.atom}`);
    expect(screen.getByTestId('daily-countdown')).toHaveTextContent(
      /next in \d{2}:\d{2}:\d{2} utc/i
    );
    expect(screen.queryByTestId('daily-streak-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('daily-completed-status')).not.toBeInTheDocument();

    // Verify no E2E forbidden emojis appear anywhere on the Menu
    const forbiddenEmojis = ['🔊', '🔇', '📳', '📴', '✨', '⚡', '👻', '📤', '✏️', '📱'];
    const bodyText = document.body.textContent ?? '';
    for (const emoji of forbiddenEmojis) {
      expect(bodyText).not.toContain(emoji);
    }

    fireEvent.click(dailyCard);
    expect(screen.getByText('Daily Isotope Page')).toBeInTheDocument();
  });

  it('shows streak badge and completed status with best time in EN and FR', () => {
    const preview = getDailyIsotopePreview();
    useGameStore.setState({
      dailyStreak: {
        current: 5,
        longest: 7,
        lastCompletedDate: preview.dateKey
      },
      dailyHistory: {
        [preview.dateKey]: {
          bestMs: 12340,
          bestJumps: 4,
          medal: 'gold'
        }
      }
    });
    renderWithRouter();

    expect(screen.getByTestId('daily-streak-badge')).toHaveTextContent('🔥 5 days');
    expect(screen.getByTestId('daily-completed-status')).toHaveTextContent('Completed ✓');
    expect(screen.getByTestId('daily-completed-status')).toHaveTextContent('00:12:34');

    fireEvent.click(screen.getByTestId('locale-toggle'));
    expect(screen.getByTestId('daily-streak-badge')).toHaveTextContent('🔥 5 jours');
    expect(screen.getByTestId('daily-completed-status')).toHaveTextContent('Complété ✓');
    expect(screen.getByTestId('daily-countdown')).toHaveTextContent(
      /prochain dans \d{2}:\d{2}:\d{2} utc/i
    );
  });

  it('hides expired daily streak badge when lastCompletedDate is older than yesterday', () => {
    const preview = getDailyIsotopePreview();
    const yesterday = getPreviousDateKey(preview.dateKey);
    const twoDaysAgo = getPreviousDateKey(yesterday);

    useGameStore.setState({
      dailyStreak: {
        current: 5,
        longest: 7,
        lastCompletedDate: twoDaysAgo
      }
    });
    const { unmount } = renderWithRouter();
    expect(screen.queryByTestId('daily-streak-badge')).not.toBeInTheDocument();
    unmount();

    // Yesterday's completion still keeps the streak active
    useGameStore.setState({
      dailyStreak: {
        current: 5,
        longest: 7,
        lastCompletedDate: yesterday
      }
    });
    renderWithRouter();
    expect(screen.getByTestId('daily-streak-badge')).toHaveTextContent('🔥 5 days');
  });

  it('does not clear activeDuel on mount when window.location contains a duel link', () => {
    const duel = {
      kind: 'campaign' as const,
      levelId: 2,
      challengerName: 'ALPHA',
      challengerTimeMs: 7000,
      challengerJumps: 3,
      ghostTrajectory: 'v1|0,80,700,0,i;7000,900,300,0,r'
    };
    useGameStore.setState({ activeDuel: duel });
    window.history.replaceState({}, '', '/#duel=testpayload');

    try {
      renderWithRouter();
      expect(useGameStore.getState().activeDuel).toEqual(duel);
    } finally {
      window.history.replaceState({}, '', '/');
    }
  });

  it('cycles hero skin through GAMEBOY -> NEO -> QUANTUM -> CLASSIC -> GAMEBOY', () => {
    useGameStore.setState({ heroSkin: 'gameboy', locale: 'en' });
    renderWithRouter();

    const skinBtn = screen.getByTestId('skin-toggle');
    expect(skinBtn).toHaveTextContent('SKIN: GAMEBOY');

    fireEvent.click(skinBtn);
    expect(useGameStore.getState().heroSkin).toBe('neo');
    expect(skinBtn).toHaveTextContent('SKIN: NEO');

    fireEvent.click(skinBtn);
    expect(useGameStore.getState().heroSkin).toBe('quantum');
    expect(skinBtn).toHaveTextContent('SKIN: QUANTUM');

    fireEvent.click(skinBtn);
    expect(useGameStore.getState().heroSkin).toBe('classic');
    expect(skinBtn).toHaveTextContent('SKIN: CLASSIC');

    fireEvent.click(skinBtn);
    expect(useGameStore.getState().heroSkin).toBe('gameboy');
    expect(skinBtn).toHaveTextContent('SKIN: GAMEBOY');
  });
});
