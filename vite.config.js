import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    includeManifestIcons: false,
    manifest: {
      id: '/', name: 'FORGE — Gym Routine Manager', short_name: 'FORGE',
      description: 'Organize your gym exercises, routines and weekly progress.',
      start_url: '/', scope: '/', display: 'standalone',
      theme_color: '#101612', background_color: '#090c0b',
      icons: [
        { src: '/icons/forge-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/forge-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/forge-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      cacheId: 'forge',
      globPatterns: ['**/*.{js,css,html,ttf,woff2,webp,png,svg,ico}'],
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api\//, /^\/assets\//, /^\/images\//, /^\/icons\//, /^\/\.well-known\//],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: false,
      // Cache bundled public assets only. Account requests and private photos stay on the network.
      runtimeCaching: [],
    },
    devOptions: { enabled: false },
  })],
})
