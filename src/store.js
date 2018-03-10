import thunkMiddleware from 'redux-thunk';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import { hashHistory } from 'react-router';
import storage from 'redux-persist/lib/storage';
import { routerReducer, routerMiddleware } from 'react-router-redux';
import menu from './reducers/menu';
import game from './reducers/game';
import score from './reducers/score';

const reducers = combineReducers({ menu, game, score, routing: routerReducer });
const middleware = routerMiddleware(hashHistory);

const persistConfig = {
  key: 'root',
  storage
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
