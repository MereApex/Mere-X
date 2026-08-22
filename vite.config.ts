import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
  // Preview serves the production bundle, and it needs the same API route so a
  // build can be exercised exactly as it will run.
  preview: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
