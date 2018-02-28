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
    const docElement = document.documentElement;
    const width =
      docElement.clientWidth > config.gameWidth ? config.gameWidth : docElement.clientWidth;
    const height =
      docElement.clientHeight > config.gameHeight ? config.gameHeight : docElement.clientHeight;

    super(width, height, Phaser.AUTO, 'game', null);

    this.state.add('Boot', BootState, false);
    this.state.add('Splash', SplashState, false);
    this.state.add('Game', GameState, false);
    this.state.add('Tuto', TutoState, false);

    // with Cordova with need to wait that the device is ready so we will call the Boot state in another file
    if (!window.cordova) {
      this.state.start('Boot');
      console.log('game ready');
    }
  }
}

export default class GameContainer extends React.Component {
  componentDidMount() {
    return new Game();
  }
  render() {
    return <div id="game" />;
  }
}
