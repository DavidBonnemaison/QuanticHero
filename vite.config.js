import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    alias: [
      { find: /^react-router-redux$/, replacement: path.resolve(import.meta.dirname, 'src/shims/react-router-redux.js') },
      { find: /^phaser$/, replacement: path.resolve(import.meta.dirname, 'src/shims/phaser.js') },
      { find: /^phaser-ce$/, replacement: path.resolve(import.meta.dirname, 'src/shims/phaser.js') },
      { find: /^pixi$/, replacement: path.resolve(import.meta.dirname, 'src/shims/pixi.js') },
      { find: /^p2$/, replacement: path.resolve(import.meta.dirname, 'src/shims/p2.js') }
    ]
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    global: 'globalThis'
  },
  server: {
    port: 3000,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('phaser-ce') || id.includes('shims/phaser') || id.includes('shims/pixi') || id.includes('shims/p2')) {
            return 'phaser';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
        }
      }
    }
  }
});
