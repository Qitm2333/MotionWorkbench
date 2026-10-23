# Example projects

Examples are readable, self-contained project folders served with the app. The Examples gallery is registered in `src/examples.ts`. Opening an example creates an editable workspace copy and applies it automatically; Save and Export work as for any other project.

## Catalog motion study

`catalog-repro/` is a snapshot of the user's Catalog reproduction, with its original HTML, CSS, JavaScript, README, and source extraction utility. The workbench manifest is added alongside those files. The original desktop project is unchanged.

This is a motion/layout study of the catalog interaction on David McGillivray's design portfolio. Cards use generated graphic placeholders, not the original portfolio's project images. It is an exploration, not an official template or affiliation.

Click the Logo / Digital / Physical branches to expand them, hover the cards, and switch the grid view. Parameters expose visible card count, expansion spread, turbulence, entry stiffness, and entry damping. Use a viewport wider than 900 px for the tree interaction; the original responsive design uses a grid on smaller screens.

## Adding an exploration

1. Add a folder here with its source files and a versioned `project.json`. List the editable runtime source files in `sourceFiles`.
2. Add an entry in `src/examples.ts` with a stable ID, description, highlights, and its project directory.
3. Verify that it runs with the existing Canvas2D or HTML runtime before marking it available.

## Typography

`space-type-cylinder/` is the only Space Type Generator study currently listed. Its evidence ledger records the root route's loaded sketch, controls, presets, and source-to-implementation limits. Other reference routes are intentionally not included.

The gallery also includes the built-in Orbit study and Motion postcard starters. Three.js examples will be added after their source is supplied and dependency/asset support is designed; this gallery does not extend the current runtime.
