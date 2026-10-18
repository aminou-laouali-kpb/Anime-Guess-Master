import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts, which needs PORT and BASE_PATH to start.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
