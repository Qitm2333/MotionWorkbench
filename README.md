# MotionWorkbench

MotionWorkbench is a browser-based workspace for making and exploring small visual experiments. It combines a multi-file code editor, a live Canvas2D or HTML/CSS preview, and controls for exposing motion parameters and easing curves.

## What it supports

- **Canvas2D projects** written in JavaScript or TypeScript, including JSX/TSX. Project-relative imports are bundled in the browser with esbuild-wasm; third-party package imports are not currently resolved.
- **HTML + CSS + JavaScript projects** with project-relative stylesheet and script references in the preview.
- A project Explorer with nested files, drag-and-drop import, rename, entry-file selection, and protected double-click deletion.
- Live parameter controls and an editable curve library with linear, easing, overshoot, and spring presets.
- A resizable editor/preview layout, preview viewport and zoom controls, expanded preview, and dark/light themes.
- Readable project folders, portable JSON import/export, and local draft recovery.

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

Open the local URL printed by Vite. The starter Canvas2D project is applied automatically. Use **New** to create either a Canvas2D or HTML + CSS project, or **Open** to load an existing project folder.

## Everyday workflow

1. Create a project or open a folder. The Explorer shows its source tree.
2. Add files with the Explorer's **+** button, or drag supported files (and folders) into the tree.
3. Edit files in the code editor. **Ctrl/Cmd+Z** and **Ctrl/Cmd+Shift+Z** undo and redo. **Ctrl/Cmd+S** saves and reapplies the current project to refresh the preview.
4. Use the Explorer's **Parameters** switch or select a curve to edit it in the main workspace. Changes are applied live where supported.
5. Use the preview toolbar to choose an HTML viewport, change zoom, pause/resume or reset the preview, or expand it to fill the app window.
6. **Save** writes the project folder. **Export** downloads a portable JSON bundle containing all project source; **Import** loads one of those bundles.

Explorer row actions appear on hover. Rename preserves the file's folder and updates detected project-relative references. A file can only be deleted by double-clicking its delete icon; the entry file cannot be deleted.

The editor's **− / +** controls change the code font size from 10–32 px. The reset button returns it to 13 px. The selection is remembered in this browser.

## Project folder format

A saved project is a readable directory: source files remain ordinary text files, while `project.json` stores the versioned manifest, entry file, renderer settings, curves, and saved parameter overrides. For example:

```text
orbit-study/
├── project.json
└── src/
    ├── main.ts
    └── orbit-scene.ts
```

The manifest includes `formatVersion: 1`, `projectType`, `entry`, `renderer`, and a `sourceFiles` list. The `sourceFiles` list lets MotionWorkbench distinguish its managed project files when saving; unrelated files in the directory are left alone.

Canvas2D relative imports such as `import { makeScene } from './scene'` are resolved within the project. HTML projects can link project files using relative paths, for example `./styles.css` and `./src/main.js`; linked CSS and JavaScript are incorporated into the sandboxed preview. Remote or absolute resources remain subject to browser/network and sandbox restrictions.

Portable exports are a single `.motionworkbench.json` file, separate from the readable project-folder format. They contain all source files and the project manifest for transferring or importing a project when folder access is unavailable.

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

Supported types are `number` (with `min`, `max`, and optional `step`), `boolean`, `color` (a hex color), and `select` (with `options: [{ label, value }]`). `group` is optional and organizes related controls.

Canvas scenes can also sample a named project curve:

```ts
const easedProgress = curves.sample('ease-orbit', progress)
```

The curve ID is shown in the Curves list. Available resources are linear, cubic Bézier, or spring curves.

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

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and deploys on pushes to `main`, and can also be started manually from the repository's **Actions** tab. Before the first deployment, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. Vite uses the Pages-provided base path during the workflow build.

## Current scope

MotionWorkbench is an early prototype. It does not currently provide npm dependency installation, a full build pipeline for exported projects, browser-based filesystem access in every browser, or a general-purpose HTML/JavaScript debugger. HTML previews run in a sandboxed iframe; Canvas2D projects execute in the browser after bundling project-local imports.
