import { starterHtmlProject, starterProject, validateProject } from './project.ts'
import type { Project, ProjectManifest } from './project.ts'
import { assetMime, encodeAsset } from './assets.ts'
import { starterThreeProject } from './threeProject.ts'
import { createProjectHistoryFromStages } from './projectHistory.ts'
import type { ProjectHistory } from './projectHistory.ts'
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
  stages?: ExampleStage[]
}

export type ExampleStage = {
  id: string
  name: string
  summary: string
  directory: string
}

const existingExamples: Example[] = [
  {
    id: 'apple-music-liquid',
    name: 'Apple Music liquid logo',
    category: 'Exploration',
    renderer: 'WebGL2 / spectral optics',
    description: 'A source-faithful reconstruction of the four-second Apple Music liquid-logo film: fitted oil surfaces, spectral refraction, studio reflections, motion blur, bloom, and two editable shots.',
    highlights: [
      'Play, scrub, or step the original two-shot timeline frame by frame.',
      'Tune the source project\'s oil, lighting, grading, spectral sampling, and shutter controls in Parameters.',
      'Drop a logo onto the frame or replace the icon and wordmark independently.',
    ],
    projectDirectory: 'apple-music-liquid',
    viewport: '1200x800',
    compatibility: 'Requires WebGL2 and EXT_color_buffer_float',
    source: 'apple-music-effect.transitivebullsh.it',
    license: 'MIT source adaptation; Apple study artwork is separately attributed in EVIDENCE.md',
  },
  {
    id: 'kube-liquid-glass',
    name: 'Liquid Glass / Switch',
    category: 'Design Engineering',
    renderer: 'HTML / SVG filter',
    description: 'A source-led reconstruction of Kube\'s draggable liquid-glass switch, with the original active-state treatment and editable refraction controls.',
    highlights: [
      'Drag the glass thumb or click the switch; Force active previews the pressed lens state.',
      'Tune specular opacity, saturation, refraction, and blur in Parameters.',
      'Uses the article\'s Chromium-only SVG backdrop-filter technique with a visible fallback elsewhere.',
    ],
    projectDirectory: 'kube-liquid-glass',
    viewport: '1200x900',
    compatibility: 'SVG backdrop-filter currently supported in Chromium; fallback elsewhere',
    source: 'kube.io/blog/liquid-glass-css-svg',
    license: 'Source-led Kube study; local filter-map geometry adapted under MIT. See EVIDENCE.md and LICENSE.md.',
  },
  {
    id: 'kube-liquid-glass-slider',
    name: 'Liquid Glass / Slider',
    category: 'Design Engineering',
    renderer: 'HTML / SVG filter',
    description: 'A source-led reconstruction of Kube\'s liquid-glass range control, with a refractive convex bezel and live value tracking.',
    highlights: [
      'Drag, click, or use arrow keys to change the value.',
      'Tune specular opacity, saturation, refraction, and blur in Parameters.',
      'Uses a frosted-glass fallback in browsers without SVG backdrop-filter support.',
    ],
    projectDirectory: 'kube-liquid-glass-slider',
    viewport: '1200x800',
    compatibility: 'SVG backdrop-filter currently supported in Chromium; fallback elsewhere',
    source: 'kube.io/blog/liquid-glass-css-svg',
    license: 'Source-led Kube study; local filter-map geometry adapted under MIT. See EVIDENCE.md and LICENSE.md.',
  },
  {
    id: 'kube-liquid-glass-music-player',
    name: 'Liquid Glass / Music Player',
    category: 'Design Engineering',
    renderer: 'HTML / SVG filter',
    description: 'A source-led reconstruction of Kube\'s album search and floating liquid-glass player, including the layered progressive blur.',
    highlights: [
      'Search the iTunes catalog and select an album to update the floating player.',
      'Transport controls reproduce the reference interaction state; the source player does not stream audio.',
      'Tune glass, progressive blur, and surface opacity in Parameters.',
    ],
    projectDirectory: 'kube-liquid-glass-music-player',
    viewport: '1200x900',
    compatibility: 'SVG backdrop-filter currently supported in Chromium; fallback elsewhere',
    source: 'kube.io/blog/liquid-glass-css-svg',
    license: 'Source-led Kube study; local filter-map geometry adapted under MIT. See EVIDENCE.md and LICENSE.md.',
  },
  {
    id: 'atom63-connected-panel',
    name: 'Connected Panel',
    category: 'Design Engineering',
    renderer: 'HTML / CSS · History study',
    description: 'An editable reconstruction of Connected Panel. Its three published build steps are available as snapshots on the project History main line.',
    highlights: [
      'The project opens at the final iteration with all earlier code snapshots in History.',
      'The snapshots follow the three steps documented in the article; they are not original author commits.',
    ],
    projectDirectory: 'atom63-connected-panel',
    viewport: '900x600',
    source: 'atom63.io/writing/connected-panel',
    stages: [
      { id: 'connect', name: 'Connect the surface', summary: 'Bring the trigger and panel into one surface; the shell grows from 172px to 260px.', directory: 'stages/01-connect' },
      { id: 'stabilize', name: 'Stabilize the content', summary: 'Constrain the flex content with min-width: 0 and a 258px content width inside the clipped shell.', directory: 'stages/02-stabilize' },
      { id: 'reveal', name: 'Polish the reveal', summary: 'Reveal with opacity, 2px blur and scale; the article specifies a 0.32s duration and separate easing curves.', directory: 'stages/03-reveal' },
    ],
  },
  {
    id: 'atom63-halftone',
    name: 'Antimetal Halftone',
    category: 'Design Engineering',
    renderer: 'Canvas2D · History study',
    description: 'An editable Canvas2D study of the Antimetal halftone. Its six documented construction steps are available as snapshots on the project History main line.',
    highlights: [
      'The project opens at the complete effect; earlier construction steps are available in History.',
      'The article documents the layer order, not six historical source snapshots.',
      'Parameters are defined by the project and remain editable in Workbench.',
    ],
    projectDirectory: 'atom63-halftone',
    viewport: '1440x900',
    source: 'atom63.io/writing/halftone',
    license: 'Source-study implementation; no Antimetal assets or ATOM63 branding redistributed',
    stages: [
      { id: 'core', name: 'Core disc', summary: 'Start with a breathing core sampled across a hex-offset Canvas2D dot grid.', directory: 'stages/01-core' },
      { id: 'ring-1', name: 'Ring 1', summary: 'Add the first angle-modulated ring around the core.', directory: 'stages/02-ring-1' },
      { id: 'ring-2', name: 'Ring 2', summary: 'Add the second ring with a separate angular wave and radius.', directory: 'stages/03-ring-2' },
      { id: 'cells', name: 'Cells', summary: 'Add moving Gaussian cells as independent amplitude sources.', directory: 'stages/04-cells' },
      { id: 'shapes', name: 'Shapes', summary: 'Blend soft square and circular distance fields into the dot field.', directory: 'stages/05-shapes' },
      { id: 'cursor-trail', name: 'Cursor trail', summary: 'Finish with a time-decaying pointer trail; the full source exposes replay and reset actions.', directory: 'stages/06-cursor-trail' },
    ],
  },
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
    id: 'ice-works-showcase',
    name: 'Ice Works showcase study',
    category: 'Exploration',
    renderer: 'Three.js / WebGL',
    description: 'A source-level port of the Ice Works liquid ring carousel, including its SDF field, ASCII assembly, glass refraction, inertial input, and editable controls.',
    highlights: [
      'Explore 18 procedural project cards through the original full-screen GLSL liquid field.',
      'Use wheel, angle-based drag, hover, and click-to-focus with the original GSAP timing.',
      'Tune the source project\'s fit, ring, entry, glass, pointer, particle, and honey controls.',
    ],
    projectDirectory: 'ice-works-showcase',
    viewport: '1440x900',
    source: 'github.com/MegD1/Ice-works-showcase',
    license: 'MIT source adaptation; GSAP Standard License dependency; see EVIDENCE.md',
  },
  {
    id: 'ice-paper-wake',
    name: 'Ice Paper Wake',
    category: 'Exploration',
    renderer: 'Three.js / WebGL',
    description: 'The source paper-wake renderer: a persistent cursor trail lifts, curls, blurs and dithers an image mesh in real time.',
    highlights: [
      'Preserves the half-float trail, subdivided image mesh, four-level blur and paper composite shader.',
      'Tune trail, paper, mesh, dither and palette controls without remounting the renderer.',
      'Uses new local vector artwork because the upstream demo photograph is excluded from its MIT license.',
    ],
    projectDirectory: 'ice-paper-wake',
    viewport: '1440x900',
    source: 'github.com/MegD1/Ice-paper-wake',
    license: 'MIT source adaptation; demo image replaced',
  },
  {
    id: 'ice-ascii-goldfish',
    name: 'ASCII Goldfish Glass',
    category: 'Exploration',
    renderer: 'Canvas2D / HTML',
    description: 'A character-rendered goldfish pond with path-history bodies, feeding, avoidance and a draggable refractive glass controller.',
    highlights: [
      'Keeps the original Canvas2D simulation, ASCII renderer and canvas-sampled glass refraction.',
      'Feed, add or remove fish, pause, reset and switch the pond background.',
      'The native glass UI and Workbench Parameters stay synchronized.',
    ],
    projectDirectory: 'ice-ascii-goldfish',
    viewport: '1440x900',
    source: 'github.com/MegD1/Ice-ascii-goldfish',
    license: 'MIT',
  },
  {
    id: 'ice-paperbound',
    name: 'Paperbound interaction study',
    category: 'Exploration',
    renderer: 'Three.js / WebGL',
    description: 'The source material-library bookshelf, with its original paper and cloth atlas, binding geometry, interior pages and staged GSAP interactions.',
    highlights: [
      'Select a spine to extract and turn its volume, then select it again to open the cover.',
      'Tune source hover lift/depth, motion speed, cover opening, camera and pointer parallax in Parameters.',
      'Preserves the source book dimensions, worn material atlas, tape, rounded binding and interior typography.',
    ],
    projectDirectory: 'ice-paperbound',
    viewport: '1440x900',
    source: 'github.com/MegD1/Ice-Paperbound',
    license: 'Source adaptation; upstream license unspecified; see EVIDENCE.md',
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
    id: 'text-image-letters',
    name: 'Text to image letters',
    category: 'Exploration',
    renderer: 'HTML / CSS / JS',
    description: 'A source-led, no-dependency typography study where individual letters reveal position-specific image variations on hover, touch, and automatic playback.',
    highlights: [
      'Hover or touch each letter to reveal one of its locally bundled image variations.',
      'Tune entry/exit timing, simultaneous image count, and automatic playback in Parameters.',
      'Includes the upstream MIT license, asset-generation guide, and prompt ledger.',
    ],
    projectDirectory: 'text-image-letters',
    viewport: '1440x900',
    source: 'github.com/boknowsworld/boknows-text-image-template',
    license: 'MIT',
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
  {
    id: 'demo-festival-motion',
    name: 'DEMO Festival letter motion',
    category: 'Typography',
    renderer: 'WebGL / HTML project study',
    description: 'A source-audited reconstruction of DEMO Festival\'s four-glyph hero, with the traced Cables timelines, texture deformation, idle performance, and post-processing.',
    highlights: [
      'Uses the four source glyph textures and the traced two-stage cubic-Bezier UV deformation pipeline.',
      'Preserves the intro, pointer smoothing, independent quadrant timelines, inactivity trigger, Levels, and FXAA passes.',
      'Tune motion, pointer response, layout gaps, levels, colors, and rendering from Parameters.',
    ],
    projectDirectory: 'demo-festival',
    viewport: '1440x900',
    source: 'demofestival.com',
    license: 'Source-study implementation; glyph artwork attribution and evidence in EVIDENCE.md',
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

export async function loadExampleStageProject(id: string, stageId: string, baseUrl: string, signal?: AbortSignal): Promise<Project> {
  const example = examples.find((item) => item.id === id)
  const stage = example?.stages?.find((item) => item.id === stageId)
  if (!example?.projectDirectory || !stage) throw new Error('Unknown example stage')
  return loadProjectFromRoot(`${baseUrl.replace(/\/?$/, '/')}examples/${example.projectDirectory}/${stage.directory}/`, signal)
}

export async function loadExampleProjectWithHistory(id: string, baseUrl: string, signal?: AbortSignal): Promise<{ project: Project; history?: ProjectHistory }> {
  const example = examples.find((item) => item.id === id)
  if (!example) throw new Error('Unknown example')
  if (!example.stages?.length) return { project: await loadExampleProject(id, baseUrl, signal) }
  const stages = await Promise.all(example.stages.map(async (stage, index) => ({
    label: stage.name,
    project: index === example.stages!.length - 1
      ? await loadExampleProject(id, baseUrl, signal)
      : await loadExampleStageProject(id, stage.id, baseUrl, signal),
  })))
  return createProjectHistoryFromStages(stages)
}

/** Load a fresh editable copy. baseUrl includes the Vite/Pages deployment prefix. */
export async function loadExampleProject(id: string, baseUrl: string, signal?: AbortSignal): Promise<Project> {
  const example = examples.find((item) => item.id === id)
  if (!example) throw new Error('Unknown example')
  if (id === 'orbit-study') return validateProject(structuredClone(starterProject))
  if (id === 'motion-postcard') return validateProject(structuredClone(starterHtmlProject))
  if (id === 'three-model-study') return validateProject(structuredClone(starterThreeProject))
  if (!example.projectDirectory) throw new Error('Example source is unavailable')

  const root = `${baseUrl.replace(/\/?$/, '/')}examples/${example.projectDirectory}/`
  return loadProjectFromRoot(root, signal, example.assetManifest)
}

async function loadProjectFromRoot(root: string, signal?: AbortSignal, assetManifest?: string): Promise<Project> {
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
  if (assetManifest) {
    const catalog = JSON.parse(await (await responseFor(assetManifest)).text()) as { assets?: Array<{ file?: unknown }> }
    if (!Array.isArray(catalog.assets) || catalog.assets.some((asset) => typeof asset?.file !== 'string')) throw new Error('Example asset manifest is invalid')
    assetFiles = [...catalog.assets.map((asset) => asset.file as string), 'EVIDENCE.md', assetManifest]
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
