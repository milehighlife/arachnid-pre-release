import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react-swc'
import { cloudflare } from '@cloudflare/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
})
