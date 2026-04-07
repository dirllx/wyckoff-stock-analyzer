import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
    // Note: manualChunks will be added in later tasks when components exist
  }
});
