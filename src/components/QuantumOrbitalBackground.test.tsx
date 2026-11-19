import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QuantumOrbitalBackground from './QuantumOrbitalBackground';

describe('QuantumOrbitalBackground (Spec-02)', () => {
  it('renders a non-interactive canvas element without throwing in jsdom', () => {
    const { container, unmount } = render(<QuantumOrbitalBackground />);
    const canvas = screen.getByTestId('quantum-orbital-bg');

    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas).toHaveStyle({ pointerEvents: 'none' });
    expect(container.querySelectorAll('.Molecule')).toHaveLength(0);

    unmount();
  });

  it('cleans up animation frame and resize listener on unmount', () => {
    const mockCtx = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1
    };

    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
    const cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<QuantumOrbitalBackground />);
    expect(rafSpy).toHaveBeenCalled();

    unmount();
    expect(cafSpy).toHaveBeenCalledWith(42);
    expect(removeListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    getContextSpy.mockRestore();
    rafSpy.mockRestore();
    cafSpy.mockRestore();
    removeListenerSpy.mockRestore();
  });
});
