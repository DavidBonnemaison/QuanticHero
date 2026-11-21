import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import styles from './App.module.css';
import Game from './Game';
import AcceleratorMode from './components/AcceleratorMode';
import Explanation from './components/Explanation';
import LevelFinished from './components/LevelFinished';
import Levels from './components/LevelSelection';
import Menu from './components/Menu';
import QuantumModesHub from './components/QuantumModesHub';
import { getLevelMetadata, loadLevel } from './data/levels';
import { generateDailyIsotope } from './services/DailyIsotopeService';
import { setNavigator } from './shims/navigation';
import { useGameStore } from './store';
import { decodeDuelFromUrl, decodeLevelFromUrl } from './tools/levelCodec';

const Editor = React.lazy(() => import('./components/Editor'));

const DEFAULT_ATOM_HUE = '#00e5ff';
const DEFAULT_ATOM_ANTI_HUE = '#ec4899';

const AtomThemeSync: React.FC = () => {
  const currentLevel = useGameStore((state) => state.currentLevel);
  const sharedLevel = useGameStore((state) => state.sharedLevel);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const meta = sharedLevel ? null : getLevelMetadata(currentLevel);
    const hue = sharedLevel?.hue || meta?.hue || DEFAULT_ATOM_HUE;
    const antiHue = sharedLevel?.antiHue || meta?.antiHue || DEFAULT_ATOM_ANTI_HUE;
    document.documentElement.style.setProperty('--atom-hue', hue);
    document.documentElement.style.setProperty('--atom-anti-hue', antiHue);
  }, [currentLevel, sharedLevel]);

  return null;
};

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

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const reducedEffects = useGameStore((state) => state.reducedEffects);

  return (
    <div
      key={location.pathname}
      data-testid="screen-transition"
      className={reducedEffects ? styles.screenStatic : styles.screenTransition}
    >
      <Routes location={location}>
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
              fallback={<div className={styles.loadingFallback}>Loading Editor...</div>}
            >
              <Editor />
            </React.Suspense>
          }
        />
        <Route path="*" element={<Menu />} />
      </Routes>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <div className={styles.container}>
      <BrowserRouter>
        <AtomThemeSync />
        <NavigationSync />
        <SharedLevelSync />
        <AnimatedRoutes />
      </BrowserRouter>
    </div>
  );
};

export default App;
