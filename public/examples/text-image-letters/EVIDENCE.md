# Text → Image Letters: source and motion evidence

Upstream: <https://github.com/boknowsworld/boknows-text-image-template>  
Reviewed source commit: `72bc384dd1fbeb007d7ffdec8f4e7218a59338be6`  
Review date: 2026-10-26. The upstream is a dependency-free static HTML/CSS/JS project; the inspected files are `index.html`, `config.js`, `app.js`, and `style.css`. The local preview was checked at 1440×900 and against the narrow responsive CSS branch.

## Evidence ledger

| Behavior / rule | Finding | Provenance |
| --- | --- | --- |
| Letter-to-image mapping | `config.js` maps each non-space character position to two local WebP variants; the sample has 11 positions and 22 images. | Confirmed in `LETTER_CONFIG.imagesByPosition`, `app.js` asset construction, and `docs/materials.json`. |
| Initial reveal | After all images decode, `start()` reveals letters at 40 ms intervals and hides them in shuffled order. | Confirmed in `Promise.all(...load...)`, `start()`, `show()`, and `hide()`. |
| Pointer and touch | `pointermove` resolves a letter target from coordinates; pointer down/up/cancel preserve touch exploration and cleanup. | Confirmed in `point()` and the `words` pointer listeners. |
| Variant selection | A letter chooses randomly among loaded variants while avoiding its previous image when possible. | Confirmed in `show()` and its `s.last` pool filtering. |
| Motion timing | Entry uses Web Animations API spring-like transform keyframes (default 340 ms); exit shrinks/fades over 620 ms and the text slot returns with CSS. | Confirmed in `springFrames()`, `show()`, `hide()`, and `.letter.returning`. |
| Crowding | Non-intro interaction keeps at most four active image letters and hides the oldest queue item first. | Confirmed in `activeQueue` inside `show()`; Workbench exposes this existing limit. |
| Automatic playback | A random loaded position is scheduled while the page is visible and not hovered, paused, hidden, or reduced-motion. | Confirmed in `schedule()`, visibility/IntersectionObserver, pause, and reduced-motion handlers. Workbench adds an explicit default-on toggle. |
| Responsive/accessibility | The stylesheet switches editorial layout below 700 px; reduced-motion CSS and JS suppress sticker/automatic motion. | Confirmed in `style.css` and `matchMedia` branches. |
| Assets and license | The upstream README identifies the 22 textile WebPs as generated sample assets and states the code and included assets are MIT licensed. | Confirmed in `README.md`, `LICENSE`, and `docs/MATERIALS.md`, preserved in this project. |

## Workbench mapping

The four source files remain separately editable, and all images resolve through project-relative `assets/` paths. Parameters expose entry duration, exit duration, maximum simultaneous image letters, and automatic playback; changing them updates the running preview. The local background-video upload remains a temporary browser preview and is not saved into the project.

The text itself is intentionally not a live parameter: changing it without supplying a matching positional image set would create missing mappings. Edit `config.js` and its `imagesByPosition` together, as instructed by the upstream materials guide.

## Limits

The source mechanism was traced from the loaded static files and exercised in the local preview. No frame-by-frame pixel comparison or Safari session was available for this example; browser-specific Web Animations and image decoding differences remain unverified.
