import { fileURLToPath, URL } from 'url';

import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

/** Set GITHUB_PAGES=true when building for https://<user>.github.io/<repo>/ */
const base = process.env.GITHUB_PAGES === 'true' ? '/TrackShift/' : '/';

export default defineConfig({
  base,
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5175,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'happy-dom',
  },
});
