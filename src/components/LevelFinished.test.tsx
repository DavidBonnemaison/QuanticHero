import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../store';
import { decodeDuelFromUrl, encodeDuelToUrl } from '../tools/levelCodec';
import type { LevelData } from '../types';
import LevelFinished from './LevelFinished';

const mockSharedLevel: LevelData = {
  id: 'custom-99',
  symbol: 'Qx',
  atom: 'Quarkonium',
  uncertainty: 3,
  width: 1200,
  height: 800,
  hue: '#112233',
  antiHue: '#aabbcc',
  player: { position: { x: 50, y: 700 } },
  door: { x: 900, y: 300 },
  platforms: [{ x: 0, y: 750, width: 1200, height: 40 }],
  particles: [],
  spikes: []
};

describe('LevelFinished component', () => {
  beforeEach(() => {
    useGameStore.setState({
      currentLevel: 2, // just finished level 1
      maxLevel: 2,
      scores: {
        1: { last: 15200, best: 15200 }
      },
      customLevels: null,
      sharedLevel: null
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
          <Route path="/levels" element={<div>Levels Screen</div>} />
          <Route path="/editor" element={<div>Editor Screen</div>} />
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
    expect(
      screen.queryByText('Explanation Screen') || screen.queryByText('Game Screen')
    ).toBeInTheDocument();
  });

  it('jumps from level 109 to level 115 on Next click in Classic mode', () => {
    useGameStore.setState({
      currentLevel: 115, // just finished level 109
      maxLevel: 115,
      locale: 'en',
      scores: {
        109: { last: 18000, best: 18000, medal: 'gold', lastJumps: 6 }
      }
    });
    renderWithRouter();

    expect(screen.getByRole('heading', { level: 1, name: 'Meitnerium' })).toBeInTheDocument();
    expect(screen.getByText(/quantum isotope \(gold\)/i)).toBeInTheDocument();
    expect(screen.getByText(/6 jumps/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(useGameStore.getState().currentLevel).toBe(115);
    expect(
      screen.queryByText('Explanation Screen') || screen.queryByText('Game Screen')
    ).toBeInTheDocument();
  });

  describe('Shared custom level mode', () => {
    beforeEach(() => {
      useGameStore.setState({
        sharedLevel: mockSharedLevel,
        scores: {
          0: { last: 12400, best: 12400 }
        }
      });
    });

    it('renders custom level details, speedrun challenge badge, and score from slot 0', () => {
      renderWithRouter();

      expect(screen.getByText(/SPEEDRUN CHALLENGE: Quarkonium/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Quarkonium' })).toBeInTheDocument();
      expect(screen.getAllByText('00:12:40').length).toBe(2);
      expect(screen.queryByRole('button', { name: /éditer ce niveau/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /levels/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    it('clears sharedLevel and navigates to levels when "Levels" is clicked', () => {
      renderWithRouter();

      fireEvent.click(screen.getByRole('button', { name: /levels/i }));

      const store = useGameStore.getState();
      expect(store.sharedLevel).toBeNull();
      expect(screen.getByText('Levels Screen')).toBeInTheDocument();
    });

    it('saves level to custom levels and shows confirmation toast when "Save" is clicked', () => {
      renderWithRouter();

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      const store = useGameStore.getState();
      expect(store.customLevels?.level1.atom).toBe('Quarkonium');
      expect(screen.getByText('Level saved to your custom levels!')).toBeInTheDocument();
    });
  });

  describe('Spec-03: COHERENT RUN badge', () => {
    it('displays COHERENT RUN badge and style score when level is finished at HYPER tier', () => {
      useGameStore.setState({
        currentLevel: 2,
        scores: {
          1: {
            last: 12000,
            best: 12000,
            coherentRun: true,
            bestStyleScore: 340,
            lastStyleScore: 340
          }
        },
        sharedLevel: null
      });

      renderWithRouter();

      const badge = screen.getByTestId('coherent-run-badge');
      expect(badge).toHaveTextContent(/COHERENT RUN/i);
      expect(badge).toHaveTextContent(/FLOW 340/i);
    });

    it('does not display COHERENT RUN badge when coherentRun is not set', () => {
      useGameStore.setState({
        currentLevel: 2,
        scores: {
          1: { last: 12000, best: 12000 }
        },
        sharedLevel: null
      });

      renderWithRouter();

      expect(screen.queryByTestId('coherent-run-badge')).not.toBeInTheDocument();
    });
  });

  describe('Spec-02: Ghost Tennis Duel verdict, Rematch, and Revenge Link', () => {
    it('decodes #duel= challenge, shows VICTORY verdict, and generates a #duel= revenge link with the new ghost', () => {
      const incomingUrl = encodeDuelToUrl({
        kind: 'campaign',
        levelId: 1,
        challengerName: 'ALPHA',
        challengerTimeMs: 8420,
        challengerJumps: 4,
        ghostTrajectory: 'v1|0,80,910,0,i;8420,750,750,0,r'
      });
      const decodedDuel = decodeDuelFromUrl(incomingUrl);
      expect(decodedDuel).not.toBeNull();

      const playerGhost = 'v1|0,80,910,0,i;8280,750,750,0,r';
      useGameStore.setState({
        currentLevel: 2,
        scores: {
          1: { last: 8280, best: 8280, ghostTrajectory: playerGhost, lastJumps: 3 }
        },
        sharedLevel: null,
        activeDuel: decodedDuel,
        lastRun: {
          kind: 'campaign',
          levelId: 1,
          elapsedMs: 8280,
          jumps: 3,
          ghostTrajectory: playerGhost
        }
      });

      renderWithRouter();

      const verdict = screen.getByTestId('duel-verdict');
      expect(verdict).toHaveTextContent('VICTORY -0.14s');
      expect(verdict).toHaveTextContent('YOU BEAT ALPHA BY -0.14s!');

      const revengeBtn = screen.getByRole('button', { name: /SEND REVENGE LINK/i });
      fireEvent.click(revengeBtn);

      // Update challenger tag and verify encoded #duel= revenge URL
      const tagInput = screen.getByLabelText(/YOUR TAG/i);
      fireEvent.change(tagInput, { target: { value: 'beta_99' } });

      const duelUrlInput = screen.getByLabelText('Duel URL') as HTMLInputElement;
      expect(duelUrlInput.value).toContain('#duel=');

      const revengeDuel = decodeDuelFromUrl(duelUrlInput.value);
      expect(revengeDuel).toEqual({
        kind: 'campaign',
        levelId: 1,
        challengerName: 'BETA99',
        challengerTimeMs: 8280,
        challengerJumps: 3,
        ghostTrajectory: playerGhost
      });
    });

    it('shows DEFEAT verdict and keeps activeDuel when clicking Rematch', () => {
      const activeDuel = {
        kind: 'campaign' as const,
        levelId: 1,
        challengerName: 'ALPHA',
        challengerTimeMs: 8000,
        challengerJumps: 3,
        ghostTrajectory: 'v1|0,80,910,0,i;8000,750,750,0,r'
      };
      useGameStore.setState({
        currentLevel: 2,
        scores: {
          1: { last: 8220, best: 8000, lastJumps: 4 }
        },
        sharedLevel: null,
        activeDuel,
        lastRun: {
          kind: 'campaign',
          levelId: 1,
          elapsedMs: 8220,
          jumps: 4,
          ghostTrajectory: 'v1|0,80,910,0,i;8220,750,750,0,r'
        }
      });

      renderWithRouter();

      const verdict = screen.getByTestId('duel-verdict');
      expect(verdict).toHaveTextContent('DEFEAT +0.22s');

      fireEvent.click(screen.getByRole('button', { name: /Rematch/i }));
      expect(useGameStore.getState().activeDuel).toEqual(activeDuel);
      expect(screen.getByText('Game Screen')).toBeInTheDocument();
    });

    it('offers Challenge a Friend button on non-duel completed levels and opens #duel= share modal', () => {
      renderWithRouter();

      fireEvent.click(screen.getByRole('button', { name: /Challenge a Friend/i }));
      const duelUrlInput = screen.getByLabelText('Duel URL') as HTMLInputElement;
      expect(duelUrlInput.value).toContain('#duel=');
      const decoded = decodeDuelFromUrl(duelUrlInput.value);
      expect(decoded?.kind).toBe('campaign');
      expect(decoded?.challengerName).toBe('ALPHA');
    });
  });
});
