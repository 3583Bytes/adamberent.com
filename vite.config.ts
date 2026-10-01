import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // three.js is lazy-loaded in its own chunk; ~250 kB gzipped is expected.
    chunkSizeWarningLimit: 1200,
  },
})
