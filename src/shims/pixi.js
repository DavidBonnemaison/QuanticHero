import 'phaser-ce/build/custom/pixi.js';

if (typeof window !== 'undefined' && !window.PIXI && typeof PIXI !== 'undefined') {
  window.PIXI = PIXI;
}

export default (typeof window !== 'undefined' ? window.PIXI : undefined);
