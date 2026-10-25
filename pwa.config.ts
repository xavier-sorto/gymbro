import type { VitePWAOptions } from 'vite-plugin-pwa';

export const APP_BASE = '/gymbro/';

export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'prompt',
  injectRegister: false,
  includeAssets: ['apple-touch-icon.png'],
  manifest: {
    name: 'GymBro',
    short_name: 'GymBro',
    start_url: './#/',
    scope: './',
    display: 'standalone',
    background_color: '#111111',
    theme_color: '#111111',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{html,js,css,png,svg,webmanifest,mp3,wav,ogg}'],
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
  },
};
