/// <reference types="vite/client" />

declare module 'pixi' {
  const PIXI: any;
  export default PIXI;
}

declare module 'p2' {
  const p2: any;
  export default p2;
}

declare module 'phaser' {
  const Phaser: any;
  export default Phaser;
}

declare module 'randomcolor' {
  export default function randomColor(options?: Record<string, unknown>): string;
}
