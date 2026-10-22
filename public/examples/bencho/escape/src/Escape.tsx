import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/* ══ playful blocks ═══════════════════════════════════════
   Two components whose behaviour is the joke. The material
   stays as quiet as everything else on this bench — no
   confetti, no exclamation marks, no sound. If the decoration
   is doing the work then the interaction is not.

   THE JOKE HAS TO RESOLVE. A button that never lets itself be
   clicked is friction with a smirk on it. A button that
   dodges four times and then gives up is a small story with
   an ending, and the ending is the reason it is worth
   shipping rather than a garnish on top of one.

   Which makes one rule absolute here: none of these may trap
   anybody. Every one of them completes, every one of them
   completes within a few seconds, and every one of them
   completes from the keyboard on the first try — the tease is
   a pointer phenomenon and a person who is not using a
   pointer is not the audience for it. */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* Read once, like the wheel and the pill nav do. This is a
   preference, not a live input — a person who changes it
   mid-session gets it on the next render of the page, which
   is soon enough and costs nothing to be wrong about. */
const still = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ── proximity ─────────────────────────────────────────────
   One caller now that Shy is gone — Escape pushes along the
   vector. Kept as a hook rather than folded back into the
   component because the awkward part is the frame of
   reference, not the maths, and that is the part worth having
   written down once.

   The vector is from the element's CENTRE to the cursor, in
   the element's own pixels — which is the awkward part. The
   canvas draws boards at a zoom, so a rect comes back in
   screen pixels while a transform the component writes is
   applied in its own. Divide one by the other and a 120px
   radius is 120px of component at any zoom. It is the same k
   the deck and the create menu divide their drags by.

   Listening on the nearest scrolling ancestor rather than on
   window is not tidiness. It is what makes SCROLL a source of
   proximity: the cursor can sit perfectly still while the
   page moves the element out from under it, and no
   pointermove is fired for that. The last pointer position is
   kept so a scroll can re-ask the question with it. */

type Near = {
  /* centre → cursor, in the element's own px */
  dx: number;
  dy: number;
  distance: number;
  inside: boolean;
};

const AWAY: Near = { dx: 0, dy: 0, distance: Infinity, inside: false };

function scrollerOf(el: Element): HTMLElement | Document {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const o = getComputedStyle(n);
    if (/auto|scroll/.test(o.overflowY) || /auto|scroll/.test(o.overflowX)) return n;
  }
  return document;
}

/* Not exported. It is used twice, both times in this file,
   and exporting a hook beside components is what breaks Fast
   Refresh for the whole module. The day a third block wants
   it, it moves to a file of its own — which is precisely what
   the lint rule is asking for. */
function useProximity<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { radius }: { radius: number },
): Near {
  const [near, setNear] = useState<Near>(AWAY);
  /* the answer, and the frame that will publish it. A
     pointermove fires per pixel of travel and this drives a
     transform, so it is read eagerly and rendered once a
     frame — the wall can carry several of these. */
  const at = useRef<Near>(AWAY);
  const frame = useRef(0);
  const pt = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const host = scrollerOf(el);

    const publish = () => {
      frame.current = 0;
      setNear(at.current);
    };
    const push = (v: Near) => {
      at.current = v;
      if (!frame.current) frame.current = requestAnimationFrame(publish);
    };

    const measure = () => {
      const p = pt.current;
      if (!p) return;
      const box = el.getBoundingClientRect();
      const k = box.width / (el.offsetWidth || box.width) || 1;
      const dx = (p.x - (box.left + box.width / 2)) / k;
      const dy = (p.y - (box.top + box.height / 2)) / k;
      const distance = Math.hypot(dx, dy);
      const inside = distance <= radius;
      /* out, and it was already out. The overwhelming majority
         of pointermoves on a page are this, and they must cost
         a rect and nothing else. */
      if (!inside && !at.current.inside) return;
      push({ dx, dy, distance, inside });
    };

    const read = (e: Event) => {
      const p = e as PointerEvent;
      pt.current = { x: p.clientX, y: p.clientY };
      measure();
    };
    const gone = () => {
      pt.current = null;
      if (at.current.inside) push(AWAY);
    };

    host.addEventListener("pointermove", read, { passive: true });
    host.addEventListener("scroll", measure, { passive: true });
    /* leaving the scroller is leaving; a pointer that has gone
       to another pane is not near anything in this one */
    host.addEventListener("pointerleave", gone);
    return () => {
      host.removeEventListener("pointermove", read);
      host.removeEventListener("scroll", measure);
      host.removeEventListener("pointerleave", gone);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [ref, radius]);

  return near;
}

/* ── the room a block has to move in ───────────────────────
   Escape translates a button inside a field and may never
   push it out of one. The bound is measured rather than
   assumed: the field is fixed by the stylesheet but the
   button is as wide as its label, and its label changes.

   offsetWidth, never a rect — the canvas zoom is exactly the
   thing this must not be measured in. */
function useRoom(
  field: RefObject<HTMLElement | null>,
  moving: RefObject<HTMLElement | null>,
  inset = 12,
) {
  const [room, setRoom] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    const f = field.current;
    const m = moving.current;
    if (!f || !m) return;
    const read = () =>
      setRoom({
        x: Math.max(0, (f.clientWidth - m.offsetWidth) / 2 - inset),
        y: Math.max(0, (f.clientHeight - m.offsetHeight) / 2 - inset),
      });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(f);
    ro.observe(m);
    return () => ro.disconnect();
  }, [field, moving, inset]);
  return room;
}

/* ══ 1 · Escape ═══════════════════════════════════════════
   A button that slides away from the cursor, and then stops.

   THE NOTE THIS ONE HAS TO CARRY: near-miss targeting is one
   hop from a genuine dark pattern. The same mechanism aimed
   the other way is a close button that drifts out from under
   a finger, a decline that is a little harder to hit than an
   accept, an unsubscribe that needs a second go. What keeps
   this on the right side of the line is not taste, it is the
   count: it gives in on its own, quickly, every time, and
   activating it from the keyboard never dodges at all. Take
   the count out and this is not a joke any more, it is the
   pattern it is imitating. */

/* the button's corner. 28 is half of its 56px height, so the
   default IS the pill it has always been and the slider only
   has somewhere to go downwards. */
const ESC_CORNER = 28;

export function Escape({
  /* how hard it pushes away, 0..100 */
  skittishness = 55,
  /* dodges before it gives in */
  patience = 4,
  /* the detection field, px */
  radius = 120,
  /* the corner it is cut with */
  corner = ESC_CORNER,
}: {
  skittishness?: number;
  patience?: number;
  radius?: number;
  corner?: number;
} = {}) {
  const field = useRef<HTMLDivElement | null>(null);
  const btn = useRef<HTMLButtonElement | null>(null);
  /* ── measured from the FIELD, not from the button ───────
     The button is centred in the field and the field never
     moves, so the field's centre is the button's HOME — and
     that is the only frame this can honestly be computed in.

     Measuring off the button's own rect is the obvious way to
     write it and it is a feedback loop: the displacement is a
     function of a position the displacement just changed. It
     converges — flee falls off with distance, so the loop is
     a contraction — but it converges by RINGING, and it rings
     at whatever rate pointermoves arrive. Ten events at one
     fixed cursor point produced 21, 35, 26, 32, 28, 30, 29,
     30, 29, 29px: a ±6px shiver on a 40px pill, seeded fresh
     by every event, which on a moving cursor never stops.

     From home it is a pure function of where the cursor is.
     One answer per position, no ring, and it can be reasoned
     about — including the one case that matters, below. */
  const near = useProximity(field, { radius });
  const room = useRoom(field, btn);
  const reduced = still();

  /* The direction is undefined when the cursor is exactly on
     home, and it INVERTS as the cursor crosses it — which is
     the good behaviour, not a bug: the button darts around
     you to the other side rather than being walked into a
     corner. Held so the undefined frame keeps the last
     answer, and the flip travels (see the CSS) rather than
     teleporting. */
  const dir = useRef({ x: 1, y: 0 });

  const [dodges, setDodges] = useState(0);
  /* the beat after it is pressed, before it forgets the whole
     thing and starts again for the next person */
  const [gave, setGave] = useState(false);
  const off = useRef(0);
  /* One dodge per approach. Without this a cursor resting on
     the boundary counts one a frame and the payoff arrives
     before the joke does. It re-arms only on the way out of
     the full radius, so a single sweep through is a single
     dodge however fast it was.

     The count is not shown any more. There was a row of dots
     under the button reporting it, on the argument that
     giving in would otherwise read as breaking — and that
     argument was wrong in the way most legibility arguments
     are wrong: it spent the surprise to prevent a confusion
     nobody actually had. "Fine." arriving unannounced after
     three or four dodges IS the joke; a progress bar toward
     it is a spoiler with a UI. */
  const armed = useRef(true);

  const caught = dodges >= patience;

  useEffect(() => () => window.clearTimeout(off.current), []);

  useEffect(() => {
    if (caught) return;
    if (near.distance < radius * 0.55) {
      if (armed.current) {
        armed.current = false;
        setDodges((d) => d + 1);
      }
    } else if (near.distance > radius) {
      armed.current = true;
    }
  }, [near.distance, radius, caught]);

  /* Displacement is read straight off the distance rather
     than sprung toward it: a spring would give it a wind-up,
     and the whole character of this is that it is already
     gone by the time you arrive.

     Squared, so it barely stirs at the edge of the field and
     bolts over the last third. Linear made it drift away from
     a cursor two rooms distant, which reads as a bug. */
  const flee = caught || !near.inside || reduced ? 0 : (1 - near.distance / radius) ** 2;
  /* Up to 120px of travel, from 90. The field used to leave
     about fifty pixels of room in the short axis, so the top
     of this range was a number the clamp ate — raising it
     without giving the block somewhere to go would have been
     a knob that stops working halfway along. */
  const reach = 14 + (skittishness / 100) * 106;
  if (near.distance > 6 && near.distance < Infinity) {
    dir.current = { x: -near.dx / near.distance, y: -near.dy / near.distance };
  }
  const ox = clamp(dir.current.x * flee * reach, -room.x, room.x);
  const oy = clamp(dir.current.y * flee * reach, -room.y, room.y);

  /* Any activation resolves it, at any count. A person who
     actually catches it deserves the ending, and a person on
     a keyboard — who never saw it move — must not be handed a
     button that ignores them four times first. */
  const take = () => {
    setGave(true);
    window.clearTimeout(off.current);
    off.current = window.setTimeout(() => {
      setGave(false);
      setDodges(0);
      armed.current = true;
    }, 760);
  };

  return (
    /* Reduced motion takes the travel and leaves the joke:
       the count still runs, it still gives in on the same
       dodge, and the button simply never leaves the middle. */
    <div
      className="ply ply-field esc"
      ref={field}
      data-flat={reduced || undefined}
      style={{ "--esc-r": `${clamp(corner, 0, ESC_CORNER)}px` } as React.CSSProperties}
    >
      <button
        ref={btn}
        className="esc-btn"
        data-caught={caught || gave}
        data-done={gave}
        /* two durations, one attribute. Fleeing is short —
           long enough that a dart across the cursor travels
           instead of teleporting, short enough that it is
           never a wind-up. Coming home is the soft one. */
        data-fled={near.inside && !caught}
        style={{ transform: `translate(${ox.toFixed(2)}px, ${oy.toFixed(2)}px)` }}
        onClick={take}
      >
        {caught || gave ? "Fine." : "Touch me"}
      </button>

    </div>
  );
}
