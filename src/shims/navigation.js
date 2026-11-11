let currentNavigator = null;

export const setNavigator = (nav) => {
  currentNavigator = nav;
};

export const push = (path) => ({
  type: 'ROUTER_NAVIGATE',
  payload: path
});

export const routerReducer = (state = { location: null }, action) => {
  if (action && action.type === 'ROUTER_NAVIGATE') {
    return { ...state, location: action.payload };
  }
  return state;
};

export const routerMiddleware = () => (next) => (action) => {
  if (action && action.type === 'ROUTER_NAVIGATE' && typeof action.payload === 'string') {
    if (currentNavigator) {
      currentNavigator(action.payload);
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', action.payload);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }
  return next(action);
};
