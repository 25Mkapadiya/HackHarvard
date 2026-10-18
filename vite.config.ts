import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this repo under /<repo>/. CI passes VITE_BASE explicitly.
const base = process.env.VITE_BASE ?? '/HackHarvard/';
const developmentPreview = process.env.VITE_DEVELOPMENT_PREVIEW === 'true';

export default defineConfig({
  base,
  envDir: developmentPreview ? false : undefined,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      disable: developmentPreview,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Market Day Boston',
        short_name: 'Market Day',
        description: 'Find farmers markets across the US open now, and where SNAP, HIP and WIC are accepted.',
        theme_color: '#24513F',
        background_color: '#FBFBF8',
        display: 'standalone',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/data/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'market-data', expiration: { maxEntries: 400 } },
          },
          {
            urlPattern: ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
            handler: 'CacheFirst',
            options: { cacheName: 'osm-tiles', expiration: { maxEntries: 500, maxAgeSeconds: 7 * 86400 } },
          },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 600 },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
});
