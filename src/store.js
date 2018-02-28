import thunkMiddleware from 'redux-thunk';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { routerReducer, routerMiddleware } from 'react-router-redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import createHistory from 'history/createBrowserHistory';
import menu from './reducers/menu';
import game from './reducers/game';

export const history = createHistory();
const middleware = routerMiddleware(history);

const reducers = combineReducers({ menu, game, routing: routerReducer });

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
