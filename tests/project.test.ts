import assert from 'node:assert/strict'
import test from 'node:test'
import { createCurveFromPreset, curvePresets, sampleCurveValue, starterProject, starterHtmlProject, validateProject, writeProjectDirectory } from '../src/project.ts'
import type { DirectoryHandle } from '../src/project.ts'

class MemoryFile {
  readonly kind = 'file'
  contents: string
  constructor(contents: string) { this.contents = contents }
  async getFile() { return { text: async () => this.contents } }
  async createWritable() {
    return {
      write: async (contents: string) => { this.contents = contents },
      close: async () => {},
    }
  }
}

class MemoryDirectory {
  readonly kind = 'directory'
  readonly children = new Map<string, MemoryDirectory | MemoryFile>()
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
  const writtenManifest = JSON.parse((root.children.get('project.json') as MemoryFile).contents)
  assert.deepEqual(writtenManifest.sourceFiles, ['index.html'])
})
