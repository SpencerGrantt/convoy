import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Convoy — Medical Courier',
        short_name: 'Convoy',
        description: 'Mobile logistics platform for veteran-owned medical courier operations',
        theme_color: '#131313',
        background_color: '#131313',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // registerType: 'autoUpdate' only controls the CLIENT's registration
        // behavior — it does nothing to make the generated service worker
        // itself skip the waiting phase. Without these, a newly-installed
        // worker sits in "waiting" forever (visible via
        // navigator.serviceWorker.getRegistrations()) since nothing ever
        // sends it the SKIP_WAITING message, so autoUpdate's own "reload on
        // activate" listener never fires — the tab silently stays on the old
        // bundle indefinitely, no matter how many times it checks for
        // updates. This is what caused this session's whole string of
        // "the fix is deployed but I still see the old behavior" reports.
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Bare substring checks (id.includes('node_modules/react')) also
          // match any OTHER package whose npm name starts with "react-" —
          // e.g. node_modules/react-signature-canvas — silently merging an
          // unrelated UMD/CJS package into this chunk. Require a trailing
          // slash so only the exact package directory matches.
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/') ||
            id.includes('node_modules/react-router/')
          ) return 'vendor-react'
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase'
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) return 'vendor-recharts'
          if (id.includes('node_modules/jspdf')) return 'vendor-jspdf'
          if (id.includes('node_modules/lucide-react')) return 'vendor-lucide'
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/idb')) return 'vendor-utils'
        },
      },
    },
  },
})
