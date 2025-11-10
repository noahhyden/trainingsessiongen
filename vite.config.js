import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This is equivalent to '0.0.0.0' and exposes to network
    port: 5174,
    strictPort: false, // Allow fallback if port is in use
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})

