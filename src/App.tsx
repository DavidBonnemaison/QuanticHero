import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import styles from './App.module.css';
import Game from './Game';
import AcceleratorMode from './components/AcceleratorMode';
import Explanation from './components/Explanation';
import LevelFinished from './components/LevelFinished';
import Levels from './components/LevelSelection';
import Menu from './components/Menu';
import QuantumModesHub from './components/QuantumModesHub';
import { loadLevel } from './data/levels';
import { generateDailyIsotope } from './services/DailyIsotopeService';
import { setNavigator } from './shims/navigation';
import { useGameStore } from './store';
import { decodeDuelFromUrl, decodeLevelFromUrl } from './tools/levelCodec';

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
    if (typeof window === 'undefined') return;

    const syncFromLocation = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('duel=') || search.includes('duel=')) {
        const duel = decodeDuelFromUrl(hash.includes('duel=') ? hash : search);
        if (duel) {
          const store = useGameStore.getState();
          store.setActiveDuel(duel);
          if (duel.kind === 'campaign') {
            store.updateCurrentLevel(duel.levelId);
            store.setSharedLevel(null);
            void loadLevel(duel.levelId);
          } else if (duel.kind === 'daily') {
            void generateDailyIsotope(duel.dateKey).then((dailyLevel) => {
              useGameStore.getState().setSharedLevel(dailyLevel);
            });
          } else {
            store.setSharedLevel(duel.level);
          }
          if (window.location.pathname !== '/game') {
            const suffix = hash.includes('duel=') ? hash : search;
            navigate(`/game${suffix}`, { replace: true });
          }
          return;
        }
      }

      if (hash.includes('custom=') || search.includes('custom=')) {
        const decoded = decodeLevelFromUrl(hash.includes('custom=') ? hash : search);
        if (decoded) {
          const store = useGameStore.getState();
          store.setActiveDuel(null);
          store.setSharedLevel(decoded);
          if (window.location.pathname !== '/game') {
            const suffix = hash.includes('custom=') ? hash : search;
            navigate(`/game${suffix}`, { replace: true });
          }
        }
      }
    };

    syncFromLocation();
    window.addEventListener('hashchange', syncFromLocation);
    return () => window.removeEventListener('hashchange', syncFromLocation);
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
          <Route path="/modes" element={<QuantumModesHub />} />
          <Route path="/accelerator" element={<AcceleratorMode />} />
          <Route path="/game" element={<Game />} />
          <Route path="/game/molecule/:moleculeId" element={<Game />} />
          <Route path="/game/chrono/:chronoId" element={<Game />} />
          <Route path="/game/schrodinger/:schrodingerId" element={<Game />} />
          <Route path="/daily" element={<Game isDaily />} />
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
