/**
 * Lazy-load Leaflet + default icon fix (Vite). Singleton — one network fetch per session.
 * @returns {Promise<import('leaflet')>}
 */
let leafletPromise = null;

export function loadLeaflet() {
    if (!leafletPromise) {
        leafletPromise = import('./leaflet-setup.js').then((mod) => mod.default);
    }
    return leafletPromise;
}
