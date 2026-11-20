export const DESKTOP_MAX_WIDTH = 1280;
export const DESKTOP_MAX_HEIGHT = 800;
export const MOBILE_PORTRAIT_MAX_WIDTH = 768;

export interface ViewportSize {
  width: number;
  height: number;
  isMobilePortrait: boolean;
}

export interface GameConfigOptions {
  width: number;
  height: number;
  maxDesktopWidth: number;
  maxDesktopHeight: number;
  localStorageName: string;
}

/**
 * Computes the adaptive viewport dimensions for the Phaser canvas:
 * - Mobile portrait (width <= 768 and height >= width): fills 100vw x 100dvh.
 * - Desktop / tablet / landscape: fills up to min(windowWidth, 1280) x min(windowHeight, 800).
 */
export function computeViewportSize(windowWidth: number, windowHeight: number): ViewportSize {
  const safeWidth = Math.max(1, Math.round(windowWidth || DESKTOP_MAX_WIDTH));
  const safeHeight = Math.max(1, Math.round(windowHeight || DESKTOP_MAX_HEIGHT));
  const isMobilePortrait = safeWidth <= MOBILE_PORTRAIT_MAX_WIDTH && safeHeight >= safeWidth;

  if (isMobilePortrait) {
    return {
      width: safeWidth,
      height: safeHeight,
      isMobilePortrait: true
    };
  }

  return {
    width: Math.min(safeWidth, DESKTOP_MAX_WIDTH),
    height: Math.min(safeHeight, DESKTOP_MAX_HEIGHT),
    isMobilePortrait: false
  };
}

export function getInitialViewportSize(): ViewportSize {
  if (typeof window === 'undefined') {
    return {
      width: DESKTOP_MAX_WIDTH,
      height: DESKTOP_MAX_HEIGHT,
      isMobilePortrait: false
    };
  }

  const docElement = typeof document !== 'undefined' ? document.documentElement : null;
  const rawWidth = window.innerWidth || docElement?.clientWidth || DESKTOP_MAX_WIDTH;
  const rawHeight = window.innerHeight || docElement?.clientHeight || DESKTOP_MAX_HEIGHT;
  return computeViewportSize(rawWidth, rawHeight);
}

const initialViewport = getInitialViewportSize();

const config: GameConfigOptions = {
  width: initialViewport.width,
  height: initialViewport.height,
  maxDesktopWidth: DESKTOP_MAX_WIDTH,
  maxDesktopHeight: DESKTOP_MAX_HEIGHT,
  localStorageName: 'quanticherov1'
};

export default config;
