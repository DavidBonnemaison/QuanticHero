import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import styles from './App.module.css';
import Game from './Game';
import Explanation from './components/Explanation';
import LevelFinished from './components/LevelFinished';
import Levels from './components/LevelSelection';
import Menu from './components/Menu';
import { setNavigator } from './shims/navigation';
import { useGameStore } from './store';
import { decodeLevelFromUrl } from './tools/levelCodec';

const Editor = React.lazy(() => import('./components/Editor'));

const NavigationSync: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigator(navigate);
    return () => setNavigator(null);
  }, [navigate]);
  return null;
};

const SharedLevelSync: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('custom=') || search.includes('custom=')) {
        const decoded = decodeLevelFromUrl(hash || search);
        if (decoded) {
          useGameStore.getState().setSharedLevel(decoded);
          if (window.location.pathname !== '/game') {
            navigate('/game');
          }
        }
      }
    }
  }, [navigate]);
  return null;
};

export const App: React.FC = () => {
  return (
    <div className={styles.container}>
      <BrowserRouter>
        <NavigationSync />
        <SharedLevelSync />
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/levels" element={<Levels />} />
          <Route path="/game" element={<Game />} />
          <Route path="/done" element={<LevelFinished />} />
          <Route path="/explanation" element={<Explanation />} />
          <Route
            path="/editor"
            element={
              <React.Suspense
                fallback={
                  <div style={{ color: 'white', textAlign: 'center', padding: 50 }}>
                    Loading Editor...
                  </div>
                }
              >
                <Editor />
              </React.Suspense>
            }
          />
          <Route path="*" element={<Menu />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;
