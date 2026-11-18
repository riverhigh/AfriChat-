import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon-192.png', 'apple-touch-icon.png', 'manifest.json', 'sw-push.js'],
        manifest: false, // Served cleanly from /public/manifest.json linked in index.html
        workbox: {
          importScripts: ['/sw-push.js'],
          // Precache only the core shell so SW install is fast and never starves startup bandwidth
          globPatterns: [
            'index.html',
            'assets/index-*.{js,css}',
            'assets/vendor-*.js',
            'assets/rolldown-runtime-*.js',
            'assets/virtual_pwa-register-*.js',
            'assets/workbox-window*.js',
            'assets/Header-*.js',
            'assets/BottomNav-*.js',
            'assets/ChatList-*.js',
            'assets/StatusView-*.js',
            'assets/WhatsAppPhoneAuth-*.js',
          ],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/, /^\/@/, /^\/src\//, /^\/node_modules\//, /\/[^/?]+\.[^/?]+$/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/assets/') && /\.(js|css)$/i.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'agc-assets-cache',
                expiration: { maxEntries: 160, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'agc-google-fonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'agc-images-cache',
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/health') || url.pathname.startsWith('/api/public'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'agc-api-public-cache',
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    build: {
      rolldownOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
              if (id.includes('@supabase/')) return 'vendor-supabase';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('socket.io') || id.includes('engine.io')) return 'vendor-realtime';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
