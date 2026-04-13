import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3001,
    host: true,
    strictPort: true,  // 强制使用3001端口
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  esbuild: {
    loader: 'js',
    jsx: 'preserve'
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split echarts (~1 MB) into its own vendor chunk
          if (id.includes('node_modules/echarts')) {
            return 'vendor-echarts';
          }

          // Split zrender (echarts rendering engine) alongside echarts
          if (id.includes('node_modules/zrender')) {
            return 'vendor-echarts';
          }

          // Group remaining node_modules into a small vendor chunk
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        }
      }
    }
  }
});
