import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    isolate: false
  },
  resolve: {
    alias: [
      {
        find: /^react-router-redux$/,
        replacement: path.resolve(import.meta.dirname, 'src/shims/react-router-redux.js')
      }
    ]
  },
  define: {
    __DEV__: JSON.stringify(true),
    global: 'globalThis'
  }
});
