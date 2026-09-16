import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    // Keep fonts as local files; the renderer CSP intentionally disallows data: fonts.
    build: { minify: 'esbuild', assetsInlineLimit: 0 },
    resolve: { alias: { '@': resolve('src/renderer/src') } },
    plugins: [react()]
  }
})
