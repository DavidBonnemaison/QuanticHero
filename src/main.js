import Game from './Game';

window.game = new Game();

if (window.cordova) {
  var app = {
    initialize: function() {
      document.addEventListener(
        'deviceready',
        this.onDeviceReady.bind(this),
        false
      );
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
