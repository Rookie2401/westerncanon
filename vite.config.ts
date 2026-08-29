import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// PWA plugin is wired here so the app can work fully offline. All Summa data is
// bundled: scripts/copy-corpus.mjs copies data/summa/*.json into public/summa/
// (predev + prebuild), Vite emits them into dist/summa/, and Workbox precaches
// them below. Nothing is fetched from the network at runtime.
export default defineConfig({
  // Relative base so the built app works from any static host, sub-path, or the
  // file: protocol. Combined with HashRouter this keeps every route resolvable.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // The bundled corpus is ~25 MB total; search-index.json alone is ~12 MB.
        // A one-time precache of the whole corpus is the price of a real offline
        // full-text reader, so raise the per-file cap well above it.
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        // HashRouter keeps all navigation under index.html; still register a
        // fallback so a cold deep-link resolves offline.
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'Summa Theologiae',
        short_name: 'Summa',
        description:
          'Offline reader for the Latin Summa Theologiae of Thomas Aquinas (Proœmium and all four parts).',
        lang: 'la',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f7f2e8',
        theme_color: '#6b4f2a',
      },
    }),
  ],
})
