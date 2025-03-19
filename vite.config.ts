import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
  },
  optimizeDeps: {
    exclude: ['bcrypt', 'pg', 'pg-format'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:13008',
        changeOrigin: true,
      },
    },
  },
})
