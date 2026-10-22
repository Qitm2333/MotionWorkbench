# Evidence Workflow

## Source Gate (v2)

Treat every observation as a lead until it is tied to the current page's loaded source. Previous case studies, familiar animation libraries, screenshots, and the first matching string in a minified bundle are not evidence of the current behavior. Before implementation, each important rule must have one of these labels:

- `confirmed`: directly connected to the inspected DOM, loaded CSS/JS module, or a repeatable browser observation whose source path is identified;
- `inferred`: a reasoned interpretation with supporting observations but no direct source confirmation;
- `unknown`: not established; keep it visible rather than filling the gap with a conventional animation.

When a visual discrepancy appears, return to the source dataflow and ask whether the mismatch is caused by state ownership, lifecycle timing, layout/font/asset differences, or a parameter. Do not tune a number before ruling out a wrong update path.

## 1. Start With the Live Page

Inspect the relevant elements in the browser before downloading anything.

Record:

- Trigger element and semantic identity: selector, ID, label, role, and any `data-*` value.
- Before and after DOM/ARIA state: especially `aria-expanded`, `aria-current`, classes, visibility, and count changes.
- URL or history changes.
- Exact keyboard and pointer behavior.
- Responsive breakpoint behavior. Test the desktop and narrow states independently.

Use a short behavior table rather than a narrative.

| Input | Previous state | Resulting state | Visible result | Source status |
| --- | --- | --- | --- | --- |
| Click active category | `family=a` | root | cluster retracts | confirmed |
| Click inactive category | `family=a` | `family=b` | clusters cross over | confirmed |

## 2. Find Loaded Assets

Inspect the page's network-loaded JavaScript and CSS, not only document HTML. Framework apps commonly load route chunks after the initial document.

Useful starting points:

- Search document HTML for `script src`, preload links, and framework manifests.
- Inspect the browser's loaded scripts/styles list if available.
- Download public static assets only after confirming they are actually used by the page.

Preserve the asset URL and filename in the evidence note. Work on copies outside the implementation's runtime path so the reproduction never depends on a remote reference asset.

## 3. Locate the Correct Module

Compressed bundles often reuse short variable names. Search by an anchor that belongs to the interaction, then inspect surrounding code:

- A rendered ID such as `archive-node-family-product-design`.
- A distinctive class such as `node-anchor--card`.
- Route/query key such as `family`.
- A visible label, event name, or `aria-expanded`.
- A library call such as `animate`, `useSpring`, `pointerdown`, or `replaceState`.

Do not treat the first textual match as proof. Confirm the code creates the inspected DOM or consumes the matching state value.

## 4. Build an Evidence Ledger

Write decisions down before implementing. Each row needs a provenance label.

| Question | Finding | Provenance |
| --- | --- | --- |
| What determines expansion? | Path object with optional `family` | confirmed in route/parser code |
| What does re-click do? | Sets path to empty object | confirmed in pill click callback |
| How is card order staggered? | Distance from branch origin | confirmed in layout function |
| How are cards placed? | Seeded random placement plus collision relaxation | confirmed in layout function |
| How are real project images handled? | Not available in the permitted asset set | unknown / omitted |

Never convert an `inferred` row into a `confirmed` statement later without new evidence.

## 5. Inspect Dynamic Behavior

A DOM snapshot after an animation is insufficient. Capture state at meaningful times: before input, shortly after, mid-transition, and after settle. For each point, compare DOM states, route, and geometry where possible.

For input handlers, verify whether the source:

- Uses a click target, an enclosing pointer listener, or both.
- Cancels clicks after crossing a drag threshold.
- Has a wheel or touch-pan branch.
- Treats a narrow viewport as a different presentation rather than a scaled desktop scene.

## 6. Keep the Boundary Honest

Use only public or authorized sources. Stop and ask the user when access requires an account, bypass, credential, payment, or rights that they have not provided. The goal is to learn interaction engineering, not to evade a site's controls.
