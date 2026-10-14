import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backend = process.env.VITE_BACKEND ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      // The browser's Origin header is removed so the API treats proxied calls as same-origin (no CORS 403s,
      // whichever host or port you open the dev site on).
      '/api': {
        target: backend,
        changeOrigin: true,
        configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin'))
      },
      '/uploads': { target: backend, changeOrigin: true }
    }
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-qr': ['qrcode']
        }
      }
    }
  }
});
