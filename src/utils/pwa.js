/** True when the app runs as an installed PWA (not inside the browser tab UI). */
export function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  // Legacy iOS Safari
  if (window.navigator.standalone === true) return true;
  return false;
}

/** Rough mobile viewport check for install hints. */
export function isLikelyMobileDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
}
