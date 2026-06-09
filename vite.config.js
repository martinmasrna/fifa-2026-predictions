import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/fifa-2026-predictions/',
  test: {
    environment: 'node',
    globals: true,
  },
})
