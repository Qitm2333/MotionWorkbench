/**
 * Sandboxed srcdoc documents have an opaque origin and cannot change their URL
 * to the parent application's origin with History API calls. Keep those state
 * updates working while leaving the preview URL untouched.
 */
export const opaqueOriginHistoryCompatibilityScript = `(() => {
  for (const method of ['replaceState', 'pushState']) {
    const prototype = Object.getPrototypeOf(history)
    const original = history[method]
    const wrapped = function (...args) {
      try {
        return original.apply(history, args)
      } catch (error) {
        if (location.origin !== 'null' || error?.name !== 'SecurityError') throw error
        try {
          return original.apply(history, [args[0], args[1]])
        } catch (fallbackError) {
          if (fallbackError?.name === 'SecurityError') return
          throw fallbackError
        }
      }
    }
    const descriptor = Object.getOwnPropertyDescriptor(prototype, method)
    if (descriptor?.writable) Object.defineProperty(prototype, method, { ...descriptor, value: wrapped })
    else history[method] = wrapped
  }
})()`
