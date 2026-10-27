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

test('Text to image letters loads its source, license, evidence and every project-relative image', async (context) => {
  const requested: string[] = []
  context.mock.method(globalThis, 'fetch', async (input: string) => {
    requested.push(input)
    assert.ok(input.startsWith('/MotionWorkbench/examples/text-image-letters/'))
    const relative = input.slice('/MotionWorkbench/'.length)
    return new Response(await readFile(new URL(`../public/${relative}`, import.meta.url)))
  })

  const example = examples.find(({ id }) => id === 'text-image-letters')
  assert.ok(example)
  assert.equal(example.category, 'Exploration')
  assert.equal(example.source, 'github.com/boknowsworld/boknows-text-image-template')
  const project = await loadExampleProject(example.id, '/MotionWorkbench/')
  assert.equal(project.manifest.projectType, 'html')
  assert.equal(project.manifest.metadata?.license, 'MIT')
  assert.equal(project.manifest.metadata?.sourceCommit, '72bc384dd1fbeb007d7ffdec8f4e7218a59338be6')
  assert.deepEqual(Object.keys(project.files).sort(), ['app.js', 'config.js', 'index.html', 'scripts/validate.mjs', 'style.css'])
  assert.equal(Object.keys(project.assets ?? {}).filter((path) => path.endsWith('.webp')).length, 22)
  assert.equal(Object.keys(project.assets ?? {}).length, 27)
  assert.ok(project.assets?.['LICENSE.md'])
  assert.ok(project.assets?.['EVIDENCE.md'])
  assert.ok(project.assets?.['docs/MATERIALS.md'])
  assert.match(project.files['app.js'], /maxActiveLetters/)
  assert.match(project.files['app.js'], /automaticPlayback/)
  assert.match(project.files['style.css'], /editorial-hero/)
  assert.ok(requested.some((url) => url.endsWith('/assets/10-d-b.webp')))
})

test('Space Type studies expose the licensed source routes', async (context) => {
  context.mock.method(globalThis, 'fetch', async (input: string) => {
    const prefix = '/MotionWorkbench/examples/space-type-'
    assert.ok(input.startsWith(prefix))
    const relative = input.slice('/MotionWorkbench/'.length)
    return new Response(await readFile(new URL(`../public/${relative}`, import.meta.url)))
  })
  const studies = examples.filter((example) => example.category === 'Typography')
  assert.equal(studies.length, 22)
  assert.deepEqual(studies.slice(0, 2).map(({ id }) => id), ['space-type-cylinder', 'space-type-field'])
  assert.equal(studies.some(({ id }) => id === 'space-type-clutter'), false)
  assert.equal(studies.some(({ id }) => id === 'space-type-boost'), false)
  assert.equal(studies.some(({ id }) => id === 'space-type-boxsquad'), false)
  const project = await loadExampleProject('space-type-cylinder', '/MotionWorkbench/')
  const source = project.files['src/main.js']
  assert.equal(project.manifest.name, 'Cylinder')
  assert.match(source, /label: 'Cylinder radius', default: 250, min: 0, max: 1000/)
  assert.match(source, /label: 'Cylinder count', default: 1, min: 1, max: 30/)
  assert.match(source, /label: 'Tweak X rotation', default: 0, min: 0, max: 45/)
  assert.match(source, /label: 'Camera X-rotation', default: 15, min: -180, max: 180/)
  assert.match(source, /Jellyfish: \{ radius: 200, stackNum: 6/)
  assert.match(source, /Hoops: \{ radius: 110, stackNum: 7/)
  assert.match(source, /workbench-parameter-values/)
  assert.match(project.files['index.html'], /I-TRY-ALL-THINGS;-I-ACHIEVE-WHAT-I-CAN\.\/\//)
  assert.equal(project.files['index.html'].includes('space-type/'), false)
  assert.equal(project.manifest.assetFiles?.includes('assets/IBMPlexMono-Regular.otf'), true)
  assert.equal(project.assets?.['assets/IBMPlexMono-Regular.otf']?.mime, 'font/otf')
  assert.match(project.files['style.css'], /IBMPlexMono-Regular\.otf/)
  assert.match(source, /drawSourceGlyph/)
  assert.match(project.files['src/keyboardEngine_190103.js'], /function keyboardEngine/)

  const field = await loadExampleProject('space-type-field', '/MotionWorkbench/')
  const fieldSource = field.files['src/main.js']
  assert.equal(field.manifest.name, 'Field')
  assert.match(fieldSource, /label: 'Columns', default: 21, min: 1, max: 200/)
  assert.match(fieldSource, /label: 'Fill the full grid with text', default: false/)
  assert.match(fieldSource, /label: 'Field preset'/)
  assert.match(fieldSource, /'Complex Z': \{ column: 38, row: 10/)
  assert.match(fieldSource, /workbench-parameter-values/)
  assert.match(field.files['index.html'], /WORDS MOVE THROUGH OPEN SPACE/)
  assert.equal(field.manifest.assetFiles?.includes('assets/IBMPlexMono-Regular.otf'), true)
  assert.equal(field.assets?.['assets/IBMPlexMono-Regular.otf']?.mime, 'font/otf')
  assert.match(field.files['style.css'], /IBMPlexMono-Regular\.otf/)
  assert.match(field.files['src/main.js'], /drawSourceGlyph/)
  assert.match(field.files['src/keyboardEngine_190103.js'], /function keyboardEngine/)
  assert.match(field.files['src/glyph-adapter.js'], /drawSourceGlyph/)
})

test('DEMO Festival study loads its readable shader pipeline and four local glyph textures', async (context) => {
  const requested: string[] = []
  context.mock.method(globalThis, 'fetch', async (input: string) => {
    requested.push(input)
    assert.ok(input.startsWith('/MotionWorkbench/examples/demo-festival/'))
    const relative = input.slice('/MotionWorkbench/'.length)
    return new Response(await readFile(new URL(`../public/${relative}`, import.meta.url)))
  })
  const project = await loadExampleProject('demo-festival-motion', '/MotionWorkbench/')
  assert.equal(project.manifest.name, 'DEMO Festival letter motion')
  assert.equal(project.manifest.projectType, 'html')
  assert.deepEqual(Object.keys(project.files).sort(), ['index.html', 'src/main.js', 'src/motion.js', 'src/renderer.js', 'style.css'])
  assert.equal(Object.keys(project.assets ?? {}).filter((path) => path.endsWith('.webp')).length, 4)
  assert.ok(project.assets?.['EVIDENCE.md'])
  assert.match(project.files['src/motion.js'], /sampleCablesSpline/)
  assert.match(project.files['src/renderer.js'], /FXAA_REDUCE|reduce = max/)
  assert.match(project.files['src/renderer.js'], /1\.5 - uMidpoint/)
  assert.match(project.files['src/main.js'], /label: 'Idle delay', default: 2\.9/)
  assert.ok(requested.some((url) => url.endsWith('/assets/o.webp')))
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

test('Ice Works source port loads all editable source and attribution assets under a deployment prefix', async (context) => {
  const requested = new Set<string>()
  context.mock.method(globalThis, 'fetch', async (input: string) => {
    requested.add(input)
    assert.ok(input.startsWith('/MotionWorkbench/examples/ice-works-showcase/'))
    const relative = input.slice('/MotionWorkbench/'.length)
    try {
      return new Response(await readFile(new URL(`../public/${relative}`, import.meta.url)))
    } catch {
      return new Response('', { status: 404 })
    }
  })

  const project = await loadExampleProject('ice-works-showcase', '/MotionWorkbench/')
  assert.equal(project.manifest.projectType, 'react')
  assert.equal(project.manifest.renderer.type, 'react')
  assert.equal(project.manifest.metadata?.sourceCommit, 'bed3534a43125f6ef93890c75854427ed6a261a1')
  assert.equal(project.manifest.sourceFiles.length, 18)
  assert.deepEqual(project.manifest.assetFiles, ['EVIDENCE.md', 'LICENSE.md', 'src/vendor/GSAP-README.md'])
  assert.match(project.files['src/Carousel.jsx'], /mountWorkbenchControls/)
  assert.match(project.files['src/shaders/planeShaders.js'], /smin/)
  assert.ok(project.assets?.['LICENSE.md'])
  assert.equal(requested.size, 22)
})

test('MegD1 exploration studies load source, evidence and explicit licensing boundaries', async (context) => {
  context.mock.method(globalThis, 'fetch', async (input: string) => {
    const relative = input.slice('/MotionWorkbench/'.length)
    try {
      return new Response(await readFile(new URL(`../public/${relative}`, import.meta.url)))
    } catch {
      return new Response('', { status: 404 })
    }
  })

  const wake = await loadExampleProject('ice-paper-wake', '/MotionWorkbench/')
  assert.equal(wake.manifest.projectType, 'react')
  assert.equal(wake.manifest.metadata?.sourceCommit, 'df31b761b68f9bc26d67c06d020357b7b07501cf')
  assert.match(wake.files['src/gl/standalone.js'], /HalfFloatType/)
  assert.match(wake.files['src/gl/standalone.js'], /BLUR_LEVELS = 4/)
  assert.match(wake.files['src/parameters.js'], /label: 'Paper curl'/)
  assert.match(wake.files['src/IcePaperWake.jsx'], /connectParameters\(wake\.config\)/)
  assert.ok(wake.assets?.['assets/paper-study.svg'])
  assert.ok(wake.assets?.['LICENSE.md'])

  const goldfish = await loadExampleProject('ice-ascii-goldfish', '/MotionWorkbench/')
  assert.equal(goldfish.manifest.projectType, 'html')
  assert.equal(goldfish.manifest.metadata?.sourceCommit, '8917da362744c55d2a3bc5698401949b8c65f44b')
  assert.match(goldfish.files['index.html'], /class Ct/)
  assert.match(goldfish.files['index.html'], /glass-refraction/)
  assert.match(goldfish.files['workbench-parameters.js'], /label: 'Fish count'/)
  assert.ok(goldfish.assets?.['LICENSE.md'])

  const paperbound = await loadExampleProject('ice-paperbound', '/MotionWorkbench/')
  assert.equal(paperbound.manifest.projectType, 'react')
  assert.equal(paperbound.manifest.metadata?.sourceCommit, '731a314e9b72f24bcb287aa4354fb1d9bb216df0')
  assert.match(paperbound.files['src/BookshelfScene.tsx'], /OrthographicCamera/)
  assert.match(paperbound.files['src/BookshelfScene.tsx'], /duration: 0\.85.*0\.5\)/)
  assert.match(paperbound.files['src/BookBinding.ts'], /RoundedBoxGeometry/)
  assert.ok(paperbound.assets?.['textures/book-spines.webp'])
  assert.ok(paperbound.files['src/vendor/gsap.js'])
})
