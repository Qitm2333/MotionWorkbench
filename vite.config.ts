import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { build as bundle } from 'esbuild'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { deploymentBase } from './src/deployment.ts'

const basePath = deploymentBase(process.env.BASE_PATH || '/')

// Keep the pinned runtime and addons local in both dev and Pages builds.
function threeRuntime() {
  const files = new Map<string, string>()
  const root = join(import.meta.dirname, 'node_modules/three')
  const marker = '/vendor/three/0.180.0/'
  const devMarker = new URL(marker.slice(1), new URL(basePath, 'http://vite.local')).pathname
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
        const url = (req.url ?? '').split('?')[0]
        const requestMarker = url.startsWith(devMarker) ? devMarker : url.startsWith(marker) ? marker : undefined
        if (!requestMarker) return next()
        const path = files.get(url.slice(requestMarker.length))
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

function reactRuntime() {
  let runtime = ''
  const assetPath = 'vendor/react/19.3.1/runtime.js'
  const url = `/${assetPath}`
  const devUrl = new URL(assetPath, new URL(basePath, 'http://vite.local')).pathname
  const buildRuntime = async () => {
    if (!runtime) {
      const result = await bundle({
        entryPoints: [join(import.meta.dirname, 'src/reactSandboxRuntime.ts')],
        bundle: true,
        format: 'iife',
        target: 'es2022',
        minify: true,
        write: false,
        legalComments: 'none',
      })
      runtime = result.outputFiles[0].text
    }
    return runtime
  }
  return {
    name: 'bundled-react-runtime',
    async configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const requestPath = new URL(req.url ?? '/', 'http://vite.local').pathname
        if (requestPath !== url && requestPath !== devUrl) return next()
        try {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Content-Type', 'text/javascript')
          res.end(await buildRuntime())
        } catch (error) {
          res.writeHead(500).end(error instanceof Error ? error.message : String(error))
        }
      })
    },
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: assetPath, source: await buildRuntime() })
      const license = readFileSync(join(import.meta.dirname, 'node_modules/react/LICENSE'), 'utf8')
      this.emitFile({ type: 'asset', fileName: 'vendor/react/19.3.1/LICENSE', source: license })
    },
  } satisfies Plugin
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), threeRuntime(), reactRuntime()],
  preview: { headers: { 'Access-Control-Allow-Origin': '*' } },
  // GitHub Pages serves project sites below /<repository>/; local dev stays at `/`.
  base: basePath,
})
