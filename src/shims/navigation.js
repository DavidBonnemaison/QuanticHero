let currentNavigator = null;

export const setNavigator = (nav) => {
  currentNavigator = nav;
};

export const push = (path) => {
  if (currentNavigator) {
    currentNavigator(path);
  } else if (typeof window !== 'undefined') {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  return {
    type: 'ROUTER_NAVIGATE',
    payload: path
  };
};

export const routerReducer = (state, action) => {
  if (action && action.type === 'ROUTER_NAVIGATE') {
    return { ...state, location: action.payload };
  }
  return state;
};

export const routerMiddleware = () => (_store) => (next) => (action) => {
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
