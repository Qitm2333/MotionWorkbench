# Todo tower

A to-do list stacked like bricks; take one out and the rest come down.

**[Try it live on bencho.dev →](https://bencho.dev/blocks/todo-tower)** · Press

## Use it

Copy `Tower.tsx` and `Tower.css` into your project, and add [`tokens.css`](../../tokens.css) once if you have not already.

```bash
npm install lucide-react
```

```tsx
import { Tower } from "./Tower";
import "./Tower.css";

export default function Demo() {
  return <Tower />;
}
```

## Props

Every prop is optional and defaults to what the block ships with on bencho.dev.

| Prop | Knob | Default | Range | What it does |
| --- | --- | --- | --- | --- |
| `gravity` | Gravity | `50` | 0–100 | how hard it falls |
| `count` | Todos | `6` | 3–undefined |  |
| `slip` | Slip | `45` | 0–100 | how crooked it stacks, and how far a card skates |

## Tokens it reads

`--card` `--fill-on` `--fill-slab` `--focus` `--ink` `--ink-2` `--ink-4` `--ink-rgb` `--on-ink` `--pane-edge` — all defined in [`tokens.css`](../../tokens.css). Map them to your own theme if you have one.

---

MIT licensed. Part of [Bencho](https://bencho.dev).
