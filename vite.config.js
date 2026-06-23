import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'vendor-react'
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
