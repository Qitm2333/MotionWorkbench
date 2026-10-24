import { starterHtmlProject, starterProject, validateProject } from './project.ts'
import type { Project, ProjectManifest } from './project.ts'
import { assetMime, encodeAsset } from './assets.ts'
import { starterThreeProject } from './threeProject.ts'
import benchoCatalog from './benchoExamples.json' with { type: 'json' }

export type Example = {
  id: string
  name: string
  category: string
  renderer: string
  description: string
  highlights: string[]
  projectDirectory?: string
  assetManifest?: string
  viewport?: string
  compatibility?: string
  source?: string
  license?: string
}

const existingExamples: Example[] = [
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
  {
    id: 'space-type-cylinder',
    name: 'Space Type Generator / Cylinder',
    category: 'Typography',
    renderer: 'Canvas2D / HTML project study',
    description: 'A source-led reconstruction of the Cylinder route: layered glyph rings, the reference wave/camera controls, and seven source-backed presets.',
    highlights: [
      'Adjust the Cylinder, Wave, Type, Form Tweak, Camera, and Color parameters in the Parameters panel.',
      'Select Simple, Jellyfish, Crown, Complex, Weave, Zebra, or Hoops to apply the observed source values.',
      'Uses the source vector keyboard through a Canvas2D adapter; projection and antialiasing differ from p5 WEBGL.',
    ],
    projectDirectory: 'space-type-cylinder',
    viewport: '1440x900',
    source: 'spacetypegenerator.com/',
  },
  {
    id: 'space-type-field',
    name: 'Space Type Generator / Field',
    category: 'Typography',
    renderer: 'Canvas2D / HTML project study',
    description: 'A source-led reconstruction of the Field route: a text-filled spatial grid with per-cell wave, type, palette, and camera controls.',
    highlights: [
      'Choose Full Text or a single pass through the input phrase, then shape its grid with the source parameters.',
      'Select Stacks, Bricks, Simple Z, Complex Z, Zebra, or Harlequin to apply the observed source values.',
      'Uses the source vector keyboard through a Canvas2D adapter; projection and antialiasing differ from p5 WEBGL.',
    ],
    projectDirectory: 'space-type-field',
    viewport: '1440x900',
    source: 'spacetypegenerator.com/field',
  },
  {
    id: 'type-physics-study',
    name: 'Type Physics+ mechanism study',
    category: 'Typography',
    renderer: 'Canvas2D / HTML project study',
    description: 'A source-audited study of Type Physics+ per-glyph layouts, collisions, dragging, forces, and contour rendering.',
    highlights: [
      'Uses the confirmed nine layout formulas and one authoritative per-glyph physics state.',
      'Exposes typography, collision, force, orbit, pointer, and passive-effect controls in Parameters.',
      'No Type.Today source, fonts, audio, or branding assets are redistributed.',
    ],
    projectDirectory: 'type-physics-study',
    viewport: '1440x900',
    source: 'typephysics.type.today',
    license: 'Clean-room mechanism study',
  },
]

const benchoExamples: Example[] = benchoCatalog.map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  renderer: item.renderer,
  description: item.description || 'Interactive React component from the MIT-licensed Bencho Blocks collection.',
  highlights: [item.compatibility, `Dependencies: ${item.dependencies.join(', ') || 'React'}`, 'Open as an editable React project copy.'],
  projectDirectory: `bencho/${item.folder}`,
  compatibility: item.compatibility,
  source: 'cabralorenzo/bencho',
  license: 'MIT',
}))

const spaceTypeRoutes = [
  ['stripes', 'Stripes'], ['coil', 'Coil'], ['flag', 'Flag'], ['morisawa', 'Morisawa'],
  ['cascade', 'Cascade'], ['ribbon', 'Ribbon'], ['layers', 'Layers'], ['danger', 'Danger'],
  ['string', 'String'], ['badge', 'Badge'], ['construct', 'Construct'], ['snap', 'Snap'],
  ['flash', 'Flash'], ['pow', 'Pow'], ['crash', 'Crash'], ['crashclock', 'Crash Clock'],
  ['vessel', 'Vessel'], ['shine', 'Shine'],
] as const

const importedSpaceTypeExamples: Example[] = spaceTypeRoutes.map(([route, name]) => ({
  id: `space-type-${route}`,
  name: `Space Type Generator / ${name}`,
  category: 'Typography',
  renderer: 'Original p5.js study',
  description: `The source-backed ${name} route running as an editable Workbench HTML project.`,
  highlights: [
    'Keeps the route-specific source renderer, motion model, controls, and loaded assets.',
    'Mirrors the source-created controls into the Workbench Parameters view.',
    'Retains upstream attribution and the CC BY-NC-SA 4.0 source license notice.',
  ],
  projectDirectory: `space-type-${route}`,
  viewport: '1440x900',
  source: `spacetypegenerator.com/${route}`,
  license: 'CC BY-NC-SA 4.0',
}))

export const examples: Example[] = [...existingExamples, ...importedSpaceTypeExamples, ...benchoExamples]

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
