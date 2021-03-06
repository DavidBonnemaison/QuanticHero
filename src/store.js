import thunkMiddleware from 'redux-thunk';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import { hashHistory } from 'react-router';
import storage from 'redux-persist/lib/storage';
import { routerReducer, routerMiddleware } from 'react-router-redux';
import menu from './reducers/menu';
import game from './reducers/game';
import score from './reducers/score';
import levels from './reducers/levels';

const reducers = combineReducers({ menu, game, score, levels, routing: routerReducer });
const middleware = routerMiddleware(hashHistory);

const persistConfig = {
  key: 'qtmhro',
  storage,
  blacklist: ['routing']
};

const persistedReducer = persistReducer(persistConfig, reducers);

export function initStore(initialState) {
  return applyMiddleware(thunkMiddleware, middleware)(createStore)(
    persistedReducer,
    initialState,
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
  );
}

const store = initStore();

export const persistor = persistStore(store);

export default store;
