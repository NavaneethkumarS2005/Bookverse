import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: false, // Disable sourcemaps in production for security/size
    chunkSizeWarningLimit: 1000, // Increase warning limit (1MB)
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 1. Vendor Chunking (React Core)
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            // 2. Vendor Chunking (UI/Icons)
            if (id.includes('react-icons') || id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // 3. Vendor Chunking (Utilities)
            if (id.includes('axios') || id.includes('date-fns') || id.includes('lodash')) {
              return 'vendor-utils';
            }
            // 4. Everything else in node_modules
            return 'vendor-others';
          }
        },
      },
    },
  },
});
