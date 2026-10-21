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

Curves, parameter controls, persistence for those values, and draft recovery are planned for M2 and are not part of this prototype yet.
