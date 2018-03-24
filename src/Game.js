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

    // with Cordova with need to wait that the device is ready so we will call the Boot state in another file
    if (!window.cordova) {
      this.state.start('Boot');
    }
    if (window.cordova) {
      var app = {
        initialize: function() {
          document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
        },

        // deviceready Event Handler
        //
        onDeviceReady: function() {
          this.receivedEvent('deviceready');

          // When the device is ready, start Phaser Boot state.
          window.game.state.start('Boot');
        },

        receivedEvent: function(id) {
          console.log('Received Event: ' + id);
        }
      };

      app.initialize();
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
