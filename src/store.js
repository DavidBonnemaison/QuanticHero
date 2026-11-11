import { thunk } from 'redux-thunk';
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { routerReducer, routerMiddleware } from './shims/navigation.js';
import menu from './reducers/menu';
import game from './reducers/game';
import score from './reducers/score';
import levels from './reducers/levels';

const reducers = combineReducers({ menu, game, score, levels, routing: routerReducer });
const middleware = routerMiddleware();

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
