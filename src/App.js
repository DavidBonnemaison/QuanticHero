import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import store from './store';
import Menu from './components/Menu';

class App extends React.Component {
  render() {
    return (
      <div style={{ color: 'white' }}>
        It works !
        <Menu />
      </div>
    );
  }
}

render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('app')
);
