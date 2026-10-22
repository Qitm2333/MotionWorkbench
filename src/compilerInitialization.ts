const compilerStateKey = '__motionWorkbenchEsbuildInitialization'

type CompilerGlobal = typeof globalThis & {
  [key: string]: unknown
}

/** Keep the esbuild-wasm service alive across Vite HMR module replacements. */
export function initializeCompiler(initialize: () => Promise<void>) {
  const state = globalThis as CompilerGlobal
  const existing = state[compilerStateKey]
  if (existing instanceof Promise) return existing as Promise<void>

  const pending = initialize()
  state[compilerStateKey] = pending
  void pending.catch(() => {
    if (state[compilerStateKey] === pending) delete state[compilerStateKey]
  })
  return pending
}
