import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Cloudflare workers.dev 使用根路径部署；如需子路径部署可通过 VITE_BASE_PATH 覆盖
  base: process.env.VITE_BASE_PATH || '/',
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY)
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});
