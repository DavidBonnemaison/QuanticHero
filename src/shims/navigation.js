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
