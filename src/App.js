import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { Route, Switch } from 'react-router';
import { Link } from 'react-router-dom';
import { ConnectedRouter } from 'react-router-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { history, persistor, default as store } from './store';
import Menu from './components/Menu';
import Levels from './components/LevelSelection';
import Game from './Game';
import LevelFinished from './components/LevelFinished';
import Explanation from './components/Explanation';

render(
  <div>
    <Provider store={store}>
      <PersistGate persistor={persistor} loading={null}>
        <ConnectedRouter history={history}>
          <Switch>
            <Route exact path="/" component={Menu} />
            <Route exact path="/levels" component={Levels} />
            <Route exact path="/game" component={Game} />
            <Route exact path="/done" component={LevelFinished} />
          </Switch>
        </ConnectedRouter>
      </PersistGate>
    </Provider>
  </div>,
  document.getElementById('app')
);
