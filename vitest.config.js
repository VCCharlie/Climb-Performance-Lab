import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/__tests__/**/*.test.js', 'src/__tests__/**/*.test.jsx'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**/*.js'],
      reporter: ['text', 'text-summary', 'html'],
      thresholds: {
        // Start modest, raise as you add tests
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      }
    }
  },
  define: {
    '__APP_VERSION__': JSON.stringify('test'),
  }
});
