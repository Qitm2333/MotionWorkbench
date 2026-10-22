import assert from 'node:assert/strict'
import test from 'node:test'
import { createCurveFromPreset, curvePresets, readProjectDirectory, sampleCurveValue, starterProject, starterHtmlProject, validateProject, writeProjectDirectory } from '../src/project.ts'
import type { DirectoryHandle } from '../src/project.ts'
import { starterThreeProject } from '../src/threeProject.ts'
import { decodeAsset, encodeAsset } from '../src/assets.ts'

class MemoryFile {
  readonly kind = 'file'
  contents: string | Uint8Array
  constructor(contents: string | Uint8Array) { this.contents = contents }
  async getFile() {
    return {
      text: async () => typeof this.contents === 'string' ? this.contents : new TextDecoder().decode(this.contents),
      arrayBuffer: async () => {
        const bytes = typeof this.contents === 'string' ? new TextEncoder().encode(this.contents) : this.contents
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      },
    }
  }
  async createWritable() {
    return {
      write: async (contents: string | Uint8Array) => { this.contents = contents },
      close: async () => {},
    }
  }
}

class MemoryDirectory {
  readonly kind = 'directory'
  readonly name: string
  readonly children = new Map<string, MemoryDirectory | MemoryFile>()
  constructor(name = 'memory-project') { this.name = name }
  async *entries() { yield* this.children.entries() }
  async getFileHandle(name: string, options?: { create?: boolean }) {
    let file = this.children.get(name)
    if (!file && options?.create) {
      file = new MemoryFile('')
      this.children.set(name, file)
    }
    if (!(file instanceof MemoryFile)) throw new DOMException('File not found', 'NotFoundError')
    return file
  }
  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    let directory = this.children.get(name)
    if (!directory && options?.create) {
      directory = new MemoryDirectory()
      this.children.set(name, directory)
    }
    if (!(directory instanceof MemoryDirectory)) throw new DOMException('Directory not found', 'NotFoundError')
    return directory
  }
  async removeEntry(name: string) { this.children.delete(name) }
}

test('curve presets have unique IDs and create independent resources', () => {
  assert.equal(new Set(curvePresets.map((preset) => preset.id)).size, curvePresets.length)
  const first = createCurveFromPreset('ease-in-out', 'first')
  const second = createCurveFromPreset('ease-in-out', 'second')
  assert.ok(first?.type === 'cubic-bezier' && second?.type === 'cubic-bezier')
  first.points[0] = 0.1
  assert.equal(second.points[0], 0.42)
})

test('curve sampling keeps exact endpoints and finite spring values', () => {
  const ease = createCurveFromPreset('ease-in-out', 'ease')!
  assert.equal(sampleCurveValue(ease, 0), 0)
  assert.equal(sampleCurveValue(ease, 1), 1)
  assert.ok(Math.abs(sampleCurveValue(ease, 0.5) - 0.5) < 0.001)

  const resonant = { id: 'resonant', name: 'Resonant', type: 'spring' as const, mass: 1, stiffness: (Math.PI * 5 / 1.2) ** 2, damping: 0 }
  for (let index = 0; index <= 100; index++) assert.ok(Number.isFinite(sampleCurveValue(resonant, index / 100)))
  assert.equal(sampleCurveValue(resonant, 0), 0)
  assert.equal(sampleCurveValue(resonant, 1), 1)
})

test('project validation normalizes safe paths without mutating the source', () => {
  const input = structuredClone(starterProject)
  input.manifest.entry = './src/main.ts'
  const validated = validateProject(input)
  assert.equal(validated.manifest.entry, 'src/main.ts')
  assert.equal(input.manifest.entry, './src/main.ts')
  assert.equal(validateProject(JSON.parse(JSON.stringify(validated))).manifest.curves?.[0].id, 'ease-orbit')
})

test('project validation rejects unsafe paths and duplicate curve IDs', () => {
  const unsafe = structuredClone(starterProject)
  unsafe.manifest.entry = '../outside.ts'
  assert.throws(() => validateProject(unsafe), /escapes the project folder/)

  const duplicate = structuredClone(starterProject)
  duplicate.manifest.curves!.push({ ...duplicate.manifest.curves![0] })
  assert.throws(() => validateProject(duplicate), /unique/)
})

test('project validation restricts files to the project language', () => {
  const htmlWithScript = {
    manifest: { formatVersion: 1, name: 'Page', entry: 'index.html', projectType: 'html', renderer: { type: 'html' } },
    files: { 'index.html': '<main />', 'src/scene.ts': 'export {}' },
  }
  assert.throws(() => validateProject(htmlWithScript), /Unsupported html project source file/)
})

test('saving removes only stale sources listed in the previous manifest', async () => {
  const root = new MemoryDirectory()
  const previousManifest = {
    ...starterHtmlProject.manifest,
    sourceFiles: ['index.html', 'styles.css', 'nested/old.css'],
  }
  root.children.set('project.json', new MemoryFile(JSON.stringify(previousManifest)))
  root.children.set('index.html', new MemoryFile('old html'))
  root.children.set('styles.css', new MemoryFile('old css'))
  root.children.set('notes.css', new MemoryFile('user-owned css'))
  const nested = new MemoryDirectory()
  nested.children.set('old.css', new MemoryFile('old nested css'))
  root.children.set('nested', nested)

  const updated = structuredClone(starterHtmlProject)
  delete updated.files['styles.css']
  await writeProjectDirectory(root as unknown as DirectoryHandle, updated)

  assert.equal(root.children.has('styles.css'), false)
  assert.equal((root.children.get('nested') as MemoryDirectory).children.has('old.css'), false)
  assert.equal(root.children.has('notes.css'), true)
  const writtenManifest = JSON.parse((root.children.get('project.json') as MemoryFile).contents as string)
  assert.deepEqual(writtenManifest.sourceFiles, ['index.html'])
})

test('opening a plain HTML folder creates a compatible project manifest', async () => {
  const root = new MemoryDirectory('catalog-repro')
  root.children.set('index.html', new MemoryFile('<link rel="stylesheet" href="./style.css"><script defer src="./src/main.js"></script>'))
  root.children.set('style.css', new MemoryFile('body { color: red; }'))
  const src = new MemoryDirectory('src')
  src.children.set('main.js', new MemoryFile('document.body.dataset.ready = "yes"'))
  root.children.set('src', src)
  root.children.set('README.md', new MemoryFile('ignored documentation'))

  const project = await readProjectDirectory(root as unknown as DirectoryHandle)
  assert.equal(project.manifest.projectType, 'html')
  assert.equal(project.manifest.entry, 'index.html')
  assert.equal(project.manifest.name, 'catalog-repro')
  assert.deepEqual(Object.keys(project.files).sort(), ['index.html', 'src/main.js', 'style.css'])
})

test('binary assets round trip through folders and portable JSON without changing bytes', async () => {
  const root = new MemoryDirectory()
  const project = structuredClone(starterThreeProject)
  const bytes = Uint8Array.from({ length: 262144 }, (_, index) => index % 256)
  project.assets!['assets/nested/model space.glb'] = encodeAsset(bytes.buffer, 'model/gltf-binary')
  await writeProjectDirectory(root as unknown as DirectoryHandle, project)
  const loaded = await readProjectDirectory(root as unknown as DirectoryHandle)
  assert.deepEqual(loaded.files, project.files)
  assert.deepEqual(loaded.assets, project.assets)
  assert.deepEqual(loaded.manifest.dependencies, { three: '0.180.0' })
  const portable = validateProject(JSON.parse(JSON.stringify(loaded)))
  assert.deepEqual(decodeAsset(portable.assets!['assets/nested/model space.glb']), bytes)
  const assetDirectory = await root.getDirectoryHandle('assets')
  assetDirectory.children.set('unmanaged.bin', new MemoryFile(new Uint8Array([1, 2])))
  delete loaded.assets!['assets/seed.bin']
  await writeProjectDirectory(root as unknown as DirectoryHandle, loaded)
  assert.equal(assetDirectory.children.has('seed.bin'), false)
  assert.equal(assetDirectory.children.has('unmanaged.bin'), true)
})

test('invalid resource paths, payloads, and unsupported dependencies are rejected', () => {
  assert.throws(() => validateProject({ ...starterThreeProject, assets: { '../model.glb': { mime: 'model/gltf-binary', base64: '' } } }), /escapes/)
  assert.throws(() => validateProject({ ...starterThreeProject, assets: { 'model.glb': { mime: 'model/gltf-binary', base64: 'not base64' } } }), /Invalid asset data/)
  assert.throws(() => validateProject({ ...starterThreeProject, manifest: { ...starterThreeProject.manifest, dependencies: { three: '0.170.0' } } }), /supported bundled versions/)
  assert.throws(() => validateProject({ ...starterThreeProject, assets: { 'project.json': { mime: 'application/json', base64: '' } } }), /Invalid or duplicate/)
})

test('manifest lists exclude unrelated source and report missing managed resources', async () => {
  const root = new MemoryDirectory()
  await writeProjectDirectory(root as unknown as DirectoryHandle, structuredClone(starterThreeProject))
  root.children.set('unrelated.js', new MemoryFile('not part of this project'))
  const loaded = await readProjectDirectory(root as unknown as DirectoryHandle)
  assert.equal(loaded.files['unrelated.js'], undefined)
  const assets = await root.getDirectoryHandle('assets')
  assets.children.delete('seed.bin')
  await assert.rejects(readProjectDirectory(root as unknown as DirectoryHandle), /Project resource not found: assets\/seed\.bin/)
})
