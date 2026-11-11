import 'pixi';
import 'p2';
import Phaser from 'phaser';
import type React from 'react';
import { useEffect } from 'react';
import config from './config';
import BootState from './states/Boot';
import GameState from './states/Game';
import SplashState from './states/Splash';
import TutoState from './states/Tuto';

declare global {
  interface Window {
    game: any;
  }
}

class PhaserGameInstance extends (Phaser.Game as new (...args: any[]) => any) {
  constructor() {
    super(config.width, config.height, Phaser.CANVAS, 'game', null);

    this.state.add('Boot', BootState, false);
    this.state.add('Splash', SplashState, false);
    this.state.add('Game', GameState, false);
    this.state.add('Tuto', TutoState, false);

    this.state.start('Boot');
  }
}

export const GameContainer: React.FC = () => {
  useEffect(() => {
    const gameInstance = new PhaserGameInstance();
    window.game = gameInstance;

    return () => {
      if (window.game) {
        try {
          window.game.destroy();
        } catch {
          // game may have already been destroyed on level completion
        }
        window.game = null;
      }
    };
  }, []);

  return <div id="game" />;
};

export default GameContainer;
