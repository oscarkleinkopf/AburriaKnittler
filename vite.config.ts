import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import netlify from '@netlify/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'

// Project Pages URL: https://<user>.github.io/AburriaKnittler/
const base = process.env.VITE_BASE ?? '/AburriaKnittler/'

export default defineConfig({
  base,
  plugins: [
    react(),
    ...(process.env.VITEST ? [] : [netlify()]),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon.svg', 'hero-knit.svg'],
      manifest: {
        name: 'AburriaKnittler',
        short_name: 'Aburria',
        description:
          'Asistente de tejido: estima puntos y filas, y lleva el contador de vueltas.',
        theme_color: '#2f5d4a',
        background_color: '#f3f6f1',
        display: 'standalone',
        start_url: base,
        scope: base,
        lang: 'es',
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test/setup.ts'],
  },
})
