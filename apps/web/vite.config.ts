import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Read the API token from apps/server/.env at config-load time (dev only).
// The Vite proxy injects the Authorization header on every /api/* request,
// so the frontend never needs to know the token and no browser code changes are needed.
function loadDevApiToken(): string {
  try {
    const txt = readFileSync(resolve(__dirname, '../server/.env'), 'utf-8')
    const m = txt.match(/^API_TOKEN=(.+)$/m)
    return m?.[1]?.trim() ?? ''
  } catch {
    return ''
  }
}

const apiToken = loadDevApiToken()

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5173,
    proxy: {
      // Forward backend API calls so the browser only talks to :5173 (no CORS),
      // and SSE streams pass through unbuffered.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: false,
        headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : {},
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-cache, no-transform'
          })
        },
      },
    },
  },
})
