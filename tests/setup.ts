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
    HTMLCanvasElement.prototype.getContext = (() => null) as any;
  }
}
