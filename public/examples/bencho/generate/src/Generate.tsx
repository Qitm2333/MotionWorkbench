import { useEffect, useId, useRef, useState } from "react";

/* ── inlined from lab/spring ──────────────────────── */
/* ── one spring, for everything that settles ───────────────
   The maths was already on this bench twice, copied by hand:
   Humidity's wheel and Brightness's column both accumulate
   velocity toward a target, damp it, and snap when both the
   delta and the velocity fall under 0.02. Two copies is a
   coincidence; five would be a policy, so it comes out here
   before the elastic blocks are written against it.

   The two shipped copies are deliberately NOT refactored onto
   this. They work, they are tuned, and rewriting the innards
   of two live components to prove a point about duplication
   is how a good afternoon becomes a bad one. This is the one
   new code uses.

   Frames, not milliseconds. `dt` is expressed in sixtieths of
   a second and the damping is RAISED to it rather than
   multiplied by it, so a dropped frame decays the same amount
   of energy as the two frames it replaced. Multiplying is the
   version that makes a spring behave differently on a busy
   page, which is the hardest kind of bug to see.

   The loop parks itself the moment the value has settled.
   CLAUDE.md is not complimentary about the one permanent
   requestAnimationFrame already on this bench and there is no
   case for five more. */

/* Read once, the way the wheel and the pill nav do. A
   preference, not a live input. */
const stillness = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* A drawn placeholder: Bencho's photographs are licensed to
   the site and do not travel. Point this at your own. */
const FLOWER: string = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%20width%3D%22800%22%20height%3D%22800%22%20preserveAspectRatio%3D%22xMidYMid%20slice%22%3E%0A%3Cdefs%3E%3ClinearGradient%20id%3D%22s%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22rgb%28239%2C239%2C241%29%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22rgb%28176%2C176%2C178%29%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%0A%3Crect%20width%3D%22800%22%20height%3D%22800%22%20fill%3D%22url%28%23s%29%22%2F%3E%0A%3Ccircle%20cx%3D%22210%22%20cy%3D%22177%22%20r%3D%2272%22%20fill%3D%22rgb%28246%2C246%2C248%29%22%2F%3E%0A%3Cpath%20d%3D%22M0%2C800%20L0%2C488.1%20L100%2C432.9%20L200%2C437.7%20L300%2C493.2%20L400%2C492.3%20L500%2C436.8%20L600%2C433.7%20L700%2C489.1%20L800%2C496.0%20L800%2C800%20Z%22%20fill%3D%22rgb%28158%2C158%2C160%29%22%2F%3E%0A%3Cpath%20d%3D%22M0%2C800%20L0%2C585.5%20L100%2C550.7%20L200%2C548.8%20L300%2C582.2%20L400%2C607.6%20L500%2C592.0%20L600%2C555.6%20L700%2C545.7%20L800%2C575.1%20L800%2C800%20Z%22%20fill%3D%22rgb%28121%2C121%2C123%29%22%2F%3E%0A%3Cpath%20d%3D%22M0%2C800%20L0%2C680.5%20L100%2C710.5%20L200%2C697.2%20L300%2C666.2%20L400%2C677.0%20L500%2C708.9%20L600%2C700.6%20L700%2C668.1%20L800%2C673.8%20L800%2C800%20Z%22%20fill%3D%22rgb%2896%2C96%2C98%29%22%2F%3E%0A%3C%2Fsvg%3E";

/* ══ Generate ═════════════════════════════════════════════
   A picture that is made in front of you, slowly. Press
   Generate and the flower arrives the way a generated image
   does — the large decisions first and the fine ones last —
   under a glassy liquid surface that stills as it lands.

   ── THREE SCALES OF DETAIL, IN ORDER ───────────────────
   · SHAPES. Heavily blurred and pushed hard in contrast, the
     flower is a few clean glassy masses — where the dark is,
     nothing more. The contrast is what makes them shapes
     rather than fog.
   · FORM. The blur lets go on a slow curve and the contrast
     eases back to the print's own, so the petals find their
     edges and their tones. A low drifting ripple keeps the
     surface liquid while it happens.
   · GRAIN. The halftone only comes in over the last quarter,
     through the print itself. The finest detail is the last
     thing decided, which is what makes it read as generated
     rather than revealed.

   It replaced a version built from halftone dots in passes,
   coarse to fine. That read as pixels arriving rather than a
   picture forming, and every stage of it was too busy.

   ── IDENTITY AT REST ────────────────────────────────────
   The filter only exists while a run is going. At rest the
   card is the print and nothing else, so a wall of these costs
   one image each. */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const u = clamp((v - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};

/* the print's paper, as a luminance. Contrast turns about THIS
   rather than mid-grey: about 0.5 the paper went to white and
   the card was a glowing sheet that snapped back to grey at the
   end. About the paper, the ground holds and the ink deepens. */
const PAPER = 0.9;

/* ── the count keeps its own time ─────────────────────────
   A number climbing at one steady rate reads as a timer, not
   as work. So the count runs on a curve of its own, re-rolled
   every run: a quick start, a slow stretch, a burst, a stall,
   another burst, and a crawl through the last tenth. The
   picture still forms on the plain clock underneath — only
   the number is uneven, which is how a real one behaves.

   Knots are (time, value) pairs, both 0..1 and both rising,
   so the count can never go backwards. Between two knots it
   is half linear and half smoothstep: speed changes read as
   easing rather than as corners, and never quite stop. */
type Knot = [number, number];
const r = (a: number, b: number) => a + Math.random() * (b - a);
const knots = (): Knot[] => [
  [0, 0],
  [r(0.1, 0.16), r(0.1, 0.16)],   /* quick start */
  [r(0.32, 0.38), r(0.22, 0.3)],  /* slow stretch */
  [r(0.44, 0.49), r(0.5, 0.6)],   /* burst */
  [r(0.56, 0.61), r(0.62, 0.68)], /* stall */
  [r(0.68, 0.72), r(0.84, 0.88)], /* burst */
  [1, 1],                         /* and the long last bit */
];
const along = (ks: Knot[], t: number) => {
  for (let i = 1; i < ks.length; i++) {
    const [t0, v0] = ks[i - 1];
    const [t1, v1] = ks[i];
    if (t > t1) continue;
    const u = clamp((t - t0) / (t1 - t0), 0, 1);
    return mix(v0, v1, mix(u, u * u * (3 - 2 * u), 0.5));
  }
  return 1;
};

export function Generate({
  /* seconds from the press to the picture */
  pace = 5,
  /* how liquid the surface is while it forms, 0..100 */
  ripple = 50,
  /* the frame's corner, px. The button is a pill at every
     setting — the frame is the picture, the pill is a control,
     and squaring one is no reason to square the other. */
  corner = 20,
}: {
  pace?: number;
  ripple?: number;
  corner?: number;
} = {}) {
  const still = stillness();
  const id = `gen-${useId().replace(/:/g, "")}`;
  const [t, setT] = useState(1);
  const raf = useRef(0);
  const curve = useRef<Knot[]>(knots());
  const busy = t < 1;
  /* ── 100 is held for a beat ──────────────────────────────
     The run ending and the pill reading "Generate" again on
     the same frame means nobody ever sees 100 — the count
     would stop at 99 and vanish. So the pill stays a loader
     for a moment after the picture lands. */
  const [held, setHeld] = useState(false);
  /* ── it starts EMPTY ─────────────────────────────────────
     A plain frame of paper until the first run. A block about
     making a picture that already has the picture in it has
     answered its own question before anybody pressed it. Once
     made, the print stays, and pressing again remakes it from
     blank. */
  const [made, setMade] = useState(false);
  const hold = useRef(0);
  const loading = busy || held;
  /* 99 at most until the run has actually finished — the 100
     belongs to the picture landing, not to the curve */
  const pct = held ? 100 : Math.min(99, Math.floor(along(curve.current, t) * 100));

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    window.clearTimeout(hold.current);
  }, []);

  const generate = () => {
    if (loading) return;
    const total = still ? 400 : Math.max(2, pace) * 1000;
    let t0 = 0;
    const tick = (now: number) => {
      if (!t0) t0 = now;
      const v = Math.min(1, (now - t0) / total);
      setT(v);
      if (v < 1) raf.current = requestAnimationFrame(tick);
      else {
        raf.current = 0;
        setMade(true);
        setHeld(true);
        hold.current = window.setTimeout(() => setHeld(false), 650);
      }
    };
    curve.current = knots();
    setT(0);
    raf.current = requestAnimationFrame(tick);
  };

  /* ── the three windows ───────────────────────────────────── */
  /* one long rise, no pulse: the haze used to breathe while
     nothing was decided, and a picture that dims and brightens
     before it has started reads as hesitating */
  const haze = smooth(0, 0.3, t);
  const form = smooth(0.1, 0.82, t);
  const grain = smooth(0.7, 1, t);
  /* blur falls fast at first and then crawls through the small
     radii, which is where the detail actually lives */
  const sd = mix(20, 1.6, 1 - Math.pow(1 - form, 2.2));
  const k = mix(2.4, 1, form);
  const warp = (clamp(ripple, 0, 100) / 100) * 32 * Math.pow(1 - smooth(0.05, 0.9, t), 1.5);
  /* a slow drift in the noise so the water moves rather than
     sitting as a fixed distortion */
  const f = 0.006 + 0.0018 * Math.sin(t * 4.4);
  const cut = (PAPER - PAPER * k).toFixed(3);

  return (
    <div className="gen" data-busy={busy} data-loading={loading} data-made={made}>
      <div className="gen-card" style={{ borderRadius: clamp(corner, 0, 40) }}>
        {busy && !still && (
          <>
            <svg className="gen-defs" aria-hidden="true">
              <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency={`${f.toFixed(4)} ${(f * 1.3).toFixed(4)}`} numOctaves={2} seed={7} result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale={warp.toFixed(2)} xChannelSelector="R" yChannelSelector="G" result="d" />
                <feGaussianBlur in="d" stdDeviation={sd.toFixed(2)} />
                <feComponentTransfer>
                  <feFuncR type="linear" slope={k.toFixed(3)} intercept={cut} />
                  <feFuncG type="linear" slope={k.toFixed(3)} intercept={cut} />
                  <feFuncB type="linear" slope={k.toFixed(3)} intercept={cut} />
                </feComponentTransfer>
              </filter>
            </svg>
            <img
              className="gen-print"
              src={FLOWER}
              alt=""
              draggable={false}
              style={{
                filter: `url(#${id})`,
                opacity: haze * mix(0.7, 1, form),
                scale: `${mix(1.04, 1, smooth(0, 0.9, t))}`,
              }}
            />
          </>
        )}
        {/* the print: the whole card at rest once made, and the
            grain that arrives last during a run */}
        {(made || busy) && <img
          className="gen-print"
          src={FLOWER}
          alt="A flower, printed in halftone"
          draggable={false}
          style={busy ? {
            opacity: still ? t : grain,
            filter: still ? undefined : `blur(${mix(1.6, 0, grain).toFixed(2)}px)`,
          } : undefined}
        />}

        {/* ── the way in, in the middle of the page ───────────
            On the blank frame it is the only thing there. Once a
            picture is made it steps aside and only comes back
            under the pointer, so the print is left clean. */}
        <button
          className="gen-go"
          onClick={generate}
          disabled={loading}
          tabIndex={loading ? -1 : 0}
          aria-label="Generate"
        >
          <span>Generate</span>
        </button>

        {/* ── and the count, small, in the corner ─────────────
            Just the number going up. Held at 100 for a beat so
            it is seen, then it leaves with the run. */}
        <span className="gen-pct" role="status" aria-live="off">
          {pct}%
        </span>
      </div>
    </div>
  );
}
