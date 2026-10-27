import assert from 'node:assert/strict'
import test from 'node:test'
import { deploymentAssetUrl } from '../src/deployment.ts'

test('bundled runtimes resolve below the Pages prefix with or without a trailing slash', () => {
  const origin = 'https://qitm2333.github.io'
  const assets = [
    'vendor/three/0.180.0/three.module.js',
    'vendor/three/0.180.0/addons/geometries/RoundedBoxGeometry.js',
    'vendor/react/19.3.1/runtime.js',
  ]
  for (const base of ['/MotionWorkbench', '/MotionWorkbench/']) {
    for (const page of ['/MotionWorkbench/', '/MotionWorkbench']) {
      for (const asset of assets) {
        assert.equal(deploymentAssetUrl(asset, base, `${origin}${page}`), `${origin}/MotionWorkbench/${asset}`)
      }
    }
  }
})

test('bundled runtimes also resolve in root and relative deployments', () => {
  const asset = 'vendor/three/0.180.0/three.module.js'
  assert.equal(deploymentAssetUrl(asset, '/', 'http://localhost:5175/'), `http://localhost:5175/${asset}`)
  assert.equal(deploymentAssetUrl(asset, './', 'https://example.com/studio/'), `https://example.com/studio/${asset}`)
})
