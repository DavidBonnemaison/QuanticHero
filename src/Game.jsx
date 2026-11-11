import 'pixi';
import 'p2';
import Phaser from 'phaser';
import React from 'react';
import config from './config';
import BootState from './states/Boot';
import SplashState from './states/Splash';
import GameState from './states/Game';
import TutoState from './states/Tuto';

class Game extends Phaser.Game {
  constructor() {
    super(config.width, config.height, Phaser.CANVAS, 'game', null);

    this.state.add('Boot', BootState, false);
    this.state.add('Splash', SplashState, false);
    this.state.add('Game', GameState, false);
    this.state.add('Tuto', TutoState, false);

    this.state.start('Boot');
  }
}

export default class GameContainer extends React.Component {
  componentDidMount() {
    this.game = new Game();
    window.game = this.game;
  }

  componentWillUnmount() {
    if (this.game) {
      try {
        this.game.destroy();
      } catch (e) {
        // game may have already been destroyed on level completion
      }
    }
    window.game = null;
  }

  render() {
    return <div id="game" />;
  }
}
