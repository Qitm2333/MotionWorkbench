import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { examples, loadExampleProject } from '../src/examples.ts'

test('example starters open as independent editable copies', async () => {
  assert.equal(new Set(examples.map((example) => example.id)).size, examples.length)
  for (const id of ['orbit-study', 'motion-postcard', 'three-model-study']) {
    const first = await loadExampleProject(id, '/')
    const original = first.files[first.manifest.entry]
    first.files[first.manifest.entry] = 'edited'
    first.manifest.parameterValues = { changed: true }
    const next = await loadExampleProject(id, '/')
    assert.equal(next.files[next.manifest.entry], original)
    assert.equal(next.manifest.parameterValues?.changed, undefined)
  }
})

test('41 imported Bencho blocks have attributable editable React project sources', async (context) => {
  const blocks = examples.filter((example) => example.id.startsWith('bencho-'))
  assert.equal(blocks.length, 41)
  const requested = new Set<string>()
  context.mock.method(globalThis, 'fetch', async (input: string) => {
    requested.add(input)
    const relative = input.replace(/^\/MotionWorkbench\//, '')
    try {
      return new Response(await readFile(new URL(`../public/${relative}`, import.meta.url)))
    } catch {
      return new Response('', { status: 404 })
    }
  })
  for (const example of blocks) {
    const project = await loadExampleProject(example.id, '/MotionWorkbench/')
    assert.equal(project.manifest.projectType, 'react', example.id)
    assert.equal(project.manifest.metadata?.license, 'MIT', example.id)
    assert.equal(project.manifest.metadata?.source, 'cabralorenzo/bencho', example.id)
    assert.ok(project.files['src/App.tsx'], example.id)
    assert.ok(project.files['src/main.tsx'], example.id)
  }
  assert.ok(requested.size > 200)
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

test('Apple example loads every local resource with a deployment prefix and retains provenance', async (context) => {
  context.mock.method(globalThis, 'fetch', async (input: string) => {
    assert.ok(input.startsWith('/MotionWorkbench/examples/apple-duo-study/'))
    const bytes = await readFile(new URL(`../public/${input.slice('/MotionWorkbench/'.length)}`, import.meta.url))
    return new Response(bytes)
  })
  const project = await loadExampleProject('apple-duo-study', '/MotionWorkbench/')
  assert.equal(Object.keys(project.files).length, 5)
  assert.equal(Object.keys(project.assets!).length, 329)
  assert.equal(project.manifest.assetFiles!.length, 329)
  assert.ok(project.assets!['EVIDENCE.md'])
  assert.ok(project.assets!['assets/scenes/iPhoneDuo_ROW_L_avif.lsd'])
  assert.ok(project.assets!['assets/scenes/iPhoneDuo_ROW_S_avif.lsd'])
})
