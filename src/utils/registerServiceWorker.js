/**
 * Register the PWA service worker after auth boot completes so OAuth return
 * navigations are not intercepted before getRedirectResult runs.
 */
export function registerClimbLabServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return Promise.resolve(null);
    }

    let scopePath = new URL('./', window.location.href).pathname;
    if (!scopePath.endsWith('/')) {
        scopePath += '/';
    }

    return navigator.serviceWorker.register(`${scopePath}sw.js`, { scope: scopePath }).catch((err) => {
        console.warn('[Climb Lab PWA] Service worker registration failed:', err);
        return null;
    });
}
