# MotionWorkbench

The first runnable Animation Workbench prototype. It supports Canvas2D TypeScript projects and HTML/CSS page experiments.

## Run

```sh
npm install
npm run dev
```

Use a Chromium-based browser for opening and saving project folders. A project folder contains a readable `project.json` manifest and independent source files. Canvas2D projects bundle project-relative JS/TS imports in the browser; HTML projects preview in a sandboxed iframe and inline project-relative CSS stylesheets for preview.

## Build

```sh
npm run build
npm run lint
```

Canvas2D projects can register live boolean, numeric, color, and select parameters through `context.params.define(...)`. HTML projects can use `workbench.params.define(...)`; CSS can read values as `var(--param-parameterId)`. Projects are applied automatically on startup, after opening a project, and after creating one. Parameter overrides currently apply to the running preview; project persistence for those values, curve editing and reuse, and draft recovery remain planned M2 work.
