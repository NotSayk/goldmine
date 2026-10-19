import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const server = process.env.SERVER_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ws': { target: server.replace(/^http/, 'ws'), ws: true },
      '/healthz': server,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
