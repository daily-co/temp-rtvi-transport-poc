import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // Forward /api requests to your Express server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
