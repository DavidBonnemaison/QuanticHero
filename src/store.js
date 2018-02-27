import thunkMiddleware from 'redux-thunk';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import menu from './reducers/menu';

const reducers = combineReducers({ menu });

export function initStore(initialState) {
  return applyMiddleware(thunkMiddleware)(createStore)(
    reducers,
    initialState,
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
  );
}

export default initStore();
