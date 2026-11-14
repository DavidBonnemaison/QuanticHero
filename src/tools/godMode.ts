const GOD_MODE_KEY = 'qtmhro_god_mode';

/**
 * Checks whether Tester God Mode is active via `?god=1` / `?god=true` query parameter
 * (persisted in sessionStorage across client-side route transitions; disable with `?god=0`).
 */
export function isGodMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const param = params.get('god');
    if (param === '1' || param === 'true') {
      sessionStorage.setItem(GOD_MODE_KEY, '1');
      return true;
    }
    if (param === '0' || param === 'false') {
      sessionStorage.removeItem(GOD_MODE_KEY);
      return false;
    }
    return sessionStorage.getItem(GOD_MODE_KEY) === '1';
  } catch {
    return false;
  }
}
