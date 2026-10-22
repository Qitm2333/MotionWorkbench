# Motion And Layout Mapping

Use this reference for expanding node trees, catalog maps, and card clusters.

## Separate Four Systems

Model these systems separately before combining them:

1. **Path state**: selected family/category, root state, and view mode.
2. **World layout**: pill/node coordinates, card coordinates, links, bounds, and ordering.
3. **Camera**: the translation required to frame the relevant bounds or center the selected branch.
4. **Per-frame presentation**: entry progress, hover displacement, drift, scale, opacity, and path geometry.

This separation avoids the common failure of using already-transformed screen rectangles as new world coordinates.

## Source-To-Code Questions

For each target, answer these in the evidence ledger:

- Is the layout deterministic per data ID? Look for a hash/seed function.
- Is placement radial, packed, grid-based, or collision-relaxed?
- Are card sizes derived from aspect ratio, a clamped range, or source media dimensions?
- Does entry ordering follow original data order, DOM order, or distance from a branch origin?
- Are connectors static SVG paths or recomputed from animated values every frame?
- Is camera motion easing-based or spring-based? What are the duration/ease or stiffness/damping/mass?
- Does hover enlarge one card and push its neighbors? Are pushes direct, interpolated, or spring-driven?

## Mapping Template

Use this shape in your implementation note.

| Reference behavior | Evidence | Implementation contract |
| --- | --- | --- |
| Active category re-click collapses | click callback targets root path | `navigate(active)` maps to `null` |
| Cards start at category branch | per-card origin and entry progress | interpolate `origin -> card position` |
| Link follows card edge | path reads animated x/y/scale | calculate SVG `d` in the animation frame |
| Camera centers active category | selected pill used in camera calculation | calculate target camera from world bounds |
| Drag blocks accidental node click | threshold and capturing listener | suppress click after threshold crossing |

## Animation Fidelity Rules

- If source uses a spring, match spring semantics before tweaking duration. A cubic-bezier approximation may be acceptable only when the user accepts it and the note says so.
- Keep the source's delayed stagger relative to its ordering rule. A hardcoded array index is not equivalent to distance ordering.
- A connector must use the same animated card position as the card. Do not animate its CSS independently.
- Make exit cancellable. When source behavior supports fast category switches, retain enough state to let outgoing and incoming sets overlap.
- Respect reduced-motion settings with stable final states rather than simply hiding the scene.

## Responsive Rule

Do not assume mobile is a compressed desktop graph. Many references deliberately switch to a grid, list, or different navigation model at a breakpoint. Confirm it in source or behavior and build it as a separate rendering mode.
