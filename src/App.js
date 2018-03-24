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
import Editor from './components/Editor';
import s from 'styled-components';
import config from './config';

const history = syncHistoryWithStore(hashHistory, store);
const Container = s.div`
  max-width: ${config.width};
  max-height: ${config.height};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

render(
  <Container>
    <Provider store={store}>
      <PersistGate persistor={persistor} loading={null}>
        <Router history={history}>
          <Route exact path="/" component={Menu} />
          <Route exact path="/levels" component={Levels} />
          <Route exact path="/game" component={Game} />
          <Route exact path="/done" component={LevelFinished} />
          <Route exact path="/explanation" component={Explanation} />
          <Route exact path="/editor" component={Editor} />
        </Router>
      </PersistGate>
    </Provider>
  </Container>,
  document.getElementById('app')
);
