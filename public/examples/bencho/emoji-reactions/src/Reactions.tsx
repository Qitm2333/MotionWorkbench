import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SmilePlus } from "lucide-react";

/* ══ Emoji reactions ══════════════════════════════════════
   A message, the reactions under it, and a button that turns the
   MESSAGE ITSELF into a pill of emoji. Pick one and it FLIES from
   the pill down to its chip, lands with a squash, and the count
   rolls up — and the pill turns back into the message.

   ── THE MESSAGE BECOMES THE PICKER ──────────────────────
   One surface, two contents. Opening, the message's pill eases
   to the width of the emoji row while its words fade and blur
   away and the emoji rise in, one after another; closing runs it
   back. Nothing appears from nowhere above the row — the thing
   you were reacting to is what offers the reactions.

   ── ONE EMOJI AT A TIME ─────────────────────────────────
   The emoji under the pointer is big and every other one is its
   own size — no falloff into the neighbours, and a quick pop
   rather than a slow grow, so it is always clear which one a
   press will pick. A small label names it.

   ── A REACTION TRAVELS ──────────────────────────────────
   The chip it is going to is laid out first, with its emoji held
   back, so the landing spot is a real measured place; then a
   copy arcs there from where you picked it, and only when it
   lands does the chip show it and the count move. The count
   rolls, a digit strip like the counter's, so a reaction you add
   is a number going up rather than a number being replaced.

   ── YOURS, AND EVERYONE ELSE'S ──────────────────────────
   Chips others left sit plain; the ones you are in are tinted.
   Press a chip to add yourself, or to take yourself off — at
   nobody left it shrinks away. */

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

const SETS: Record<string, { e: string; label: string }[]> = {
  Work: [
    { e: "👍", label: "Nice" }, { e: "🎉", label: "Celebrate" }, { e: "👀", label: "Looking" },
    { e: "✅", label: "Done" }, { e: "🚀", label: "Ship it" }, { e: "🔥", label: "Fire" },
  ],
  Classic: [
    { e: "👍", label: "Like" }, { e: "❤️", label: "Love" }, { e: "😂", label: "Haha" },
    { e: "😮", label: "Wow" }, { e: "😢", label: "Sad" }, { e: "🙏", label: "Thanks" },
  ],
  Hearts: [
    { e: "❤️", label: "Red" }, { e: "🧡", label: "Orange" }, { e: "💛", label: "Yellow" },
    { e: "💚", label: "Green" }, { e: "💙", label: "Blue" }, { e: "💜", label: "Purple" },
  ],
};

type Chip = { e: string; n: number; mine: boolean; landing: boolean };

/* ── every emoji has a way of arriving ──────────────────────
   Not one generic bounce for all of them: the rocket launches,
   the fire flickers, the party popper bursts, the eyes glance.
   It plays when a reaction lands on its chip, when you join a
   chip, and when you rest on it in the pill. */
const KIND: Record<string, string> = {
  "🚀": "launch", "🔥": "flicker", "🎉": "confetti", "👀": "glance", "✅": "tick",
  "👍": "nod", "😂": "laugh", "😮": "wow", "😢": "droop", "🙏": "bow",
  "❤️": "beat", "🧡": "beat", "💛": "beat", "💚": "beat", "💙": "beat", "💜": "beat",
};

/* the emoji, wearing its own motion when `play` is on. The party
   popper's confetti is six dots flung out at set angles */
function Emo({ e, play }: { e: string; play: boolean }) {
  const k = KIND[e] ?? "nod";
  return (
    <i className="rxn-p" data-k={k} data-play={play || undefined}>
      {e}
      {play && k === "confetti" && (
        <span className="rxn-bits" aria-hidden="true">
          {[0, 60, 120, 180, 240, 300].map((a, i) => (
            <b key={a} style={{ "--a": `${a + 15}deg`, "--c": ["#f5a524", "#e5484d", "#2f6bff", "#12a150", "#a855f7", "#f5a524"][i] } as React.CSSProperties} />
          ))}
        </span>
      )}
    </i>
  );
}
type Flight = { e: string; fx: number; fy: number; tx: number; ty: number };

const START: Chip[] = [
  { e: "🚀", n: 3, mine: false, landing: false },
  { e: "🔥", n: 2, mine: false, landing: false },
];

const EMO = 34;

/* a count whose digits roll */
function Count({ n }: { n: number }) {
  const s = String(Math.max(0, n));
  return (
    <span className="rxn-count" aria-label={s}>
      {s.split("").map((d, i) => (
        <span key={s.length - i} className="rxn-col">
          <span className="rxn-strip" style={{ transform: `translateY(${-Number(d) * 1.4}em)` }}>
            {"0123456789".split("").map((x) => <span key={x}>{x}</span>)}
          </span>
        </span>
      ))}
    </span>
  );
}

export function Reactions({
  /* how much the emoji under the pointer swells, 0..100 */
  magnify = 50,
  /* how springy the pill and the landings are, 0..100 */
  bounce = 45,
  set = "Work",
  corner = 20,
}: {
  magnify?: number;
  bounce?: number;
  set?: string;
  corner?: number;
} = {}) {
  const still = stillness();
  const emo = SETS[set] ?? SETS.Work;
  const [chips, setChips] = useState<Chip[]>(START);
  const [open, setOpen] = useState(false);
  const [hx, setHx] = useState<number | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  /* the chip that has just been landed on, for its squash */
  const [landed, setLanded] = useState<string | null>(null);
  const pending = useRef<{ e: string; fx: number; fy: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const shut = useRef(0);
  useEffect(() => () => clearTimeout(shut.current), []);

  const spring = { type: "spring" as const, bounce: (bounce / 100) * 0.55, duration: 0.42 };
  /* the message turning into the picker is quicker than a landing:
     it answers a press, so it should feel immediate */
  const quick = { type: "spring" as const, bounce: (bounce / 100) * 0.45, duration: 0.22 };

  /* ── opening and closing the pill ──────────────────────────
     A mouse CLICKS the button to open it and clicks again, or
     anywhere else, to shut it; passing over the button does
     nothing. A finger HOLDS the button: after a beat the pill
     opens, and without lifting the finger slides along it, the
     emoji under it swelling, and lifts on the one it wants — or
     off the pill, which picks nothing. A quick tap still toggles
     it, for anybody who does not know to hold. */
  const show = () => {
    clearTimeout(shut.current);
    if (!open) { setOpen(true); }
  };
  const hide = (ms = 0) => {
    clearTimeout(shut.current);
    shut.current = window.setTimeout(() => { setOpen(false); setHx(null); }, ms);
  };
  const pill = useRef<HTMLDivElement>(null);
  /* the message's own width, so the pill can spring to and from it */
  const textRef = useRef<HTMLSpanElement>(null);
  const [textW, setTextW] = useState(0);
  useLayoutEffect(() => {
    if (textRef.current) setTextW(textRef.current.offsetWidth);
  }, [corner]);
  const hold = useRef<{ t: number; sliding: boolean; touch: boolean }>({ t: 0, sliding: false, touch: false });

  /* a press anywhere outside the button and the pill shuts it */
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      /* the button and the picker both count as inside */
      const wrap = root.current?.querySelector(".rxn-add-wrap");
      const msg = root.current?.querySelector(".rxn-morph");
      const n = e.target as Node;
      if (wrap && !wrap.contains(n) && !msg?.contains(n)) hide();
    };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* where a finger is along the pill, in the pill's own pixels */
  const along = (clientX: number) => {
    const p = pill.current;
    if (!p) return null;
    const b = p.getBoundingClientRect();
    const k = b.width / p.offsetWidth || 1;
    const x = (clientX - b.left) / k;
    return x < 0 || x > p.offsetWidth ? null : x;
  };

  const onAddDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const touch = e.pointerType === "touch" || e.pointerType === "pen";
    hold.current.touch = touch;
    if (!touch) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* a scripted pointer */ }
    clearTimeout(hold.current.t);
    hold.current.sliding = false;
    hold.current.t = window.setTimeout(() => {
      hold.current.sliding = true;
      show();
    }, 260);
  };
  const onAddMove = (e: React.PointerEvent) => {
    if (!hold.current.sliding) return;
    setHx(along(e.clientX));
  };
  const onAddUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!hold.current.touch) return;
    clearTimeout(hold.current.t);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* never captured */ }
    if (hold.current.sliding) {
      /* lifted: on an emoji picks it, anywhere else lets go */
      hold.current.sliding = false;
      const x = along(e.clientX);
      const i = x === null ? -1 : Math.floor((x - 6) / EMO);
      const el = i >= 0 ? pill.current?.querySelectorAll<HTMLElement>(".rxn-emo")[i] : undefined;
      if (el && emo[i]) pick(emo[i].e, el);
      else hide();
      return;
    }
    /* a quick tap: toggle */
    if (open) hide(); else show();
  };

  /* a point on the page, in the block's own pixels */
  const local = (r: DOMRect) => {
    const b = root.current!.getBoundingClientRect();
    const k = b.width / root.current!.offsetWidth || 1;
    return { x: (r.left + r.width / 2 - b.left) / k, y: (r.top + r.height / 2 - b.top) / k };
  };

  /* ── picking ───────────────────────────────────────────── */
  const pick = (e: string, from: HTMLElement) => {
    const at = local(from.getBoundingClientRect());
    setOpen(false);
    setHx(null);
    const had = chips.find((c) => c.e === e);
    if (had?.mine) { return; }
    pending.current = { e, fx: at.x, fy: at.y };
    setChips((l) => had
      ? l.map((c) => (c.e === e ? { ...c, n: c.n + 1, mine: true, landing: !still } : c))
      : [...l, { e, n: 1, mine: true, landing: !still }]);
  };

  /* the chip is laid out now: measure where the emoji lands and
     send the copy there */
  useLayoutEffect(() => {
    const p = pending.current;
    if (!p || still) { pending.current = null; return; }
    const el = root.current?.querySelector<HTMLElement>(`[data-emoji="${p.e}"] .rxn-chip-e`);
    if (!el) return;
    pending.current = null;
    const to = local(el.getBoundingClientRect());
    setFlight({ e: p.e, fx: p.fx, fy: p.fy, tx: to.x, ty: to.y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chips]);

  const land = () => {
    const f = flight;
    setFlight(null);
    if (!f) return;
    setChips((l) => l.map((c) => (c.e === f.e ? { ...c, landing: false } : c)));
    setLanded(f.e);
    window.setTimeout(() => setLanded((x) => (x === f.e ? null : x)), 700);
  };

  /* ── pressing a chip: in, or out ───────────────────────── */
  const press = (e: string) => {
    setChips((l) => l
      .map((c) => (c.e !== e ? c : c.mine ? { ...c, n: c.n - 1, mine: false } : { ...c, n: c.n + 1, mine: true }))
      .filter((c) => c.n > 0));
    const c = chips.find((x) => x.e === e);
    /* joining a chip plays its emoji's arrival */
    if (c && !c.mine) {
      setLanded(e);
      window.setTimeout(() => setLanded((x) => (x === e ? null : x)), 700);
    }
  };

  /* which emoji the pointer is on — that one is big, every other
     one is its own size. No falloff into the neighbours: a
     reaction is one choice, so it is one emoji or another, never
     a smear between them */
  const on = hx === null ? -1 : Math.max(0, Math.min(emo.length - 1, Math.floor((hx - 6) / EMO)));
  /* a gentle lift, not a balloon: 1.17 at the default, 1.34 at the top of Magnify */
  const swell = (i: number) => (i === on && !still ? 1 + (magnify / 100) * 0.34 : 1);

  const r = Math.max(0, corner);

  return (
    <div ref={root} className="rxn" style={{ "--rxn-r": `${r}px` } as React.CSSProperties}>
      {/* the message, and the picker it turns into: one pill whose
          width and corner spring between the two */}
      <div className="rxn-msg">
        <motion.div
          className="rxn-morph"
          initial={false}
          animate={{
            width: open ? EMO * emo.length + 12 : textW || "auto",
            height: 48,
            borderRadius: open ? 24 : r,
          }}
          transition={quick}
        >
          <motion.span
            ref={textRef}
            className="rxn-text"
            initial={false}
            animate={open ? { opacity: 0, filter: "blur(4px)", scale: 0.96 } : { opacity: 1, filter: "blur(0px)", scale: 1 }}
            transition={{ duration: open ? 0.09 : 0.22, delay: open ? 0 : 0.08 }}
            aria-hidden={open || undefined}
          >
            Shipped the new onboarding flow
          </motion.span>
          <AnimatePresence>
            {open && (
              <motion.div
                ref={pill}
                className="rxn-pill"
                role="menu"
                exit={{ opacity: 0, transition: { duration: 0.16 } }}
                onPointerLeave={() => setHx(null)}
                onPointerMove={(e) => {
                  const b = e.currentTarget.getBoundingClientRect();
                  const k = b.width / e.currentTarget.offsetWidth || 1;
                  setHx((e.clientX - b.left) / k);
                }}
              >
                {emo.map((m, i) => (
                  <motion.button
                    key={m.e}
                    type="button"
                    role="menuitem"
                    className="rxn-emo"
                    aria-label={m.label}
                    initial={{ opacity: 0, y: 8, scale: 0.5, filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { ...quick, delay: 0.02 + i * 0.018 } }}
                    style={{ "--s": swell(i) } as React.CSSProperties}
                    onClick={(e) => pick(m.e, e.currentTarget)}
                  >
                    <span><Emo e={m.e} play={i === on} /></span>
                  </motion.button>
                ))}
                <AnimatePresence>
                  {on >= 0 && (
                    <motion.span
                      key="tip"
                      className="rxn-tip"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16 }}
                      style={{ left: 6 + on * EMO + EMO / 2 }}
                    >
                      {emo[on].label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <motion.div className="rxn-row" layout transition={spring}>
        <AnimatePresence initial={false} mode="popLayout">
          {chips.map((c) => (
            <motion.button
              key={c.e}
              layout
              type="button"
              className="rxn-chip"
              data-emoji={c.e}
              data-mine={c.mine || undefined}
              aria-pressed={c.mine}
              aria-label={`${c.e} ${c.n}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, transition: spring }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.16 } }}
              whileTap={{ scale: 0.92 }}
              onClick={() => press(c.e)}
            >
              <span className="rxn-chip-e" data-landing={c.landing || undefined}><Emo e={c.e} play={landed === c.e} /></span>
              <Count n={c.landing ? c.n - 1 : c.n} />
            </motion.button>
          ))}
          <motion.span key="add" layout className="rxn-add-wrap">
            <button
              type="button"
              className="rxn-add"
              aria-label="Add a reaction"
              aria-expanded={open}
              onPointerDown={onAddDown}
              onPointerMove={onAddMove}
              onPointerUp={onAddUp}
              onPointerCancel={onAddUp}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => {
                /* a touch was handled on the way up */
                if (hold.current.touch) { hold.current.touch = false; return; }
                if (open) hide(); else show();
              }}
            >
              <SmilePlus size={18} strokeWidth={2} />
            </button>

          </motion.span>
        </AnimatePresence>
      </motion.div>

      {/* the reaction on its way: an arc from the pill to its chip */}
      {flight && (
        <motion.span
          className="rxn-fly"
          aria-hidden="true"
          initial={{ x: flight.fx, y: flight.fy, scale: 1.4 }}
          animate={{
            x: [flight.fx, (flight.fx + flight.tx) / 2, flight.tx],
            y: [flight.fy, Math.min(flight.fy, flight.ty) - 46, flight.ty],
            scale: [1.4, 1.25, 1],
            rotate: [0, -14, 0],
          }}
          transition={{ duration: 0.6, ease: [0.35, 0, 0.3, 1], times: [0, 0.45, 1] }}
          onAnimationComplete={land}
        >
          {flight.e}
        </motion.span>
      )}
    </div>
  );
}
