import { thunk } from 'redux-thunk';
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import { routerReducer, routerMiddleware } from './shims/navigation.js';
import menu from './reducers/menu';
import game from './reducers/game';
import score from './reducers/score';
import levels from './reducers/levels';

const reducers = combineReducers({ menu, game, score, levels, routing: routerReducer });
const middleware = routerMiddleware();

const storage = {
  getItem: (key) => Promise.resolve(typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null),
  setItem: (key, value) => Promise.resolve(typeof window !== 'undefined' && window.localStorage ? window.localStorage.setItem(key, value) : undefined),
  removeItem: (key) => Promise.resolve(typeof window !== 'undefined' && window.localStorage ? window.localStorage.removeItem(key) : undefined)
};

const persistConfig = {
  key: 'qtmhro',
  storage,
  blacklist: ['routing']
};

const persistedReducer = persistReducer(persistConfig, reducers);

const composeEnhancers =
  (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;

export function initStore(initialState) {
  return createStore(
    persistedReducer,
    initialState,
    composeEnhancers(applyMiddleware(thunk, middleware))
  );
}

const store = initStore();

export const persistor = persistStore(store);

export default store;
