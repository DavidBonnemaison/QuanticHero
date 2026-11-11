import type React from 'react';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';
import styled from 'styled-components';
import Game from './Game';
import Editor from './components/Editor';
import Explanation from './components/Explanation';
import LevelFinished from './components/LevelFinished';
import Levels from './components/LevelSelection';
import Menu from './components/Menu';
import { setNavigator } from './shims/navigation';
import { persistor, default as store } from './store';

const NavigationSync: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigator(navigate);
    return () => setNavigator(null);
  }, [navigate]);
  return null;
};

const Container = styled.div`
  max-width: 500px;
  min-height: 100vh;
  margin: 0 auto;
  position: relative;
  display: flex;
  flex-direction: column;
`;

export const App: React.FC = () => {
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
};

export default App;
