import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// PWA plugin is wired here so the app can work fully offline (all Summa data is
// bundled from data/summa/*.json — nothing is fetched at runtime). Builder 2
// owns the manifest icons, theme and any runtime UI for updates.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // The bundled corpus (part-*.json + search-index.json) is a few MB.
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
      manifest: {
        name: 'Summa Theologiae',
        short_name: 'Summa',
        description:
          'Offline reader for the Latin Summa Theologiae of Thomas Aquinas (Proœmium and all four parts).',
        lang: 'la',
        start_url: '/',
        display: 'standalone',
        background_color: '#f8f5ef',
        theme_color: '#6b4f2a',
      },
    }),
  ],
})
