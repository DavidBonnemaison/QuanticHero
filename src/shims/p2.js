import p2Module from 'phaser-ce/build/custom/p2.js';

if (typeof window !== 'undefined') {
  if (!window.p2 && p2Module) {
    window.p2 = p2Module;
  }
}

export default (typeof window !== 'undefined' ? window.p2 || p2Module : p2Module);
