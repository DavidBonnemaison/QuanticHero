import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  });

  // Mock document.fonts
  if (typeof document !== 'undefined') {
    (document as any).fonts = {
      ready: Promise.resolve(),
      add: () => {},
      check: () => true,
      load: () => Promise.resolve([]),
      delete: () => {},
      clear: () => {},
      forEach: () => {},
      has: () => false
    };
  }

  // Mock HTMLCanvasElement.prototype.getContext
  if (typeof HTMLCanvasElement !== 'undefined') {
    const mockCtx2d = {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
      globalCompositeOperation: 'source-over'
    };
    HTMLCanvasElement.prototype.getContext = ((type: string) => {
      if (type === '2d') return mockCtx2d;
      return null;
    }) as any;
  }
}
