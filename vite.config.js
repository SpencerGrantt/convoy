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
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — changes rarely, long cache
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase — large, isolated
          'vendor-supabase': ['@supabase/supabase-js'],
          // Heavy chart lib — only used in Finances
          'vendor-recharts': ['recharts'],
          // PDF — only used in invoice/report generation
          'vendor-jspdf': ['jspdf'],
          // Icons — large, frequently imported
          'vendor-lucide': ['lucide-react'],
          // Misc utils
          'vendor-utils': ['date-fns', 'idb'],
        },
      },
    },
  },
})
