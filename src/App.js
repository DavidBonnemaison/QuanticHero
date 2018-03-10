import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { Router, Route, hashHistory } from 'react-router';
import { syncHistoryWithStore } from 'react-router-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, default as store } from './store';
import Menu from './components/Menu';
import Levels from './components/LevelSelection';
import Game from './Game';
import LevelFinished from './components/LevelFinished';
import Explanation from './components/Explanation';

const history = syncHistoryWithStore(hashHistory, store);

render(
  <div>
    <Provider store={store}>
      <PersistGate persistor={persistor} loading={null}>
        <Router history={history}>
          <Route exact path="/" component={Menu} />
          <Route exact path="/levels" component={Levels} />
          <Route exact path="/game" component={Game} />
          <Route exact path="/done" component={LevelFinished} />
          <Route exact path="/explanation" component={Explanation} />
        </Router>
      </PersistGate>
    </Provider>
  </div>,
  document.getElementById('app')
);
