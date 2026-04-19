import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// API endpoints live in /api/*.ts (Vercel serverless functions).
// For local development with the API, run: vercel dev
// Plain `npm run dev` serves the SPA only (no /api/* routes).

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
