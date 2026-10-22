import assert from 'node:assert/strict'
import test from 'node:test'
import { initializeCompiler } from '../src/compilerInitialization.ts'

const key = '__motionWorkbenchEsbuildInitialization'
const state = globalThis as typeof globalThis & Record<string, unknown>

test('compiler initialization is shared across runtime module reloads', async () => {
  delete state[key]
  let calls = 0
  const initialize = async () => { calls += 1 }

  try {
    const firstModuleInitialization = initializeCompiler(initialize)
    // A second runtime module evaluation calls the helper with a new callback,
    // but must reuse the singleton service kept outside the HMR module scope.
    const afterHotReload = initializeCompiler(async () => { calls += 1 })
    assert.strictEqual(afterHotReload, firstModuleInitialization)
    await Promise.all([firstModuleInitialization, afterHotReload])
    assert.equal(calls, 1)
  } finally {
    delete state[key]
  }
})

test('a failed compiler initialization can be retried', async () => {
  delete state[key]
  try {
    await assert.rejects(initializeCompiler(() => Promise.reject(new Error('startup failed'))), /startup failed/)
    // Let the rejection cleanup run before starting the retry.
    await new Promise((resolve) => setImmediate(resolve))
    await initializeCompiler(async () => {})
  } finally {
    delete state[key]
  }
})
