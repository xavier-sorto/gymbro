import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import { APP_BASE, pwaOptions } from './pwa.config';

export default defineConfig({
  base: APP_BASE,
  plugins: [VitePWA(pwaOptions)],
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
