import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './store';
import { encodeDuelToUrl } from './tools/levelCodec';

vi.mock('./Game', () => ({
  default: () => <div data-testid="mock-game">Game Screen</div>
}));

vi.mock('./components/AcceleratorMode', () => ({
  default: () => <div data-testid="mock-accelerator">Accelerator Screen</div>
}));

vi.mock('./data/levels', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./data/levels')>();
  return {
    ...actual,
    loadLevel: vi.fn().mockResolvedValue(null)
  };
});

import App from './App';

describe('App root #duel= routing', () => {
  beforeEach(() => {
    useGameStore.setState({
      currentLevel: 0,
      maxLevel: 1,
      scores: {},
      sharedLevel: null,
      activeDuel: null,
      lastRun: null,
      pendingDuelShare: null
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('preserves activeDuel and hash when opening /#duel=... at root', async () => {
    const duelUrl = encodeDuelToUrl({
      kind: 'campaign',
      levelId: 4,
      challengerName: 'RIVAL',
      challengerTimeMs: 7650,
      challengerJumps: 5,
      ghostTrajectory: 'v1|0,80,700,0,i;7650,900,300,0,r'
    });
    const hash = new URL(duelUrl).hash;
    window.history.replaceState({}, '', `/${hash}`);

    const { getByTestId } = render(<App />);

    await waitFor(() => {
      expect(getByTestId('mock-game')).toBeInTheDocument();
    });

    expect(window.location.pathname).toBe('/game');
    expect(window.location.hash).toBe(hash);
    expect(useGameStore.getState().activeDuel).toEqual({
      kind: 'campaign',
      levelId: 4,
      challengerName: 'RIVAL',
      challengerTimeMs: 7650,
      challengerJumps: 5,
      ghostTrajectory: 'v1|0,80,700,0,i;7650,900,300,0,r'
    });
    expect(useGameStore.getState().currentLevel).toBe(4);
  });
});
