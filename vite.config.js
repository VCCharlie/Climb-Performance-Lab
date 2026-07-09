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

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // SW registers via inline script at the top of index.html (earliest possible).
      injectRegister: false,
      scope: appBase,
      includeAssets: ['favicon.png', 'pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png', 'vite.svg'],
      manifest: {
        id: `${appBase}?source=pwa`,
        name: 'Climb Performance Lab',
        short_name: 'Climb Lab',
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
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: `${appBase}index.html`,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        // Tailwind CDN and Google Fonts stay network-only (not precached).
        runtimeCaching: [
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
    // Dit maakt de variabele globaal beschikbaar in je hele React app
    '__APP_VERSION__': JSON.stringify(versionString),
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
        },
      },
    },
  },
})