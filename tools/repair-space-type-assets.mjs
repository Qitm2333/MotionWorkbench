// Repair the document-relative assets missed by the original script-relative scan.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

for (const route of ['construct', 'snap', 'flash']) {
  const directory = path.resolve('public/examples/space-type-' + route)
  const manifest = JSON.parse(await readFile(path.join(directory, 'project.json'), 'utf8'))
  const resources = new Set()
  for (const file of manifest.sourceFiles.filter((file) => file.endsWith('.js'))) {
    const source = (await readFile(path.join(directory, file), 'utf8')).replace(/^\s*\/\/.*$/gm, '')
    for (const match of source.matchAll(/load(?:Font|Image)\(\s*(['"])([^'"]+\.(?:otf|ttf|png|gif|jpe?g))\1\s*\)/g)) resources.add(match[2])
  }
  // construct/sketch.js preload() explicitly loads gifs numbered 0..10.
  if (route === 'construct') for (let index = 0; index < 11; index++) resources.add(`construct/resources/gifs/${index}.gif`)
  for (const file of resources) {
    if (manifest.assetFiles.includes(file)) continue
    const url = new URL(file, manifest.metadata.source)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${response.status}: ${url}`)
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (/text\/html/i.test(response.headers.get('content-type') || '')) throw new Error(`Expected asset, received HTML: ${url}`)
    await mkdir(path.dirname(path.join(directory, file)), { recursive: true })
    await writeFile(path.join(directory, file), bytes)
    manifest.assetFiles.push(file)
    console.log(`${route}: ${file} (${bytes.length} bytes)`)
  }
  await writeFile(path.join(directory, 'project.json'), JSON.stringify(manifest, null, 2) + '\n')
}
