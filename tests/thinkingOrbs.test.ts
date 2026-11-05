import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { examples, loadExampleProject } from '../src/examples.ts'

test('Thinking Orbs opens all nine MIT Canvas2D states from local source modules', async (context) => {
  context.mock.method(globalThis, 'fetch', async (input: string) => {
    assert.ok(input.startsWith('/MotionWorkbench/examples/thinking-orbs/'))
    const relative = input.slice('/MotionWorkbench/'.length)
    return new Response(await readFile(new URL(`../public/${relative}`, import.meta.url)))
  })

  const example = examples.find(({ id }) => id === 'thinking-orbs')
  assert.ok(example)
  assert.equal(example.category, 'Exploration')
  assert.equal(example.source, 'github.com/Jakubantalik/thinking-orbs')
  assert.equal(example.license, 'MIT')

  const project = await loadExampleProject(example.id, '/MotionWorkbench/')
  assert.equal(project.manifest.metadata?.sourceCommit, 'de85557ca220332586d070d8788c0e1d6e877a0d')
  assert.equal(project.manifest.metadata?.license, 'MIT')
  assert.equal(project.manifest.sourceFiles.length, 16)
  assert.equal(project.manifest.assetFiles?.length, 2)
  assert.ok(project.assets?.['LICENSE.md'])
  assert.ok(project.assets?.['EVIDENCE.md'])

  const source = project.files['src/main.js']
  for (const state of ['working', 'searching', 'solving', 'listening', 'connecting', 'weaving', 'composing', 'breathing', 'shaping']) {
    assert.match(source, new RegExp(`['"]${state}['"]`))
  }
  assert.match(project.files['src/presets.js'], /6\.63/)
  assert.match(project.files['src/engine/morph.js'], /const CYCLE = \[CIRCLE, TRIANGLE, SQUARE\]/)
  assert.match(project.files['src/engine/core.js'], /function paintFrame/)
  assert.match(project.files['src/engine/registry.js'], /ring: frameRibbon/)
})
