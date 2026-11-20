export type NavigatorFn = (path: string) => void;

export interface NavigationAction {
  type: 'ROUTER_NAVIGATE';
  payload: string;
}

let currentNavigator: NavigatorFn | null = null;

export const setNavigator = (nav: NavigatorFn | null): void => {
  currentNavigator = nav;
};

export const push = (path: string): NavigationAction => {
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
