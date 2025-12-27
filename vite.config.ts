import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/electric-wave/', // 已适配为新的仓库名
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY)
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});
