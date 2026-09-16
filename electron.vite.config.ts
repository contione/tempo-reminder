import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    build: { minify: 'esbuild' },
    resolve: { alias: { '@': resolve('src/renderer/src') } },
    plugins: [react()]
  }
})
