import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Keep the pinned runtime and addons local in both dev and Pages builds.
function threeRuntime() {
  const files = new Map<string, string>()
  const root = join(import.meta.dirname, 'node_modules/three')
  for (const name of ['three.module.js', 'three.core.js']) files.set(name, join(root, 'build', name))
  const walk = (directory: string, prefix: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(directory, entry.name), `${prefix}${entry.name}/`)
      else files.set(`${prefix}${entry.name}`, join(directory, entry.name))
    }
  }
  walk(join(root, 'examples/jsm'), 'addons/')
  files.set('LICENSE', join(root, 'LICENSE'))
  return {
    name: 'bundled-three-runtime',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const marker = '/vendor/three/0.180.0/'
        const url = (req.url ?? '').split('?')[0]
        if (!url.startsWith(marker)) return next()
        const path = files.get(url.slice(marker.length))
        if (!path) { res.writeHead(404).end('Unknown Three.js module'); return }
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream')
        res.end(readFileSync(path))
      })
    },
    generateBundle() {
      for (const [name, path] of files) this.emitFile({ type: 'asset', fileName: `vendor/three/0.180.0/${name}`, source: readFileSync(path) })
    },
  } satisfies Plugin
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), threeRuntime()],
  preview: { headers: { 'Access-Control-Allow-Origin': '*' } },
  // GitHub Pages serves project sites below /<repository>/; local dev stays at `/`.
  base: process.env.BASE_PATH || '/',
})
