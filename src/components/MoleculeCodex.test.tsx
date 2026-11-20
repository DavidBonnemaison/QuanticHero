import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SECRET_MOLECULES } from '../data/molecules';
import { MoleculeCodex } from './MoleculeCodex';

describe('MoleculeCodex component (Epic 03 Spec-02)', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <MoleculeCodex
        isOpen={false}
        onClose={vi.fn()}
        unlockedMolecules={[]}
        moleculeScores={{}}
        locale="en"
        onPlayMolecule={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders all 12 slots, Unlocked: 0 / 12 counter, and poetic hints without spoiling formulas for locked molecules', () => {
    render(
      <MoleculeCodex
        isOpen={true}
        onClose={vi.fn()}
        unlockedMolecules={[]}
        moleculeScores={{}}
        locale="en"
        onPlayMolecule={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('codex-unlocked-counter')).toHaveTextContent('Unlocked: 0 / 12');

    const grid = screen.getByTestId('codex-slots-grid');
    expect(grid.querySelectorAll('[data-unlocked="false"]')).toHaveLength(12);

    const h2oSlot = screen.getByTestId('codex-slot-H2O');
    expect(h2oSlot).toHaveAttribute('data-unlocked', 'false');
    expect(h2oSlot).toHaveTextContent('Period 1 + Oxygen — The liquid anomaly');
    expect(h2oSlot).not.toHaveTextContent('H₂O');
    expect(h2oSlot).not.toHaveTextContent('The Water Anomaly');

    for (const mol of SECRET_MOLECULES) {
      expect(screen.getByTestId(`codex-slot-${mol.id}`)).toHaveTextContent(mol.hint);
    }
  });

  it('renders discovered molecules with formula, name, best time, isotope medal, and working Play button', () => {
    const onPlayMolecule = vi.fn();
    render(
      <MoleculeCodex
        isOpen={true}
        onClose={vi.fn()}
        unlockedMolecules={['H2O', 'NaCl']}
        moleculeScores={{
          H2O: { best: 9450, last: 9450, medal: 'gold', bestJumps: 4 }
        }}
        locale="en"
        onPlayMolecule={onPlayMolecule}
      />
    );

    expect(screen.getByTestId('codex-unlocked-counter')).toHaveTextContent('Unlocked: 2 / 12');

    const h2oSlot = screen.getByTestId('codex-slot-H2O');
    expect(h2oSlot).toHaveAttribute('data-unlocked', 'true');
    expect(h2oSlot).toHaveTextContent('H₂O');
    expect(h2oSlot).toHaveTextContent('The Water Anomaly');
    expect(h2oSlot).toHaveTextContent('00:09:45');
    expect(h2oSlot).toHaveTextContent('GOLD');

    const playBtn = within(h2oSlot).getByRole('button', { name: /play/i });
    fireEvent.click(playBtn);
    expect(onPlayMolecule).toHaveBeenCalledWith('H2O');

    const naclSlot = screen.getByTestId('codex-slot-NaCl');
    expect(naclSlot).toHaveAttribute('data-unlocked', 'true');
    expect(naclSlot).toHaveTextContent('Ionic Crystal Lattice');
    expect(naclSlot).toHaveTextContent('--:--:--');
  });

  it('supports French localization and closes via Close button, Escape key, and backdrop click', () => {
    const onClose = vi.fn();
    render(
      <MoleculeCodex
        isOpen={true}
        onClose={onClose}
        unlockedMolecules={['H2O']}
        moleculeScores={{
          H2O: { best: 11200, last: 11200, medal: 'silver' }
        }}
        locale="fr"
        onPlayMolecule={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /codex moléculaire/i })).toBeInTheDocument();
    expect(screen.getByTestId('codex-unlocked-counter')).toHaveTextContent('Débloquées : 1 / 12');
    expect(screen.getByTestId('codex-slot-NaCl')).toHaveTextContent(
      'Alcalin de période 3 + Halogène — Cristal de phase cubique'
    );
    expect(screen.getByTestId('codex-slot-H2O')).toHaveTextContent('ARGENT');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /fermer/i }));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByTestId('molecule-codex-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
