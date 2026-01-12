import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      // כל בקשה שמתחילה ב-api תופנה לשרת ה-Node.js
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      // הפניית בקשות לתמונות (אם יש תיקייה כזו בשרת)
      '/images': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    },
    open: true
  }
})