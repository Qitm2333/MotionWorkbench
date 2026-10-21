import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves project sites below /<repository>/; local dev stays at `/`.
  base: process.env.BASE_PATH || '/',
})
