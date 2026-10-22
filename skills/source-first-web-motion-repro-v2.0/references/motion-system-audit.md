# Motion System Audit

Use this reference when a source interaction contains dragging, springs, inertia, staged entry, echo/overshoot, or a rendered control that does not move directly with its input.

This is a source-reading procedure, not a library of animation values. Do not copy any parameter from a previous reconstruction unless the current reference bundle independently confirms it.

## Source-First Dataflow

Trace the current reference implementation as a chain:

```text
DOM/pointer/keyboard input
  -> gesture or intent target
  -> state machine / physics / animation controller
  -> authoritative per-frame update
  -> each presentation consumer (DOM, canvas, model, ARIA)
```

For each arrow, record the module/function, value name, and evidence location. Distinguish these common but non-equivalent values:

- target or gesture value: what the user most recently requested;
- actual or simulated value: what the animation/physics controller currently settled at;
- presentation value: a derived transform, width, opacity, path, camera pose, or accessibility value;
- lifecycle flags: pointer-held, click-versus-drag, magnetizing, entering, exiting, or settled.

Do not infer that a native control's value, a visible custom thumb, and a model parameter are the same state. Confirm which event updates each one and whether the source deliberately delays or derives it.

## Questions To Answer In Current Source

1. Which handler receives pointerdown, move, up, cancel, click, and keyboard input? Are listeners captured and cleaned up?
2. Does movement update presentation directly, or only an intent consumed by a simulator on the next frame?
3. Which update is authoritative for all visible outputs? Is there one shared simulation event or several independent transitions?
4. Are click, drag, keyboard, touch, and track-click paths intentionally different? What suppresses accidental clicks after a drag?
5. What creates lag, damping, inertia, overshoot, echo, magnetization, or endpoint clamping? Locate the actual constants and equations.
6. Are width/scale/rotation/icon/path changes derived from displacement or from a separate animation? Find the sign and endpoint branches; test both directions.
7. What is the initialization lifecycle? Record hidden state, asset/scene readiness, intro trigger, handoff to the real control, delayed labels, and cleanup.
8. Which responsive branches change the interaction model rather than merely scaling it?

If a question cannot be answered from the loaded source, keep it `unknown` or label it `inferred`; never promote a familiar behavior to `confirmed`.

## Temporal Evidence Matrix

Capture the reference and reproduction at matching viewport and input paths. Sample before input, immediately after input, during pursuit, near an endpoint, after release, and after settling. For each sample record:

| Time/state | Target | Actual/simulated | Presentation | Lifecycle/ARIA |
| --- | --- | --- | --- | --- |
| before |  |  |  |  |
| pointerdown |  |  |  |  |
| mid-drag |  |  |  |  |
| release |  |  |  |  |
| settling |  |  |  |  |
| settled |  |  |  |  |

Repeat at least one forward and one reverse path, an endpoint path, a non-drag click path, and a keyboard path when those inputs exist. Compare ordering and relationships first; only then tune numbers.

## Implementation Rules

- Keep one authoritative simulation when the source has one. Feed every dependent visual from its per-frame output.
- Do not add CSS transitions to hide a missing source-level spring; it creates a second clock and often causes visible half-beat delay.
- Derive deformation from the same source displacement and sign logic, including which edge stays fixed and how icons or labels move.
- Treat pointer release and cancel as state transitions, not as the final pointer coordinate. Let the source controller settle if that is what the bundle does.
- Reproduce staged initialization explicitly. A control that is initially hidden, then replaced, then labelled is not equivalent to one element that fades in once.
- After implementation, verify console output, listener cleanup, final values, ARIA state, and no stale animation frame writes after resize or route changes.

## Evidence Note

The project note must cite the current reference URL, retrieval date, loaded bundle/style names, module/function anchors, tested viewport and input paths, and any remaining unknowns. It should describe the relationship between target, actual, and presentation values without copying proprietary bundle code.
