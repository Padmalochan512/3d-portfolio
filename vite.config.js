import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  // Netlify serves this site from the domain root.
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        dashboard: resolve(import.meta.dirname, 'dashboard.html'),
      },
    },
  },
});
