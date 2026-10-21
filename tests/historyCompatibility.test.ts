import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import { opaqueOriginHistoryCompatibilityScript } from '../src/historyCompatibility.ts'

function makeHistory() {
  const calls: unknown[][] = []
  const securityError = Object.assign(new Error('Cross-origin history URL is blocked'), { name: 'SecurityError' })
  const history = {
    replaceState(...args: unknown[]) {
      calls.push(['replaceState', ...args])
      if (typeof args[2] === 'string' && args[2].startsWith('http://localhost:')) throw securityError
    },
    pushState(...args: unknown[]) {
      calls.push(['pushState', ...args])
      if (typeof args[2] === 'string' && args[2].startsWith('http://localhost:')) throw securityError
    },
  }
  return { history, calls }
}

test('opaque preview history URL errors do not abort the caller event', () => {
  const { history, calls } = makeHistory()
  const location = { origin: 'null', href: 'about:srcdoc' }
  runInNewContext(opaqueOriginHistoryCompatibilityScript, { history, location })
  let sceneUpdated = false

  assert.doesNotThrow(() => {
    history.replaceState({}, '', 'http://localhost:5173/srcdoc?family=product-design')
    sceneUpdated = true
  })
  assert.equal(sceneUpdated, true)
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[1], ['replaceState', {}, ''])
})

test('history compatibility leaves unrelated security errors untouched', () => {
  const { history } = makeHistory()
  runInNewContext(opaqueOriginHistoryCompatibilityScript, { history, location: { origin: 'https://example.com', href: 'https://example.com/' } })

  assert.throws(() => history.replaceState({}, '', 'http://localhost:5173/path'), { name: 'SecurityError' })
})
