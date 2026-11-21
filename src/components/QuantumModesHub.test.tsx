import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { CHRONO_LOOP_LEVELS } from '../data/chronoLoopLevels';
import { useGameStore } from '../store';
import QuantumModesHub from './QuantumModesHub';

const FORBIDDEN_EMOJIS = ['🔊', '🔇', '📳', '📴', '✨', '⚡', '👻', '📤', '✏️', '📱'];

describe('QuantumModesHub component', () => {
  beforeEach(() => {
    useGameStore.setState({
      locale: 'en',
      customModeScores: {},
      sharedLevel: null,
      activeDuel: null
    });
  });

  const renderHub = () =>
    render(
      <MemoryRouter initialEntries={['/modes']}>
        <Routes>
          <Route path="/" element={<div>Menu Page</div>} />
          <Route path="/modes" element={<QuantumModesHub />} />
          <Route path="/game/chrono/:chronoId" element={<div>Chrono Game Page</div>} />
          <Route path="/accelerator" element={<div>Accelerator Page</div>} />
        </Routes>
      </MemoryRouter>
    );

  it('renders all 3 quantum mode sections and all 8 Chrono-Loop levels with zero forbidden emojis', () => {
    renderHub();

    expect(screen.getByRole('heading', { level: 1, name: /quantum modes/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /chrono-loop/i })).toBeInTheDocument();
    expect(screen.getByTestId('schrodinger-mode-card')).toBeInTheDocument();
    expect(screen.getByTestId('accelerator-mode-card')).toBeInTheDocument();

    for (const entry of CHRONO_LOOP_LEVELS) {
      expect(screen.getByTestId(`chrono-card-${entry.id}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('chrono-cleared-counter')).toHaveTextContent('0 / 8 CLEARED');

    const fullText = screen.getByTestId('quantum-modes-hub').textContent ?? '';
    for (const emoji of FORBIDDEN_EMOJIS) {
      expect(fullText.includes(emoji)).toBe(false);
    }
  });

  it('displays cleared progress and best time from customModeScores', () => {
    useGameStore.setState({
      customModeScores: {
        'chrono-1': { best: 9420, last: 9420, medal: 'gold' },
        'chrono-2': { best: 12100, last: 12100, medal: 'silver' }
      }
    });

    renderHub();
    expect(screen.getByTestId('chrono-cleared-counter')).toHaveTextContent('2 / 8 CLEARED');
    expect(screen.getByTestId('chrono-card-chrono-1')).toHaveTextContent(/BEST/i);
  });

  it('loads Chrono-Loop level into sharedLevel and navigates to /game/chrono/:id on card click', () => {
    renderHub();

    fireEvent.click(screen.getByTestId('chrono-card-chrono-3'));

    expect(useGameStore.getState().sharedLevel?.id).toBe('chrono-3');
    expect(screen.getByText('Chrono Game Page')).toBeInTheDocument();
  });

  it('navigates back to menu and links to /accelerator', () => {
    const { unmount } = renderHub();
    fireEvent.click(screen.getByTestId('modes-back-button'));
    expect(screen.getByText('Menu Page')).toBeInTheDocument();
    unmount();

    renderHub();
    fireEvent.click(screen.getByTestId('accelerator-launch-button'));
    expect(screen.getByText('Accelerator Page')).toBeInTheDocument();
  });

  it('supports French localization', () => {
    useGameStore.setState({ locale: 'fr' });
    renderHub();
    expect(
      screen.getByRole('heading', { level: 1, name: /modes quantiques/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('chrono-cleared-counter')).toHaveTextContent('0 / 8 RÉSOLUS');
  });
});
