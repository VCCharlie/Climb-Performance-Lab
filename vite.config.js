import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'
import packageJson from './package.json' // Zorg dat dit bestand bestaat

// 1. Probeer de laatste Git Commit Hash op te halen
let commitHash = 'dev';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (error) {
  console.warn('Git commit hash kon niet worden opgehaald, fallback naar "dev"');
}

// 2. Stel de versie samen (bv. "v0.1.0-a1b2c")
const versionString = `v${packageJson.version}-${commitHash}`;

const appBase = '/Climb-Performance-Lab/';
const buildTimestamp = new Date().toISOString();

function injectBuildMetadata() {
  return {
    name: 'inject-build-metadata',
    transformIndexHtml(html) {
      const metaBlock = [
        `<meta name="app-build-id" content="${versionString}" />`,
        `<meta name="app-build-timestamp" content="${buildTimestamp}" />`,
      ].join('\n    ');
      return html.replace('<head>', `<head>\n    ${metaBlock}`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    injectBuildMetadata(),
    VitePWA({
      registerType: 'autoUpdate',
      // SW registers in main.jsx after auth boot (see registerServiceWorker.js).
      injectRegister: false,
      scope: appBase,
      includeAssets: ['favicon.png', 'pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png', 'vite.svg'],
      manifest: {
        id: `${appBase}?source=pwa`,
        name: 'Climb Lab Pro',
        short_name: 'Climb Lab Pro',
        description: 'Cycling performance analysis for climbers — power, pacing, and training insights.',
        theme_color: '#1e2330',
        background_color: '#f0f2f5',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        start_url: appBase,
        scope: appBase,
        lang: 'en',
        prefer_related_applications: false,
        categories: ['sports', 'health', 'fitness'],
        icons: [
          {
            src: `${appBase}pwa-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${appBase}pwa-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${appBase}pwa-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // false = new SW waits until user taps "Reload now" (avoids automatic second page refresh on install).
        skipWaiting: false,
        clientsClaim: true,
        navigateFallback: `${appBase}index.html`,
        // Do not register a second handler for request.mode === 'navigate' — NavigationRoute
        // already serves index.html for SPA navigations; duplicating it caused Response.clone()
        // errors and broke Google redirect sign-in after OAuth return.
        // Bolt Phase 1.2: precache shell + first-load chunks only; lazy tabs load via runtime cache.
        globPatterns: [
          'index.html',
          'manifest.webmanifest',
          'favicon.png',
          'pwa-*.png',
          'vite.svg',
          'assets/index-*.js',
          'assets/react-vendor-*.js',
          'assets/firebase-*.js',
          'assets/lucide-*.js',
          'assets/index-*.css',
        ],
        globIgnores: [
          '**/climbs_extended-*.js',
          '**/xlsx-*.js',
          '**/recharts-*.js',
          '**/leaflet-*.js',
          '**/DataHub-*.js',
          '**/AICoach-*.js',
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => (
              request.destination === 'script'
              && url.pathname.includes('/assets/')
            ),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'cpl-lazy-chunks',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: ({ request, url }) => (
              request.destination === 'style'
              && url.pathname.includes('/assets/')
            ),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cpl-lazy-styles',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith('index.html'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'cpl-html-shell',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'tailwind-cdn',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: appBase,
  define: {
    // Globally available build identity for deploy recovery + header badge
    '__APP_VERSION__': JSON.stringify(versionString),
    '__APP_BUILD_TIMESTAMP__': JSON.stringify(buildTimestamp),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('firebase') || id.includes('@firebase')) {
            return 'firebase';
          }
          if (id.includes('leaflet')) {
            return 'leaflet';
          }
          if (
            id.includes('recharts')
            || id.includes('d3-')
            || id.includes('victory-vendor')
            || id.includes('decimal.js-light')
            || id.includes('es-toolkit')
          ) {
            return 'recharts';
          }
          if (
            id.includes('node_modules/react-dom')
            || id.includes('node_modules/react/')
            || id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }
          if (id.includes('lucide-react')) {
            return 'lucide';
          }
        },
      },
    },
  },
})