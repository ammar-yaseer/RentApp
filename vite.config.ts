import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The PWA service worker generation breaks when the project path contains an apostrophe
// (e.g. "Amr's one"). We disable the SW build in that case — the manifest still works
// for installability. When the project is moved to a path without special characters,
// set ENABLE_PWA_SW=true to enable full service worker offline support.
const hasApostrophe = __dirname.includes("'");
const enableSW = !hasApostrophe || process.env.ENABLE_PWA_SW === 'true';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      disable: !enableSW,
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'RentFlow — Vehicle Rental & Partnership Management',
        short_name: 'RentFlow',
        description: 'Run your Rent-A-Car business end to end: vehicles, bookings, finance, investors, reporting.',
        theme_color: '#1f47f5',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: { host: true, port: 5173 },
});
