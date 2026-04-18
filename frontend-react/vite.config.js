import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: ['..']
    },
    proxy: {
      // Forward all /api requests to the backend server
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        // Don't rewrite the path, just forward it as-is
      }
    }
  }
})
