import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as ReplayCardGenerator from '../services/ReplayCardGenerator';
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
      expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share card/i })).toBeInTheDocument();
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

  describe('Spec-03: Share Card (Isotope Record Card)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('renders Share Card button and invokes shareReplayCard with DUEL VICTORY badge and toast feedback', async () => {
      const shareSpy = vi
        .spyOn(ReplayCardGenerator, 'shareReplayCard')
        .mockResolvedValue('downloaded');

      const playerGhost = 'v1|0,80,700,0,i;7420,900,300,0,r';
      useGameStore.setState({
        currentLevel: 2,
        locale: 'en',
        scores: {
          1: {
            last: 7420,
            best: 7420,
            medal: 'gold',
            lastJumps: 6,
            coherentRun: true,
            ghostTrajectory: playerGhost
          }
        },
        sharedLevel: null,
        activeDuel: {
          kind: 'campaign',
          levelId: 1,
          challengerName: 'ALPHA',
          challengerTimeMs: 8500,
          challengerJumps: 7,
          ghostTrajectory: 'v1|0,80,700,0,i;8500,900,300,0,r'
        },
        lastRun: {
          kind: 'campaign',
          levelId: 1,
          elapsedMs: 7420,
          jumps: 6,
          ghostTrajectory: playerGhost
        }
      });

      renderWithRouter();

      const shareCardBtn = screen.getByRole('button', { name: /Share Card/i });
      expect(shareCardBtn).toBeInTheDocument();

      fireEvent.click(shareCardBtn);

      await waitFor(() => {
        expect(shareSpy).toHaveBeenCalledTimes(1);
      });

      const [cardInput] = shareSpy.mock.calls[0];
      expect(cardInput.badge).toBe('DUEL VICTORY');
      expect(cardInput.timeMs).toBe(7420);
      expect(cardInput.jumps).toBe(6);
      expect(cardInput.medal).toBe('gold');
      expect(cardInput.coherenceTier).toBe('HYPER');
      expect(cardInput.ghostTrajectory).toBe(playerGhost);
      expect(cardInput.shareUrl).toContain('#duel=');

      expect(
        await screen.findByText('Replay card PNG downloaded & link copied!')
      ).toBeInTheDocument();
    });

    it('passes DAILY ISOTOPE badge when sharing card for a daily run', async () => {
      const shareSpy = vi.spyOn(ReplayCardGenerator, 'shareReplayCard').mockResolvedValue('shared');

      useGameStore.setState({
        locale: 'en',
        sharedLevel: {
          ...mockSharedLevel,
          id: 'daily:2026-11-21'
        },
        scores: {
          0: { last: 9200, best: 9200, medal: 'silver', lastJumps: 5 }
        },
        activeDuel: null,
        lastRun: {
          kind: 'daily',
          dateKey: '2026-11-21',
          elapsedMs: 9200,
          jumps: 5,
          ghostTrajectory: ''
        }
      });

      renderWithRouter();

      fireEvent.click(screen.getByRole('button', { name: /Share Card/i }));

      await waitFor(() => {
        expect(shareSpy).toHaveBeenCalledTimes(1);
      });

      const [cardInput] = shareSpy.mock.calls[0];
      expect(cardInput.badge).toBe('DAILY ISOTOPE');
      expect(await screen.findByText('Replay card shared!')).toBeInTheDocument();
    });

    it('reads Daily Isotope best time, last time, medal, and ghost from dailyHistory and lastRun on /done', () => {
      useGameStore.setState({
        locale: 'en',
        sharedLevel: {
          ...mockSharedLevel,
          id: 'daily:2026-11-21',
          symbol: 'Nh',
          atom: 'Nihonium'
        },
        scores: {},
        dailyHistory: {
          '2026-11-21': {
            bestMs: 8450,
            bestJumps: 4,
            medal: 'gold',
            ghostTrajectory: 'v1|0,80,700,0,i;8450,900,300,0,r'
          }
        },
        activeDuel: null,
        lastRun: {
          kind: 'daily',
          dateKey: '2026-11-21',
          elapsedMs: 9320,
          jumps: 5,
          ghostTrajectory: 'v1|0,80,700,0,i;9320,900,300,0,r'
        }
      });

      renderWithRouter();

      expect(screen.getByRole('heading', { level: 1, name: 'Nihonium' })).toBeInTheDocument();
      // Last run: 9320 ms = 00:09:32, All Time Best: 8450 ms = 00:08:45
      expect(screen.getByText('00:09:32')).toBeInTheDocument();
      expect(screen.getByText('00:08:45')).toBeInTheDocument();
      expect(screen.queryByText('00:00:00')).not.toBeInTheDocument();
      expect(screen.getByText(/quantum isotope \(gold\)/i)).toBeInTheDocument();
      expect(screen.getByText(/5 jumps/i)).toBeInTheDocument();
    });
  });

  describe('Epic 06 Spec-01: PB / Gold Chromatic Celebration', () => {
    it('renders chromatic flash and spectral particles on NEW PB or Gold Medal when FX:HI', () => {
      useGameStore.setState({
        currentLevel: 2,
        reducedEffects: false,
        scores: {
          1: { last: 7420, best: 7420, medal: 'gold', lastJumps: 5 }
        },
        sharedLevel: null,
        activeDuel: null,
        lastRun: null
      });

      renderWithRouter();

      expect(screen.getByTestId('celebration-flash')).toBeInTheDocument();
      const particles = screen.getByTestId('spectral-particles');
      expect(particles.children.length).toBe(12);
    });

    it('suppresses chromatic flash and spectral particles when FX:LO (reducedEffects)', () => {
      useGameStore.setState({
        currentLevel: 2,
        reducedEffects: true,
        scores: {
          1: { last: 7420, best: 7420, medal: 'gold', lastJumps: 5 }
        },
        sharedLevel: null,
        activeDuel: null,
        lastRun: null
      });

      renderWithRouter();

      expect(screen.queryByTestId('celebration-flash')).not.toBeInTheDocument();
      expect(screen.queryByTestId('spectral-particles')).not.toBeInTheDocument();
    });

    it('does not trigger celebration when run is neither NEW PB nor Gold Medal', () => {
      useGameStore.setState({
        currentLevel: 2,
        reducedEffects: false,
        scores: {
          1: { last: 15000, best: 10000, medal: 'bronze', lastJumps: 12 }
        },
        sharedLevel: null,
        activeDuel: null,
        lastRun: null
      });

      renderWithRouter();

      expect(screen.queryByTestId('celebration-flash')).not.toBeInTheDocument();
      expect(screen.queryByTestId('spectral-particles')).not.toBeInTheDocument();
    });
  });
});
