import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../store';
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

      expect(screen.getByText(/DÉFI SPEEDRUN : Quarkonium/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Quarkonium' })).toBeInTheDocument();
      expect(screen.getAllByText('00:12:40').length).toBe(2);
      expect(screen.queryByRole('button', { name: /éditer ce niveau/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sauvegarder/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /partager/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /niveaux/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    it('clears sharedLevel and navigates to levels when "Niveaux" is clicked', () => {
      renderWithRouter();

      fireEvent.click(screen.getByRole('button', { name: /niveaux/i }));

      const store = useGameStore.getState();
      expect(store.sharedLevel).toBeNull();
      expect(screen.getByText('Levels Screen')).toBeInTheDocument();
    });

    it('saves level to custom levels and shows confirmation toast when "Sauvegarder" is clicked', () => {
      renderWithRouter();

      fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }));

      const store = useGameStore.getState();
      expect(store.customLevels?.level1.atom).toBe('Quarkonium');
      expect(screen.getByText('Niveau sauvegardé dans vos niveaux !')).toBeInTheDocument();
    });
  });
});
