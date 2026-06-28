import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

// GitHub Pages (and other static hosts) have no SPA fallback, so deep links like
// /Map-Editor/seatplanner or /Map-Editor/badge 404 — there's no file there. The
// demo uses path-based product routing, so emit a 404.html mirroring index.html;
// the host serves it for unknown paths, the SPA boots, and the router reads the
// path. Build-only so it never interferes with dev.
function spa404Fallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      try {
        copyFileSync(resolve('dist/index.html'), resolve('dist/404.html'))
      } catch {
        // index.html may not exist for non-app builds — ignore.
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), spa404Fallback()],
})
