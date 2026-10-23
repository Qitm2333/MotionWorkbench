import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('public/examples')
const routes = [
  ['stripes', 'Stripes'], ['coil', 'Coil'], ['flag', 'Flag'], ['morisawa', 'Morisawa'],
  ['cascade', 'Cascade'], ['ribbon', 'Ribbon'], ['layers', 'Layers'], ['danger', 'Danger'],
  ['string', 'String'], ['badge', 'Badge'], ['clutter', 'Clutter'], ['construct', 'Construct'],
  ['snap', 'Snap'], ['flash', 'Flash'], ['pow', 'Pow'], ['crash', 'Crash'],
  ['crashclock', 'Crash Clock'], ['vessel', 'Vessel'], ['shine', 'Shine'], ['boost', 'Boost'],
  ['boxsquad', 'BoxSquad'],
]
const requested = new Set(process.argv.slice(2))

const sourceExtension = /\.(?:html?|css|js)$/i
const assetExtension = /\.(?:otf|ttf|woff2?|png|jpe?g|gif|svg|mp3|wav|mp4|webm|json)$/i
const analytics = /<script[^>]+(?:googletagmanager|cloudflareinsights|email-decode)[\s\S]*?<\/script>/gi

function localPath(url) {
  return decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '')
}

function localReference(value) {
  return value && !/^(?:https?:|\/\/|data:|blob:|#|mailto:)/i.test(value) && !value.startsWith('/cdn-cgi/')
}

function sourceReferences(html, tag, attribute) {
  const expression = new RegExp(`<${tag}[^>]+${attribute}=["']([^"']+)["']`, 'gi')
  return [...html.matchAll(expression)].map((match) => match[1])
}

function parameterNames(sources) {
  const controls = []
  const patterns = [
    ['range', /([A-Za-z_$][\w$]*)\s*=\s*createSlider\s*\(/g],
    ['checkbox', /([A-Za-z_$][\w$]*)\s*=\s*createCheckbox\s*\(/g],
    ['color', /([A-Za-z_$][\w$]*)\s*=\s*createColorPicker\s*\(/g],
    ['select', /([A-Za-z_$][\w$]*)\s*=\s*createSelect\s*\(/g],
  ]
  for (const source of sources) {
    const found = []
    for (const [type, expression] of patterns) {
      for (const match of source.matchAll(expression)) found.push({ type, name: match[1], offset: match.index })
    }
    controls.push(...found.sort((a, b) => a.offset - b.offset))
  }
  return controls.slice(0, 100)
}

function staticParameterNames(html) {
  const controls = []
  for (const match of html.matchAll(/<(input|select)\b([^>]*)>/gi)) {
    const tag = match[1].toLowerCase(), attributes = match[2]
    const type = tag === 'select' ? 'select' : (/\btype=["']([^"']+)["']/i.exec(attributes)?.[1] || 'text').toLowerCase()
    if (!['range', 'checkbox', 'color', 'select'].includes(type)) continue
    const name = /\b(?:id|name)=["']([^"']+)["']/i.exec(attributes)?.[1] || `control${controls.length + 1}`
    controls.push({ type, name })
  }
  return controls.slice(0, 100)
}

function bridgeSource(specs) {
  return `(() => {
  const specs = ${JSON.stringify(specs)};
  const label = value => value.replace(/(?:Slider|Check|Picker|Select)$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  const slug = (value, index) => (value.replace(/[^A-Za-z0-9_-]/g, '-').replace(/^[^A-Za-z]+/, '') || 'control-' + index).slice(0, 64);
  const start = () => {
    const elements = [...document.querySelectorAll('input[type="range"], input[type="checkbox"], input[type="color"], select')].slice(0, 100);
    if (!elements.length) { setTimeout(start, 250); return; }
    const definitions = {}, records = [];
    elements.forEach((element, index) => {
      const spec = specs[index] || { name: 'control' + (index + 1), type: element.tagName === 'SELECT' ? 'select' : element.type };
      let id = slug(spec.name, index), suffix = 2;
      while (id in definitions) id = (slug(spec.name, index).slice(0, 60) + '-' + suffix++).slice(0, 64);
      let definition;
      if (element.type === 'range') definition = { type: 'number', label: label(spec.name), default: Number(element.value), min: Number(element.min || 0), max: Number(element.max || 100), step: Number(element.step || 1), group: 'Source controls' };
      else if (element.type === 'checkbox') definition = { type: 'boolean', label: label(spec.name), default: element.checked, group: 'Source controls' };
      else if (element.type === 'color') definition = { type: 'color', label: label(spec.name), default: element.value, group: 'Source controls' };
      else definition = { type: 'select', label: label(spec.name), default: element.value, options: [...element.options].map(option => ({ label: option.textContent || option.value, value: option.value })), group: 'Source controls' };
      if (definition.type === 'number' && (!Number.isFinite(definition.default) || !Number.isFinite(definition.min) || !Number.isFinite(definition.max) || definition.min > definition.default || definition.default > definition.max)) return;
      definitions[id] = definition;
      records.push({ id, element, definition });
    });
    if (!Object.keys(definitions).length) return;
    const values = window.workbench?.params?.define?.(definitions);
    if (!values) return;
    let applying = false;
    const apply = detail => {
      applying = true;
      for (const { id, element, definition } of records) {
        const value = detail[id];
        if (definition.type === 'boolean') element.checked = Boolean(value);
        else element.value = String(value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      applying = false;
    };
    document.addEventListener('workbench:params', event => apply(event.detail || values));
    for (const { id, element, definition } of records) element.addEventListener('input', () => {
      if (applying) return;
      values[id] = definition.type === 'number' ? Number(element.value) : definition.type === 'boolean' ? element.checked : element.value;
      parent.postMessage({ type: 'workbench-parameter-values', values: { ...values } }, '*');
    });
  };
  addEventListener('load', () => setTimeout(start, 350), { once: true });
})();
`
}

async function fetchBytes(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return new Uint8Array(await response.arrayBuffer())
}

async function importRoute(route, name) {
  const pageUrl = new URL(`/${route}`, 'https://spacetypegenerator.com/')
  let html = new TextDecoder().decode(await fetchBytes(pageUrl))
  html = html.replace(analytics, '')
  const directory = path.join(root, `space-type-${route}`)
  const sourceFiles = new Map([['index.html', html]])
  const assetFiles = new Map()
  const localUrls = []
  for (const value of sourceReferences(html, 'script', 'src')) if (localReference(value)) localUrls.push(new URL(value, pageUrl))
  for (const value of sourceReferences(html, 'link', 'href')) if (localReference(value) && /stylesheet/i.test(html.slice(Math.max(0, html.indexOf(value) - 80), html.indexOf(value) + value.length + 80))) localUrls.push(new URL(value, pageUrl))

  for (const url of localUrls) {
    const file = localPath(url)
    const bytes = await fetchBytes(url)
    if (sourceExtension.test(file)) sourceFiles.set(file, new TextDecoder().decode(bytes))
    else assetFiles.set(file, bytes)
  }

  const references = []
  for (const [file, source] of sourceFiles) {
    if (file === 'index.html') continue
    const base = new URL(file, 'https://spacetypegenerator.com/')
    for (const match of source.matchAll(/["']([^"'?#]+\.(?:otf|ttf|woff2?|png|jpe?g|gif|svg|mp3|wav|mp4|webm|json))["']/gi)) {
      if (localReference(match[1])) references.push(new URL(match[1], base))
    }
    if (/\.css$/i.test(file)) for (const match of source.matchAll(/url\(\s*["']?([^"')?#]+)["']?\s*\)/gi)) if (localReference(match[1])) references.push(new URL(match[1], base))
  }
  for (const value of [...sourceReferences(html, 'img', 'src'), ...sourceReferences(html, 'source', 'src')]) if (localReference(value)) references.push(new URL(value, pageUrl))
  for (const url of references) {
    const file = localPath(url)
    if (!assetExtension.test(file) || assetFiles.has(file) || sourceFiles.has(file)) continue
    try { assetFiles.set(file, await fetchBytes(url)) } catch { /* Some optional recording assets are generated at runtime. */ }
  }

  const scriptSources = localUrls.filter((url) => /\.js$/i.test(url.pathname)).map((url) => sourceFiles.get(localPath(url)) || '')
  const specs = parameterNames(scriptSources)
  if (!specs.length) specs.push(...staticParameterNames(html))
  sourceFiles.set('workbench-parameters.js', bridgeSource(specs))
  html = html.replace(/<\/body>/i, '<script src="./workbench-parameters.js"></script></body>')
  sourceFiles.set('index.html', html)
  const licensed = scriptSources.some((source) => /Creative Commons Attribution-NonCommercial-ShareAlike 4\.0/i.test(source))
  if (!licensed) return { route, name, licensed, controls: specs.length, skipped: 'No route-level redistribution license found' }
  const evidence = `# ${name} source audit\n\n- Reference: ${pageUrl.href}\n- Retrieved: 2026-10-23\n- Loaded local sources: ${localUrls.map((url) => `\`${localPath(url)}\``).join(', ')}\n- Source license marker: ${licensed ? 'CC BY-NC-SA 4.0 found in the loaded source.' : 'No route-level license marker found; retained for audit but not eligible for publication without rights confirmation.'}\n- Workbench bridge: ${specs.length} source-created range, checkbox, color, and select controls are mirrored into Parameters after p5 setup.\n- Boundary: the route keeps its own source renderer and control lifecycle. Analytics and Cloudflare instrumentation are removed. Third-party CDN libraries retain the exact versions requested by the live page.\n`
  assetFiles.set('EVIDENCE.md', new TextEncoder().encode(evidence))
  if (licensed) assetFiles.set('CC-BY-NC-SA-4.0.md', new TextEncoder().encode('Source code by Kiel Mutschelknaus is redistributed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International.\n\nhttps://creativecommons.org/licenses/by-nc-sa/4.0/\n'))
  const manifest = {
    formatVersion: 1,
    name,
    projectType: 'html',
    entry: 'index.html',
    renderer: { type: 'html' },
    sourceFiles: [...sourceFiles.keys()],
    assetFiles: [...assetFiles.keys()],
    metadata: { source: pageUrl.href, referenceRoute: `/${route}`, referenceRenderer: 'upstream p5.js sketch', licenseNote: licensed ? 'Upstream source retains CC BY-NC-SA 4.0 notice; see evidence and license.' : 'License confirmation required before publication.' },
  }
  await mkdir(directory, { recursive: true })
  for (const [file, source] of sourceFiles) { const target = path.join(directory, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, source) }
  for (const [file, bytes] of assetFiles) { const target = path.join(directory, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes) }
  await writeFile(path.join(directory, 'project.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return { route, name, licensed, controls: specs.length, sources: sourceFiles.size, assets: assetFiles.size }
}

const results = []
for (const [route, name] of routes) {
  if (requested.size && !requested.has(route)) continue
  try { results.push(await importRoute(route, name)) }
  catch (error) { results.push({ route, error: error instanceof Error ? error.message : String(error) }) }
}
console.table(results)
