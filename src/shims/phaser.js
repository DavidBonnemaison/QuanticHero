import './pixi.js';
import './p2.js';
import 'phaser-ce/build/custom/phaser-split.js';

if (typeof window !== 'undefined' && !window.Phaser && typeof Phaser !== 'undefined') {
  window.Phaser = Phaser;
}

export default (typeof window !== 'undefined' ? window.Phaser : undefined);
