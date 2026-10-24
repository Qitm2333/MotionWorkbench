# MotionWorkbench

MotionWorkbench is a browser-based workspace for making and exploring small visual experiments. It combines a multi-file code editor, a live Canvas2D, HTML/CSS, or Three.js preview, and controls for exposing motion parameters and easing curves.

## What it supports

- **Canvas2D projects** written in JavaScript or TypeScript, including JSX/TSX. Project-relative imports are bundled in the browser with esbuild-wasm; third-party package imports are not currently resolved.
- **HTML + CSS + JavaScript projects** with project-relative stylesheets, scripts, ES modules, and local resources in the preview.
- **Three.js projects** with bundled `three@0.180.0` and WebGL addons, local glTF/GLB models, textures, orbit controls, and live parameters.
- A project Explorer with nested files, drag-and-drop import, rename, entry-file selection, and protected double-click deletion.
- Live parameter controls and an editable curve library with linear, easing, overshoot, and spring presets.
- A resizable editor/preview layout, preview viewport and zoom controls, expanded preview, and dark/light themes.
- Readable project folders, portable JSON import/export, and local draft recovery.
- An **Examples** browser with Apple Duo, Catalog, and Canvas2D / HTML / Three.js starters; each opens as an editable copy and runs automatically.

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

Open the local URL printed by Vite. The starter Canvas2D project is applied automatically. Use **New** to choose Canvas2D, HTML + CSS, or Three.js, or **Open** to load an existing project folder.

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

Open **Examples** beside New / Open / Save to browse past explorations and starter projects. Select a study to see its interactions and available parameters, then open it. All source files appear in Explorer and the preview applies automatically. An unsaved-work notice appears before replacing the workspace.

The **Catalog motion study** includes branching navigation, card expansion, and five motion parameters. It opens at **1440 × 900** with Fit zoom so the tree interaction is visible even in a narrow preview panel. Its original responsive behavior uses a grid at widths of 900 px or below; the view toggle inside the example switches between tree and grid.

Examples load as independent copies. **Save** chooses a new project folder, **Export** includes the complete editable source, and reopening an example starts from its bundled version. The repository keeps readable sources and a manifest under [`public/examples/`](./public/examples/); [`src/examples.ts`](./src/examples.ts) registers the gallery entries. Source files load from the same deployment, including GitHub Pages project paths.

The **Apple Duo interaction study** includes a local Lotus runtime (which bundles its own Three.js implementation), seven product poses, a fold slider, and drag rotation. Its 327 runtime resources total approximately 38 MB; they load only when opening this example. The original runtime and provenance notes remain alongside the readable study adapter. This example retains its upstream engine instead of replacing it with the starter's Three.js version.

The **Three.js model study** is also available under **New → Three.js**. It loads a small local glTF model with a separate BIN buffer, adds studio lighting and OrbitControls, and exposes seven motion, material, and lighting parameters. Imports use `three` and `three/addons/...`; no CDN connection is needed.

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

The manifest includes `formatVersion: 1`, `projectType`, `entry`, `renderer`, and a `sourceFiles` list. Resource projects also have `assetFiles`; Three.js templates declare `dependencies: { "three": "0.180.0" }`. These lists distinguish managed files when saving; unrelated files in the directory are left alone. Models, textures, fonts, media, and scene data keep their original bytes and directory structure. Explorer lists them separately under Assets.

Canvas2D relative imports such as `import { makeScene } from './scene'` are resolved within the project. HTML projects can link project files using relative paths, for example `./styles.css` and `./src/main.js`; linked CSS and JavaScript are incorporated into the sandboxed preview. Remote or absolute resources remain subject to browser/network and sandbox restrictions.

Portable exports are a single `.motionworkbench.json` file containing the manifest, editable source, and local assets (Base64 with MIME types). Opening the exported file restores those resources without the original folder. Remote resources are not downloaded into exports. Unsaved drafts use IndexedDB, including assets, rather than the small localStorage quota.

HTML previews compile local module scripts and create resource Blob URLs inside the isolated iframe. Relative `fetch`, XHR, CSS URLs, images, and external glTF buffers/textures resolve against the project's virtual directory. Prefer `new URL('./assets/model.glb', document.baseURI)` for runtime resource URLs. The iframe retains `sandbox="allow-scripts"`, without access to the workbench DOM or storage.

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

## Development checks

```sh
npm test       # unit tests
npm run lint   # lint source
npm run build  # type-check and production build
npm run preview # serve the production build locally
```

Browser regressions exercise the actual Three.js model, Apple interactions and draft recovery, and Catalog navigation:

```sh
npx playwright install chromium # once per development machine
npm run test:e2e
```

The tests start a separate development server on port 5188. Set `E2E_BASE_URL` to test an already running production preview, including its deployment prefix (for example `http://localhost:4173/MotionWorkbench/`). `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` optionally selects an existing Chromium executable.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and deploys on pushes to `main`, and can also be started manually from the repository's **Actions** tab. Before the first deployment, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. Vite uses the Pages-provided base path during the workflow build.

## Current scope

MotionWorkbench is an early prototype. It supports the pinned Three.js WebGL runtime, but does not provide arbitrary npm installation, `three/webgpu`, custom worker/decoder pipelines, a full build pipeline for exported projects, browser-based filesystem access in every browser, or a general-purpose debugger. HTML projects currently use JavaScript modules; TypeScript remains supported in Canvas2D projects. Complex dynamic resource creation may require a project-specific adapter. HTML previews run in a sandboxed iframe; Canvas2D projects execute in the browser after bundling project-local imports.
