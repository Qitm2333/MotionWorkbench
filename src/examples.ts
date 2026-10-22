import { starterHtmlProject, starterProject, validateProject } from './project.ts'
import type { Project, ProjectManifest } from './project.ts'

export type Example = {
  id: string
  name: string
  category: 'Exploration' | 'Starter'
  renderer: 'HTML / CSS / JS' | 'Canvas2D / TypeScript'
  description: string
  highlights: string[]
  projectDirectory?: string
  viewport?: string
}

export const examples: Example[] = [
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
  if (!example.projectDirectory) throw new Error('Example source is unavailable')

  const root = `${baseUrl.replace(/\/?$/, '/')}examples/${example.projectDirectory}/`
  const read = async (path: string) => {
    const response = await fetch(`${root}${path}`, { signal })
    if (!response.ok) throw new Error(`Could not load example file: ${path} (${response.status})`)
    return response.text()
  }
  const manifest = JSON.parse(await read('project.json')) as ProjectManifest
  if (!Array.isArray(manifest.sourceFiles) || !manifest.sourceFiles.length || manifest.sourceFiles.some((path) => typeof path !== 'string')) {
    throw new Error('Example manifest must list its source files')
  }
  // Validate all manifest paths before fetching any source file.
  const skeleton = validateProject({ manifest, files: Object.fromEntries(manifest.sourceFiles.map((path) => [path, ''])) })
  const files = Object.fromEntries(await Promise.all(Object.keys(skeleton.files).map(async (path) => [path, await read(path)])))
  return validateProject({ manifest: skeleton.manifest, files })
}
