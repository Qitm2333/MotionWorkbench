import { starterHtmlProject, starterProject, validateProject } from './project.ts'
import type { Project, ProjectManifest } from './project.ts'
import { assetMime, encodeAsset } from './assets.ts'
import { starterThreeProject } from './threeProject.ts'

export type Example = {
  id: string
  name: string
  category: 'Exploration' | 'Starter'
  renderer: 'HTML / CSS / JS' | 'Canvas2D / TypeScript' | 'Three.js / WebGL'
  description: string
  highlights: string[]
  projectDirectory?: string
  assetManifest?: string
  viewport?: string
}

export const examples: Example[] = [
  {
    id: 'apple-duo-study',
    name: 'Apple Duo interaction study',
    category: 'Exploration',
    renderer: 'Three.js / WebGL',
    description: 'A source-led reconstruction of Apple\'s foldable product interaction using the local Lotus scene runtime and model assets.',
    highlights: [
      'Open a product pose, use the fold slider, or close the card and drag the model.',
      'Inspect the readable interaction adapter beside the original local scene runtime.',
      'The example includes 327 local model, texture, lighting, and font resources.',
    ],
    projectDirectory: 'apple-duo-study',
    assetManifest: 'asset-manifest.json',
    viewport: '1440x900',
  },
  {
    id: 'three-model-study',
    name: 'Three.js model study',
    category: 'Starter',
    renderer: 'Three.js / WebGL',
    description: 'A local glTF model, studio lighting, orbit controls, and live material parameters.',
    highlights: ['Inspect project-relative glTF and BIN loading.', 'Tune motion, material, and lighting parameters.'],
    viewport: '1024x768',
  },
  {
    id: 'catalog-repro',
    name: 'Catalog motion study',
    category: 'Exploration',
    renderer: 'HTML / CSS / JS',
    description: 'An interactive catalog with branching navigation, expanding cards, and spring motion.',
    highlights: [
      'Click Logo, Digital, or Physical to expand a branch, then hover its cards.',
      'Tune card count, expansion spread, turbulence, stiffness, and damping in Parameters.',
      'Use a viewport wider than 900 px for the tree. Smaller viewports show the grid layout.',
    ],
    projectDirectory: 'catalog-repro',
    viewport: '1440x900',
  },
  {
    id: 'orbit-study',
    name: 'Orbit study',
    category: 'Starter',
    renderer: 'Canvas2D / TypeScript',
    description: 'A multi-file Canvas2D scene with orbiting particles and editable easing curves.',
    highlights: ['Explore project-relative TypeScript imports.', 'Adjust scene parameters and sample named curves.'],
  },
  {
    id: 'motion-postcard',
    name: 'Motion postcard',
    category: 'Starter',
    renderer: 'HTML / CSS / JS',
    description: 'A small HTML and CSS experiment with live visual controls.',
    highlights: ['Edit HTML and CSS as separate files.', 'Expose parameters and use their CSS custom properties.'],
  },
]

/** Load a fresh editable copy. baseUrl includes the Vite/Pages deployment prefix. */
export async function loadExampleProject(id: string, baseUrl: string, signal?: AbortSignal): Promise<Project> {
  const example = examples.find((item) => item.id === id)
  if (!example) throw new Error('Unknown example')
  if (id === 'orbit-study') return validateProject(structuredClone(starterProject))
  if (id === 'motion-postcard') return validateProject(structuredClone(starterHtmlProject))
  if (id === 'three-model-study') return validateProject(structuredClone(starterThreeProject))
  if (!example.projectDirectory) throw new Error('Example source is unavailable')

  const root = `${baseUrl.replace(/\/?$/, '/')}examples/${example.projectDirectory}/`
  const responseFor = async (path: string) => {
    const response = await fetch(`${root}${path}`, { signal })
    if (!response.ok) throw new Error(`Could not load example file: ${path} (${response.status})`)
    return response
  }
  const manifest = JSON.parse(await (await responseFor('project.json')).text()) as ProjectManifest
  if (!Array.isArray(manifest.sourceFiles) || !manifest.sourceFiles.length || manifest.sourceFiles.some((path) => typeof path !== 'string')) {
    throw new Error('Example manifest must list its source files')
  }
  // Validate all manifest paths before fetching any source file.
  let assetFiles = manifest.assetFiles ?? []
  if (example.assetManifest) {
    const catalog = JSON.parse(await (await responseFor(example.assetManifest)).text()) as { assets?: Array<{ file?: unknown }> }
    if (!Array.isArray(catalog.assets) || catalog.assets.some((asset) => typeof asset?.file !== 'string')) throw new Error('Example asset manifest is invalid')
    assetFiles = [...catalog.assets.map((asset) => asset.file as string), 'EVIDENCE.md', example.assetManifest]
  }
  const skeleton = validateProject({
    manifest: { ...manifest, assetFiles },
    files: Object.fromEntries(manifest.sourceFiles.map((path) => [path, ''])),
    assets: Object.fromEntries(assetFiles.map((path) => [path, { mime: assetMime(path), base64: '' }])),
  })
  const files = Object.fromEntries(await Promise.all(Object.keys(skeleton.files).map(async (path) => [path, await (await responseFor(path)).text()])))
  const queue = Object.keys(skeleton.assets ?? {})
  const assets: NonNullable<Project['assets']> = {}
  await Promise.all(Array.from({ length: Math.min(8, queue.length) }, async () => {
    while (queue.length) {
      const path = queue.shift()!
      const response = await responseFor(path)
      assets[path] = encodeAsset(await response.arrayBuffer(), assetMime(path))
    }
  }))
  return validateProject({ manifest: skeleton.manifest, files, assets })
}
