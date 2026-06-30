import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, proxy API calls to the backend so the SPA can run on :5173.
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/docs': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
