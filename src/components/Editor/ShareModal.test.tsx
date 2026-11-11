import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LevelData } from '../../types';
import ShareModal from './ShareModal';

const mockLevel: LevelData = {
  id: 'custom-42',
  symbol: 'Q',
  atom: 'Quark',
  uncertainty: 3,
  width: 1000,
  height: 1000,
  hue: '#070737',
  antiHue: '#c56805',
  player: { position: { x: 100, y: 900 } },
  door: { x: 800, y: 800 },
  platforms: [{ x: 0, y: 950, width: 1000, height: 50 }],
  particles: [{ x: 300, y: 800, type: 'speed' }],
  spikes: []
};

describe('ShareModal component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ShareModal isOpen={false} onClose={vi.fn()} level={mockLevel} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with level info and QR code image when isOpen is true', async () => {
    render(<ShareModal isOpen={true} onClose={vi.fn()} level={mockLevel} />);

    expect(screen.getByRole('heading', { level: 2, name: /quantum challenge/i })).toBeInTheDocument();
    expect(screen.getByText(/Quark/)).toBeInTheDocument();

    // QR code image is generated asynchronously
    await waitFor(() => {
      const img = screen.getByTestId('qr-code-image');
      expect(img).toBeInTheDocument();
      expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    });

    const input = screen.getByLabelText('Level URL') as HTMLInputElement;
    expect(input.value).toContain('#custom=');
  });

  it('copies link to clipboard and displays feedback toast on click', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock
      },
      configurable: true
    });

    render(<ShareModal isOpen={true} onClose={vi.fn()} level={mockLevel} />);

    const copyBtn = screen.getByRole('button', { name: /copy link/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
    expect(await screen.findByText(/link copied to clipboard/i)).toBeInTheDocument();
  });

  it('triggers onPlay when "Play Challenge" is clicked', () => {
    const onPlayMock = vi.fn();
    render(<ShareModal isOpen={true} onClose={vi.fn()} level={mockLevel} onPlay={onPlayMock} />);

    const playBtn = screen.getByRole('button', { name: /play challenge/i });
    fireEvent.click(playBtn);
    expect(onPlayMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when top close button is clicked', () => {
    const onCloseMock = vi.fn();
    render(<ShareModal isOpen={true} onClose={onCloseMock} level={mockLevel} />);

    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when bottom cancel button is clicked', () => {
    const onCloseMock = vi.fn();
    render(<ShareModal isOpen={true} onClose={onCloseMock} level={mockLevel} />);

    const cancelButtons = screen.getAllByRole('button', { name: /close/i });
    // Click the bottom action button
    fireEvent.click(cancelButtons[1]);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onCloseMock = vi.fn();
    render(<ShareModal isOpen={true} onClose={onCloseMock} level={mockLevel} />);

    const backdrop = screen.getByTestId('share-modal-backdrop');
    fireEvent.click(backdrop);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onCloseMock = vi.fn();
    render(<ShareModal isOpen={true} onClose={onCloseMock} level={mockLevel} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
