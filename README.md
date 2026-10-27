# MotionWorkbench

MotionWorkbench is a code-first browser workspace for making, studying, and tuning web motion. It combines a multi-file code editor, a live Canvas2D, HTML/CSS, React, or Three.js preview, and controls for exposing motion parameters and easing curves.

The workflow is to open an experiment, experience its interaction, inspect or change its source, and tune its parameters beside the running preview. Code, Parameters, and the curve editor share the main workspace, so each task has room without keeping every tool visible. Projects stay readable and portable; examples open as editable projects rather than embedded demonstrations.

## What it supports

- **Canvas2D projects** written in JavaScript or TypeScript. Project-relative imports are bundled in the browser with esbuild-wasm.
- **HTML + CSS + JavaScript projects** with project-relative stylesheets, scripts, ES modules, and local resources in the preview.
- **React + TypeScript projects** with multi-file TSX components, local CSS, a dedicated starter, and a bundled dependency runtime.
- **Three.js projects** with bundled `three@0.180.0` and WebGL addons, local glTF/GLB models, textures, orbit controls, and live parameters.
- A project Explorer with nested files, drag-and-drop import, rename, entry-file selection, and protected double-click deletion.
- Live parameter controls and an editable curve library with linear, easing, overshoot, and spring presets.
- A resizable editor/preview layout, viewport dimensions, Fit and percentage zoom controls, expanded preview, dark/light themes, and adjustable Consolas code text.
- Readable project folders, portable JSON import/export, and local draft recovery.
- A searchable, category-filtered **Examples** browser with 41 Bencho Blocks, typography studies, interactive explorations, and starter projects; each opens as an editable copy and runs automatically.

## Requirements

- Node.js **22.12 or newer** (or Node.js 20.19 or newer)
- npm
- A modern browser; Chromium-based browsers provide the best support for opening and saving project folders.

Folder access uses the browser File System Access API and requires a secure context (for local development, `localhost` is secure). Other browsers can use the portable JSON Import and Export actions.

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The starter Canvas2D project is applied automatically. Use **New** to choose Canvas2D, HTML + CSS, React + TypeScript, or Three.js, or **Open** to load an existing project folder.

## Everyday workflow

1. Create a project or open a folder. The Explorer shows its source tree.
2. Add files with the Explorer's **+** button, or drag supported files into the tree.
3. Edit files in the code editor. **Ctrl/Cmd+Z** and **Ctrl/Cmd+Shift+Z** undo and redo. **Ctrl/Cmd+S** saves and reapplies the current project to refresh the preview.
4. Use the Explorer's **Parameters** switch or select a curve to edit it in the main workspace. Changes are applied live where supported.
5. Use the preview toolbar to choose an HTML viewport, change zoom, pause/resume or reset the preview, or expand it to fill the app window.
6. **Save** writes the project folder. **Export** downloads a portable JSON bundle containing all project source and local assets; **Import** loads one of those bundles.

Explorer row actions appear on hover. Rename preserves the file's folder and updates detected project-relative references. A file can only be deleted by double-clicking its delete icon; the entry file cannot be deleted.

The editor's **− / +** controls change the code font size from 10–32 px. The reset button returns it to 13 px. The selection is remembered in this browser.

## Examples and explorations

Open **Examples** beside New / Open / Save to browse past explorations and starter projects. Search by name, renderer, or description, or filter by category. The scrollable results list and separate details panel keep the gallery usable as it grows. Select a study to read about its interactions and available parameters, then open it. All source files appear in Explorer and the preview applies automatically. An unsaved-work notice appears before replacing the workspace.

| Category | Included studies |
| --- | --- |
| Starter | Orbit study (Canvas2D), Motion postcard (HTML/CSS), and Three.js model study. The React starter is available through **New**. |
| Bencho Block | 41 MIT-licensed React component studies from [Bencho](https://bencho.dev/), opened as editable TSX/CSS projects using the bundled runtime. |
| Typography | 20 Space Type Generator routes, Type Physics+ mechanism study, and DEMO Festival letter motion. |
| Exploration | Apple Duo, Catalog, Ice Works showcase, Ice Paper Wake, ASCII Goldfish Glass, Paperbound, and Text to image letters. |

The **Catalog motion study** includes branching navigation, card expansion, and five motion parameters. It opens at **1440 × 900** with Fit zoom so the tree interaction is visible even in a narrow preview panel. Its original responsive behavior uses a grid at widths of 900 px or below; the view toggle inside the example switches between tree and grid.

Examples load as independent copies. **Save** chooses a new project folder, **Export** includes the complete editable source, and reopening an example starts from its bundled version. The repository keeps readable sources and a manifest under [`public/examples/`](./public/examples/); [`src/examples.ts`](./src/examples.ts) registers the gallery entries. Source files load from the same deployment, including GitHub Pages project paths.

The **Apple Duo interaction study** includes a local Lotus runtime (which bundles its own Three.js implementation), seven product poses, a fold slider, and drag rotation. Its 327 runtime resources total approximately 38 MB; they load only when opening this example. The original runtime and provenance notes remain alongside the readable study adapter. This example retains its upstream engine instead of replacing it with the starter's Three.js version.

The **Ice Works showcase study** preserves the source liquid-ring carousel, its GLSL field, glass refraction, inertial input, and GSAP timing. Wheel, drag, hover, and click-to-focus interactions remain available alongside Workbench parameters.

The three **Ice** explorations preserve different implementation boundaries. **Ice Paper Wake** retains its MIT-licensed Three.js trail and paper shaders but replaces the upstream restricted photograph. **ASCII Goldfish Glass** retains the MIT Canvas2D simulation and adds synchronized Workbench controls. **Paperbound interaction study** ports the source bookshelf, material atlas, rounded binding, interior pages and staged GSAP transitions, with synchronized Workbench selection and motion controls. Paperbound's upstream commit does not specify a project license; its attribution and provenance are recorded without labeling it MIT. Each project includes an `EVIDENCE.md` ledger with the audited commit and adaptation boundary.

The **Three.js model study** is also available under **New → Three.js**. It loads a small local glTF model with a separate BIN buffer, adds studio lighting and OrbitControls, and exposes seven motion, material, and lighting parameters. Imports use `three` and `three/addons/...`; no CDN connection is needed.

The **Space Type Generator** collection includes Cylinder, Field, Stripes, Coil, Flag, Morisawa, Cascade, Ribbon, Layers, Danger, String, Badge, Construct, Snap, Flash, Pow, Crash, Crash Clock, Vessel, and Shine. Cylinder and Field adapt the source vector glyphs to Canvas2D; the other 18 studies retain their route-specific p5.js renderers. Available text inputs and source presets are exposed in Parameters, with the source page's editing controls hidden.

The **DEMO Festival letter motion** study reconstructs the traced Cables hero in readable WebGL: four glyph textures, per-letter pointer deformation, intro and idle timelines, and Levels/FXAA passes. It uses the source raster glyph artwork, not a variable font or a bundled Cables editor. **Text to image letters** retains the source letter-hover image variations, touch interaction, and automatic playback, with local images and tunable timing.

Examples have separate source and asset terms. Bencho Blocks and several Ice studies carry MIT licenses; the 18 imported Space Type routes retain CC BY-NC-SA 4.0 notices. Other studies record attribution, independent implementation boundaries, or unspecified upstream licensing. Consult each project's license and `EVIDENCE.md` where supplied before reusing its code or artwork; the gallery does not give every example one shared license.

## Bundled project runtimes

Workbench supplies a supported set of dependency versions instead of installing npm packages for each project. React and Three.js runtime files are served from the same deployment; the React preview runtime is fetched when needed, cached for the session, and initialized inside the sandbox before project modules execute. Example sources and assets load when the example is opened.

| Dependency | Supported version | Project usage |
| --- | --- | --- |
| React / React DOM | 19.3.1 | React projects; `react`, `react-dom/client`, and `react/jsx-runtime` imports. |
| Framer Motion | 13.5.1 | React projects; supported motion components, functions, and hooks. |
| Lucide React | 1.60.0 | React projects; the icon exports exposed by the runtime. |
| Liquid Gooey | 0.2.2 | React projects; `Liquid`. |
| Three.js | 0.180.0 | HTML or React projects; `three` and `three/addons/...`. |

Declare the dependencies a project uses in `project.json`, using these exact versions. The compiler bridges supported exports in [`src/runtime.ts`](./src/runtime.ts); it does not expose every API of every bundled package. Arbitrary npm imports, other versions, and unlisted package subpaths are unsupported. A conventional React/Vite repository may therefore need adaptation before it can run here.

These shared runtimes avoid putting a separate `node_modules` into every example. They are still included in the production deployment, and large study assets still contribute to its total size; loading a project on demand does not remove its download or GPU cost.

## Skill backups

[`skills/`](./skills/) preserves user-provided skills separately from the application. The `source-first-web-motion-repro-v2.0` archive is unpacked there with its original instructions, references, extraction script, and agent metadata. It is a Git backup only, with no installation, runtime integration, or deployment in the app build. See [`skills/README.md`](./skills/README.md) for the original archive checksum.

## Project folder format

A saved project is a readable directory: source files remain ordinary text files, while `project.json` stores the versioned manifest, entry file, renderer settings, curves, and saved parameter overrides. For example:

```text
orbit-study/
├── project.json
└── src/
    ├── main.ts
    └── orbit-scene.ts
```

The manifest includes `formatVersion: 1`, `projectType` (`canvas2d`, `html`, or `react`), `entry`, `renderer`, and a `sourceFiles` list. Resource projects also have `assetFiles`; Three.js templates declare `dependencies: { "three": "0.180.0" }`, while React templates declare `dependencies: { "react": "19.3.1" }`. Three.js is an HTML/WebGL starter rather than a separate manifest project type. These lists distinguish managed files when saving; unrelated files in the directory are left alone. Models, textures, fonts, media, and scene data keep their original bytes and directory structure. Explorer lists them separately under Assets.

Canvas2D relative imports such as `import { makeScene } from './scene'` are resolved within the project. HTML projects can link project files using relative paths, for example `./styles.css` and `./src/main.js`; linked CSS and JavaScript are incorporated into the sandboxed preview. Remote or absolute resources remain subject to browser/network and sandbox restrictions.

Portable exports are a single `.motionworkbench.json` file containing the manifest, editable source, and local assets (Base64 with MIME types). Opening the exported file restores those resources without the original folder. Remote resources are not downloaded into exports. Unsaved drafts use IndexedDB, including assets, rather than the small localStorage quota.

HTML and React previews compile local module scripts and create resource Blob URLs inside the isolated iframe. Relative `fetch`, XHR, CSS URLs, images, and external glTF buffers/textures resolve against the project's virtual directory. Prefer `new URL('./assets/model.glb', document.baseURI)` for runtime resource URLs. The iframe retains `sandbox="allow-scripts"`, without access to the workbench DOM or storage.

## Exposing parameters

Parameters are declared by project code; MotionWorkbench builds the matching controls automatically. Definitions and defaults live in source code, while the user's current values are saved as overrides in `project.json`.

### Canvas2D (JavaScript or TypeScript)

Call `context.params.define()` inside the exported `create(context)` function. The returned object contains the current values and can be read in `update` or `render`:

```ts
export function create({ ctx, width, height, params }: WorkbenchCanvasContext) {
  const values = params.define({
    particleCount: {
      type: 'number', label: 'Particle count',
      default: 80, min: 10, max: 160, step: 1, group: 'Particles',
    },
    showTrails: {
      type: 'boolean', label: 'Show trails', default: true, group: 'Display',
    },
  })

  return {
    render() {
      ctx.clearRect(0, 0, width, height)
      // Use values.particleCount and values.showTrails to draw the scene.
    },
  }
}
```

Supported types are `number` (with `min`, `max`, and optional `step`), `boolean`, `color` (a hex color), `select` (with `options: [{ label, value }]`), and `text` (optional `multiline` and `maxLength`, up to 10,000 characters). `group` is optional and organizes related controls.

Typography studies expose their source text and available presets in **Parameters**. Original page controls and canvas-painted labels are hidden to keep one editing surface. Selecting a preset runs the source callback and synchronizes its resulting values back to the panel; parameter edits update the existing preview. The palette count also records source state that some original preset buttons do not reflect in their checkboxes.

The Type Physics+ mechanism study is an independently implemented Canvas2D example based on traced public behavior: per-glyph spring physics, ellipse collisions, four canvas ratios, nine layouts, layered metaball contours, pointer throwing, held forces, and passive effects. Its text, canvas, typography, contour, physics, action, and pointer controls live in **Parameters**; its bundled `EVIDENCE.md` records the inspected source hash, formulas, deliberate omissions, and asset/licensing boundary.

Canvas scenes can also sample a named project curve:

```ts
const easedProgress = curves.sample('ease-orbit', progress)
```

The curve ID is shown in the curve inspector. Available resources are linear, cubic Bézier, or spring curves.

### HTML + CSS + JavaScript

Declare parameters in a script in the entry HTML. CSS variables are generated as `--param-{id}`:

```html
<script>
  workbench.params.define({
    speed: { type: 'number', label: 'Speed', default: 1, min: 0.25, max: 3, step: 0.05 },
    accent: { type: 'color', label: 'Accent', default: '#62a0ea' },
  })
</script>
```

```css
.orb { background: var(--param-accent, #62a0ea); }
.orb { animation-duration: calc(2s / var(--param-speed, 1)); }
```

JavaScript can read current values from `workbench.params.values` and listen for the `workbench:params` event when the user changes a control:

```js
document.addEventListener('workbench:params', (event) => {
  const { speed } = event.detail
  // Update a JavaScript-driven animation using the new speed.
})
```

### React + TypeScript

Choose **New → React + TypeScript** for an `index.html` entry, `src/main.tsx`, `src/App.tsx`, and a separate stylesheet. Project-relative component imports and local CSS imports are supported; JSX uses the bundled React runtime.

React previews use the same `workbench.params.define()` API, CSS variables, and `workbench:params` event as HTML projects. Definitions can live in a script in `index.html` before the React entry module. Components can use the generated CSS variables directly, or subscribe to the event in an effect and update React state; remove the listener in the effect's cleanup. Workbench does not automatically rerender React components when a parameter changes.

## Development checks

```sh
npm test       # unit tests
npm run lint   # lint source
npm run build  # type-check and production build
npm run preview # serve the production build locally
```

Browser regressions cover the example gallery, all 41 React block mounts, typography controls and source presets, Type Physics contours, DEMO compositing, Three.js assets, Apple interactions and draft recovery, Catalog navigation, and the Ice explorations. The Goldfish regression checks actual canvas changes after opening, Apply, reset, zoom, pause/resume, and switching examples:

```sh
npx playwright install chromium # once per development machine
npm run test:e2e
```

The tests start a separate development server on port 5188. Set `E2E_BASE_URL` to test an already running production preview, including its deployment prefix (for example `http://localhost:4173/MotionWorkbench/`). `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` optionally selects an existing Chromium executable.

## Deploy to GitHub Pages

The workflow in [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) builds and deploys on pushes to `main`, and can also be started manually from the repository's **Actions** tab. Before the first deployment, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. Vite uses the Pages-provided `BASE_PATH` during the workflow build. The base is normalized with a trailing slash, so example files and React/Three.js runtime URLs stay under the repository prefix.

To check a project-site build locally in PowerShell:

```powershell
$env:BASE_PATH = '/MotionWorkbench'
npm run build
npm run preview -- --port 4173
```

Open `http://localhost:4173/MotionWorkbench/`. In another terminal, the same deployment can be checked with:

```powershell
$env:E2E_BASE_URL = 'http://localhost:4173/MotionWorkbench/'
npx playwright test tests/e2e/megd1Explorations.spec.ts
```

After stopping the preview, remove the temporary overrides in their respective terminals with `Remove-Item Env:BASE_PATH` and `Remove-Item Env:E2E_BASE_URL` when returning to the default local setup.

## Browser compatibility

Chromium has the broadest folder-access support and is the default automated browser test target. Safari users can use JSON Import/Export instead of folder Open/Save. React sandbox initialization, deployed vendor paths, and Type Physics contour rendering have received Safari-related fixes, but this does not establish parity for every example or Safari version.

WebGL studies depend on browser and GPU capabilities, and complex effects may run slowly on some devices. Successful compilation alone does not establish that the rendered output and interactions are correct. To check Safari, open the deployed app on a Mac or iOS device and test project opening, parameter changes, interactions, and switching between examples. The default Playwright suite runs Chromium; passing it on Windows does not verify Safari.

## Current scope

MotionWorkbench is an early prototype focused on editable motion experiments and parameter exploration. It supports the bundled React and Three.js WebGL runtimes, but does not provide arbitrary npm installation, `three/webgpu`, custom worker/decoder pipelines, a standalone-site build pipeline for exported projects, browser-based filesystem access in every browser, or a general-purpose debugger. Portable exports are Workbench project bundles, not deployable websites. HTML projects currently use JavaScript modules; TypeScript is supported in Canvas2D and React projects. Complex dynamic resource creation may require a project-specific adapter. HTML and React previews run in sandboxed iframes; Canvas2D projects execute in the host page after bundling project-local imports and do not have the same isolation. Visual node editing and data-flow visualization are not implemented.
