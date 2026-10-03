import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
// `vite build --mode itch` produces a self-contained bundle for itch.io (see .env.itch);
// every other mode builds the regular site exactly as before.
export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  ...(mode === 'itch' && { base: './', build: { outDir: 'dist-itch' } }),
}))
