import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/3d-portfolio/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        dashboard: resolve(import.meta.dirname, 'dashboard.html'),
      },
    },
  },
});

