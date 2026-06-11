import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the production service worker (injected by vite-plugin-pwa).
 * In dev, the plugin can enable SW when `devOptions.enabled` is set.
 */
export function registerPwaServiceWorker() {
  if (!import.meta.env.PROD) return;

  registerSW({
    immediate: true,
    onOfflineReady() {
      // App shell cached; no UI prompt — installability is the main goal.
    },
  });
}
