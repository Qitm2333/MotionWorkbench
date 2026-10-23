import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { sourceControlBindings, sourceControlSpecs, sourcePresetLabels } from './space-type-bridge.mjs'

const root = path.resolve('public/examples')
const runtime = await readFile(new URL('./space-type-bridge-runtime.js', import.meta.url), 'utf8')
const directories = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory() && entry.name.startsWith('space-type-') && !['space-type-cylinder', 'space-type-field'].includes(entry.name))
for (const entry of directories) {
  const directory = path.join(root, entry.name)
  const manifest = JSON.parse(await readFile(path.join(directory, 'project.json'), 'utf8'))
  if (!manifest.sourceFiles.includes('workbench-parameters.js')) continue
  const html = await readFile(path.join(directory, 'index.html'), 'utf8')
  const scripts = []
  for (const file of manifest.sourceFiles.filter((file) => file.endsWith('.js') && file !== 'workbench-parameters.js')) scripts.push(await readFile(path.join(directory, file), 'utf8'))
  const dynamicSpecs = sourceControlSpecs(scripts)
  const presetLabels = sourcePresetLabels(scripts, html)
  const config = 'window.__SPACE_TYPE_WORKBENCH__ = ' + JSON.stringify({ dynamicSpecs, presetLabels }) + ';\n'
  await writeFile(path.join(directory, 'workbench-parameters.js'), config + sourceControlBindings(dynamicSpecs) + runtime)
  const evidencePath = path.join(directory, 'EVIDENCE.md')
  let evidence = await readFile(evidencePath, 'utf8')
  evidence = evidence.replace(/- Workbench bridge:.*(?:\r?\n|$)/, `- Workbench bridge: ${dynamicSpecs.length} dynamically created controls were found in source. After p5 setup, actual DOM range, checkbox, radio, color, select, and string controls are mirrored into Parameters.\n`)
  evidence = evidence.replace(/\n## Workbench control integration[\s\S]*$/, '')
  evidence += `\n## Workbench control integration\n\n- Confirmed source presets/actions: ${presetLabels.length ? presetLabels.join(', ') : 'No preset buttons in this route; none invented.'}\n- Input chain: Workbench parameter event -> source DOM input/change or p5 mousePressed (mousedown) / HTML click callback -> source renderer state -> source controls read back into Parameters. Only changed fields are replayed; batched restoration applies the preset before saved overrides.\n- Dynamic p5 controls bind to their source variables rather than generated random checkbox names, keeping saved parameter IDs stable across iframe reloads.\n- Original DOM controls and navigation are hidden before setup; local sketch copies also suppress canvas-painted labels. Source rendering remains active.\n- Source palette count, where present, is authoritative over inconsistent preset checkbox state and is saved explicitly. String strip counts and choices are synchronized from the source lexical state.\n- Browser regression: tests/e2e/typography.spec.ts exercises initial canvas creation, every string control and source preset, hidden controls, panel readback, paused changes, and reapply at 1500 x 1000. This does not establish pixel-identical rendering or Safari support.\n`
  await writeFile(evidencePath, evidence)
  console.log(entry.name + ': ' + dynamicSpecs.length + ' dynamic controls, ' + presetLabels.length + ' presets')
}
