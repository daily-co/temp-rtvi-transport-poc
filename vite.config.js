import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // Forward /api requests to your Express server
      '/api': 'http://localhost:3000'
    }
  }
});
