import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    AUTO: 0,
    Scale: { RESIZE: 3, CENTER_BOTH: 1 },
    Game: vi.fn()
  }
}));
vi.mock('../scenes/BootScene', () => ({ default: class BootScene {} }));
vi.mock('../scenes/PreloadScene', () => ({ default: class PreloadScene {} }));
vi.mock('../scenes/GameScene', () => ({ default: class GameScene {} }));

import { AcceleratorRunManager } from '../roguelite/AcceleratorRunManager';
import { useGameStore } from '../store';
import { gameEvents } from '../tools/gameEvents';
import AcceleratorMode from './AcceleratorMode';

const FORBIDDEN_EMOJIS = ['🔊', '🔇', '📳', '📴', '✨', '⚡', '👻', '📤', '✏️', '📱'];

describe('AcceleratorMode UI (Spec-03)', () => {
  beforeEach(() => {
    useGameStore.setState({
      locale: 'en',
      acceleratorBest: null,
      sharedLevel: null,
      activeDuel: null
    });
  });

  const renderAccelerator = (manager: AcceleratorRunManager) =>
    render(
      <MemoryRouter initialEntries={['/accelerator']}>
        <Routes>
          <Route
            path="/accelerator"
            element={<AcceleratorMode runManager={manager} disablePhaser />}
          />
          <Route path="/modes" element={<div>Modes Hub Page</div>} />
        </Routes>
      </MemoryRouter>
    );

  it('renders HUD with Z = 1, 3 lives, and zero forbidden emojis', () => {
    const manager = new AcceleratorRunManager(42);
    renderAccelerator(manager);

    expect(screen.getByTestId('accelerator-hud')).toBeInTheDocument();
    expect(screen.getByTestId('accelerator-z-badge')).toHaveTextContent('Z = 1');
    expect(screen.getByTestId('accelerator-rooms')).toHaveTextContent('ROOMS 0');

    const fullText = screen.getByTestId('accelerator-mode').textContent ?? '';
    for (const emoji of FORBIDDEN_EMOJIS) {
      expect(fullText.includes(emoji)).toBe(false);
    }
  });

  it('opens the 2-card mutation choice overlay on room clear and accepts keyboard [1] / [2] selection', () => {
    const manager = new AcceleratorRunManager(99);
    renderAccelerator(manager);

    act(() => {
      gameEvents.emit('accelerator:room_cleared', {
        elapsedMs: 6200,
        jumps: 4,
        levelId: 'accelerator-1'
      });
    });

    expect(screen.getByTestId('mutation-choice-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('mutation-choice-1')).toBeInTheDocument();
    expect(screen.getByTestId('mutation-choice-2')).toBeInTheDocument();

    // Check zero forbidden emojis inside mutation overlay
    const overlayText = screen.getByTestId('mutation-choice-overlay').textContent ?? '';
    for (const emoji of FORBIDDEN_EMOJIS) {
      expect(overlayText.includes(emoji)).toBe(false);
    }

    // Pick option 2 via keyboard '2'
    fireEvent.keyDown(window, { key: '2', code: 'Digit2' });

    expect(screen.queryByTestId('mutation-choice-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('accelerator-z-badge')).toHaveTextContent('Z = 2');
    expect(screen.getByTestId('accelerator-rooms')).toHaveTextContent('ROOMS 1');
    expect(manager.getState().activeMutations.length).toBe(1);
  });

  it('transitions to shareable Game Over summary after losing all 3 lives and supports Copy Summary & New Run', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    });

    const manager = new AcceleratorRunManager(123);
    renderAccelerator(manager);

    // Clear 1 room and pick mutation 1
    act(() => {
      gameEvents.emit('accelerator:room_cleared', {
        elapsedMs: 7500,
        jumps: 5,
        levelId: 'accelerator-1'
      });
    });
    fireEvent.click(screen.getByTestId('mutation-choice-1'));

    // Lose 3 lives
    act(() => {
      gameEvents.emit('accelerator:life_lost', { deathPos: { x: 200, y: 400 } });
      gameEvents.emit('accelerator:life_lost', { deathPos: { x: 200, y: 400 } });
      gameEvents.emit('accelerator:life_lost', { deathPos: { x: 200, y: 400 } });
    });

    expect(screen.getByTestId('accelerator-gameover-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('summary-max-z')).toHaveTextContent('Z = 2');
    expect(screen.getByTestId('summary-rooms')).toHaveTextContent('1');
    expect(screen.getByTestId('accelerator-new-record')).toBeInTheDocument();

    // Check zero forbidden emojis on gameover screen
    const summaryText = screen.getByTestId('accelerator-gameover-overlay').textContent ?? '';
    for (const emoji of FORBIDDEN_EMOJIS) {
      expect(summaryText.includes(emoji)).toBe(false);
    }

    // Copy summary
    fireEvent.click(screen.getByTestId('accelerator-copy-summary'));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('PARTICLE ACCELERATOR');

    // Start new run
    fireEvent.click(screen.getByTestId('accelerator-new-run'));
    expect(screen.queryByTestId('accelerator-gameover-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('accelerator-z-badge')).toHaveTextContent('Z = 1');
  });

  it('navigates back to /modes from HUD exit button', () => {
    const manager = new AcceleratorRunManager(7);
    renderAccelerator(manager);

    fireEvent.click(screen.getByTestId('accelerator-exit-btn'));
    expect(screen.getByText('Modes Hub Page')).toBeInTheDocument();
  });
});
