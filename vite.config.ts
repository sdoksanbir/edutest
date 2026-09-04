import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

const CSP_DEV =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' ws: wss: http://127.0.0.1:* http://localhost:* https:; worker-src 'self' blob:; media-src 'self' blob:;"

const CSP_PROD =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https:; worker-src 'self' blob:; media-src 'self' blob:;"

function electronCspPlugin(): Plugin {
  return {
    name: 'electron-csp',
    transformIndexHtml(html, ctx) {
      const csp = ctx.server ? CSP_DEV : CSP_PROD
      return html.replace(/__ELECTRON_CSP__/g, csp)
    },
  }
}

export default defineConfig({
  plugins: [react(), electronCspPlugin()],
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
})
