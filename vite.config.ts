import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // IMPORTANT: Change this to match your GitHub repo name
  // Example: if your repo is https://github.com/yourname/cribbage
  // then use base: '/cribbage/'
  base: '/cribbage/',
})
