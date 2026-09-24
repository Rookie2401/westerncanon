import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// PWA plugin is wired here so the app can work fully offline. All of the
// library's data is bundled: scripts/copy-corpus.mjs copies each data/*/*.json
// directory into public/ (predev + prebuild), Vite emits them into dist/, and
// Workbox precaches them below. Nothing is fetched from the network at runtime.
// Two sibling editions are built from this one config (scripts/build-editions.mjs
// runs it twice with VITE_EDITION=en and =original); everything below that
// names the app reads the edition so each site installs as its own PWA.
const EDITION = process.env.VITE_EDITION ?? 'all';
const APP_NAME = EDITION === 'original' ? 'Western Canon: Original Languages' : 'Western Canon';
const SHORT_NAME = EDITION === 'original' ? 'Canon (Original)' : 'Western Canon';
const DESCRIPTION =
  EDITION === 'original'
    ? 'Western Canon, original-language edition: an offline reader for the foundational texts of the Western canon in Greek, Latin and Italian (with works written in English kept as written), from Homer, Plato, Aristotle, Euclid and Archimedes to Dante, Shakespeare and Newton.'
    : EDITION === 'en'
      ? 'Western Canon, English edition: an offline reader for the foundational texts of the Western canon in public-domain English translations and English originals, from Homer, Plato, Aristotle, Euclid and Archimedes to Dante, Shakespeare and Newton.'
      : 'Western Canon is an offline reader for the foundational texts of the Western canon in their original languages and in English.';

export default defineConfig({
  // Relative base so the built app works from any static host, sub-path, or the
  // file: protocol. Combined with HashRouter this keeps every route resolvable.
  base: './',
  plugins: [
    {
      name: 'edition-html',
      transformIndexHtml(html: string) {
        return html
          .replace(/<title>[^<]*<\/title>/, `<title>${APP_NAME}</title>`)
          .replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/, `$1${SHORT_NAME}$2`)
          .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${DESCRIPTION}$2`);
      },
    },
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon-32.png',
        'apple-touch-icon.png',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // The language-help data (original edition only: per-work bundles and
        // dictionary shards, tens of MB) is fetched on first use and kept by the
        // runtime cache below, never precached.
        globIgnores: ['lexis/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/lexis\//.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: `lexis-${EDITION}`, expiration: { maxEntries: 800 } },
          },
        ],
        // The bundled corpus is ~25 MB total; search-index.json alone is ~12 MB.
        // A one-time precache of the whole corpus is the price of a real offline
        // full-text reader, so raise the per-file cap well above it.
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        // HashRouter keeps all navigation under index.html; still register a
        // fallback so a cold deep-link resolves offline.
        navigateFallback: 'index.html',
      },
      manifest: {
        name: APP_NAME,
        short_name: SHORT_NAME,
        description: DESCRIPTION,
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f7f2e8',
        theme_color: '#6b4f2a',
        icons: [
          { src: './pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: './pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: './pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
