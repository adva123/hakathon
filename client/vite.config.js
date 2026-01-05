import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/ducks': 'http://localhost:5000',
      '/images': 'http://localhost:5000',
    },
    open: true // Automatically open the browser
  }
})
