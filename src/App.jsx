import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, default as store } from './store';
import { setNavigator } from './shims/navigation';
import Menu from './components/Menu';
import Levels from './components/LevelSelection';
import Game from './Game';
import LevelFinished from './components/LevelFinished';
import Explanation from './components/Explanation';
import Editor from './components/Editor';
import styled from 'styled-components';
import config from './config';

function NavigationSync() {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigator(navigate);
    return () => setNavigator(null);
  }, [navigate]);
  return null;
}

const Container = styled.div`
  max-width: ${typeof config.width === 'number' ? `${config.width}px` : config.width};
  max-height: ${typeof config.height === 'number' ? `${config.height}px` : config.height};
  min-height: 100vh;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

export default function App() {
  return (
    <Container>
      <Provider store={store}>
        <PersistGate persistor={persistor} loading={null}>
          <BrowserRouter>
            <NavigationSync />
            <Routes>
              <Route path="/" element={<Menu />} />
              <Route path="/levels" element={<Levels />} />
              <Route path="/game" element={<Game />} />
              <Route path="/done" element={<LevelFinished />} />
              <Route path="/explanation" element={<Explanation />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="*" element={<Menu />} />
            </Routes>
          </BrowserRouter>
        </PersistGate>
      </Provider>
    </Container>
  );
}
