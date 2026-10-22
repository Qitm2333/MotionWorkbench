import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { examples, loadExampleProject } from '../src/examples.ts'

test('example starters open as independent editable copies', async () => {
  assert.equal(new Set(examples.map((example) => example.id)).size, examples.length)
  for (const id of ['orbit-study', 'motion-postcard']) {
    const first = await loadExampleProject(id, '/')
    const original = first.files[first.manifest.entry]
    first.files[first.manifest.entry] = 'edited'
    first.manifest.parameterValues = { changed: true }
    const next = await loadExampleProject(id, '/')
    assert.equal(next.files[next.manifest.entry], original)
    assert.equal(next.manifest.parameterValues?.changed, undefined)
  }
})

test('catalog loads complete local source under a Pages deployment prefix', async (context) => {
  const requested: string[] = []
  context.mock.method(globalThis, 'fetch', async (input: string) => {
    requested.push(input)
    assert.ok(input.startsWith('/MotionWorkbench/examples/catalog-repro/'))
    const relative = input.slice('/MotionWorkbench/'.length)
    const text = await readFile(new URL(`../public/${relative}`, import.meta.url), 'utf8')
    return new Response(text)
  })
  const project = await loadExampleProject('catalog-repro', '/MotionWorkbench/')
  assert.equal(project.manifest.projectType, 'html')
  assert.equal(project.manifest.entry, 'index.html')
  assert.deepEqual(Object.keys(project.files).sort(), ['index.html', 'src/main.js', 'style.css'])
  assert.match(project.files['index.html'], /\.\/style\.css/)
  assert.match(project.files['index.html'], /\.\/src\/main\.js/)
  assert.match(project.files['src/main.js'], /window\.workbench\?\.params\?\.define/)
  assert.equal(requested.length, 4)
})

test('example loading reports missing files and rejects unsafe manifests before fetching source', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }))
  await assert.rejects(loadExampleProject('catalog-repro', '/'), /project\.json \(404\)/)

  fetchMock.mock.resetCalls()
  fetchMock.mock.mockImplementation(async () => new Response(JSON.stringify({
    formatVersion: 1, name: 'Invalid', projectType: 'html', renderer: { type: 'html' },
    entry: 'index.html', sourceFiles: ['index.html', '../outside.js'],
  })))
  await assert.rejects(loadExampleProject('catalog-repro', '/'), /escapes the project folder/)
  assert.equal(fetchMock.mock.callCount(), 1)
  await assert.rejects(loadExampleProject('unknown-example', '/'), /Unknown example/)
  assert.equal(fetchMock.mock.callCount(), 1)
})
