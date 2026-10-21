# MotionWorkbench

The first runnable Animation Workbench prototype. It supports Canvas2D TypeScript projects and HTML/CSS page experiments.

## Run

```sh
npm install
npm run dev
```

Use a Chromium-based browser for opening and saving project folders. A project folder contains a readable `project.json` manifest and independent source files. Browsers without directory access fall back to importing and exporting a readable portable JSON bundle. Canvas2D projects bundle project-relative JS/TS imports in the browser; HTML projects preview in a sandboxed iframe and inline project-relative CSS stylesheets for preview.

## Build

```sh
npm run build
npm run lint
npm test
```

Canvas2D projects can register live boolean, numeric, color, and select parameters through `context.params.define(...)`. HTML projects can use `workbench.params.define(...)`; CSS can read values as `var(--param-parameterId)`. Canvas2D code can sample named linear, cubic-bezier, and normalized spring curves with `context.curves.sample(id, progress)`. The curve preset library includes standard Ease, Sine, Quad, overshoot, and spring variants; every preset creates an independent resource with a stable ID. Projects are applied automatically on startup, after opening a project, and after creating one. Parameter overrides and curve resources are stored in `project.json`; curve changes update the active Canvas2D preview. Unsaved source, parameter, and curve changes are cached locally and can be recovered or discarded after a refresh.
