const PIXI =
  typeof window !== 'undefined'
    ? window.PIXI
    : typeof globalThis !== 'undefined'
      ? globalThis.PIXI
      : undefined;

export default PIXI;
