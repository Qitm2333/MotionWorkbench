import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Phone, Plane, Play, SkipBack, SkipForward, Timer } from "lucide-react";

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
const AVATARS: Record<string, string> = {
  kai: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2096%2096%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20fill%3D%22rgb%28187%2C187%2C189%29%22%2F%3E%3Ctext%20x%3D%2248%22%20y%3D%2261%22%20text-anchor%3D%22middle%22%20font-family%3D%22Inter%2C%20Helvetica%2C%20Arial%2C%20sans-serif%22%20font-size%3D%2240%22%20font-weight%3D%22500%22%20fill%3D%22%23fff%22%3EA%3C%2Ftext%3E%3C%2Fsvg%3E",
  mara: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2096%2096%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20fill%3D%22rgb%28164%2C164%2C166%29%22%2F%3E%3Ctext%20x%3D%2248%22%20y%3D%2261%22%20text-anchor%3D%22middle%22%20font-family%3D%22Inter%2C%20Helvetica%2C%20Arial%2C%20sans-serif%22%20font-size%3D%2240%22%20font-weight%3D%22500%22%20fill%3D%22%23fff%22%3EP%3C%2Ftext%3E%3C%2Fsvg%3E",
  sofia: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2096%2096%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20fill%3D%22rgb%28201%2C201%2C203%29%22%2F%3E%3Ctext%20x%3D%2248%22%20y%3D%2261%22%20text-anchor%3D%22middle%22%20font-family%3D%22Inter%2C%20Helvetica%2C%20Arial%2C%20sans-serif%22%20font-size%3D%2240%22%20font-weight%3D%22500%22%20fill%3D%22%23fff%22%3EN%3C%2Ftext%3E%3C%2Fsvg%3E",
  ines: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2096%2096%22%20width%3D%2296%22%20height%3D%2296%22%3E%3Crect%20width%3D%2296%22%20height%3D%2296%22%20fill%3D%22rgb%28178%2C178%2C180%29%22%2F%3E%3Ctext%20x%3D%2248%22%20y%3D%2261%22%20text-anchor%3D%22middle%22%20font-family%3D%22Inter%2C%20Helvetica%2C%20Arial%2C%20sans-serif%22%20font-size%3D%2240%22%20font-weight%3D%22500%22%20fill%3D%22%23fff%22%3EM%3C%2Ftext%3E%3C%2Fsvg%3E",
};
/* the music cover: the same mountain Code reveal draws, so the
   bench reuses one picture rather than shipping another */
const ART = "/lab/mount.jpg";

/* ══ Dynamic island ═══════════════════════════════════════
   A black pill at the top of a phone that holds a live
   activity. Press it and it grows into the full activity;
   press again and it tucks back into the pill. Which activity
   is running — a timer, a call, music or a flight — is set by the
   block: each is its own card on the wall, the same island under it.

   ── THE SHAPE IS ONE SPRING, THE CONTENT IS NOT ──────────
   Width, height and corner ride one spring, so the pill grows
   as one object and never as a box whose corners catch up
   later. The contents do not morph with it: the compact row
   and the expanded card are two different layouts, and
   stretching one into the other is the thing that looks
   cheap. They crossfade instead, through a small blur and a
   scale, the old one leaving a beat before the new one
   arrives — so for an instant there is only the black shape
   moving, which is what makes it read as the same object
   changing rather than as two panels swapped.

   ── CENTRED IN THE BLOCK ─────────────────────────────────
   On a phone it hangs from the top edge; here there is no
   phone around it, so it sits in the middle of the block and
   grows out evenly from there.

   The island is black whatever the Fill is — it is the screen
   switched off around a camera, not a surface of the app —
   unless the Island knob asks for white, which inverts its
   ink and deepens the colours that were tuned for black. */

type Kind = "Timer" | "Call" | "Music" | "Flight";
const KINDS: Kind[] = ["Timer", "Call", "Music", "Flight"];

const COMPACT = { w: 150, h: 36, r: 18 };
const OPEN: Record<Kind, { w: number; h: number; r: number }> = {
  Timer: { w: 300, h: 76, r: 38 },
  Call: { w: 300, h: 76, r: 38 },
  Music: { w: 300, h: 150, r: 42 },
  Flight: { w: 300, h: 116, r: 40 },
};
/* a new activity arriving while shut: the pill swells a touch
   past its own size and settles, the way the real one nods
   when something starts */
const NUDGE = 1.08;

const pad = (n: number) => String(n).padStart(2, "0");
const FLIGHT_MIN = 180; // SFO 21:59 to YEG 00:59
const ahead = (m: number) => {
  const r = FLIGHT_MIN - m;
  if (r <= 0) return "Landed";
  return `${Math.floor(r / 60) ? `${Math.floor(r / 60)}h ` : ""}${r % 60}m`;
};
const clock = (s: number) => `${Math.floor(s / 60)}:${pad(s % 60)}`;

const FADE = {
  initial: { opacity: 0, scale: 0.92, filter: "blur(6px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.92, filter: "blur(6px)" },
};

export function Island({
  activity = "Timer",
  /* how much the shape overshoots, 0..100 */
  bounce = 40,
  /* the island's own colour: the hardware black, or white */
  tone = "Black",
  /* whether it starts expanded; the flight and the call start
     tucked into the pill, and a press opens them */
  startOpen = true,
}: {
  activity?: string;
  bounce?: number;
  tone?: string;
  startOpen?: boolean;
} = {}) {
  const still = stillness();
  const [kind, setKind] = useState<Kind>(KINDS.includes(activity as Kind) ? (activity as Kind) : "Timer");
  /* it starts open unless told otherwise, and a press tucks it
     away or brings it out */
  const [open, setOpen] = useState(startOpen);
  const [nudge, setNudge] = useState(0);

  /* the knob picks the activity too */
  const knob = useRef(activity);
  useEffect(() => {
    if (knob.current === activity) return;
    knob.current = activity;
    if (KINDS.includes(activity as Kind)) {
      setKind(activity as Kind);
      setNudge((n) => n + 1);
    }
  }, [activity]);

  /* live numbers, so it is an activity and not a picture of one */
  const [left, setLeft] = useState(299);
  const [talk, setTalk] = useState(42);
  const [at, setAt] = useState(71);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(true);
  /* minutes flown of a three-hour flight: a minute a second, so it
     is visibly in the air, and it lands and takes off again */
  const [flown, setFlown] = useState(24);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!paused) setLeft((s) => (s <= 0 ? 299 : s - 1));
      setFlown((m) => (m >= FLIGHT_MIN ? 0 : m + 1));
      setTalk((s) => s + 1);
      if (playing) setAt((s) => (s >= 214 ? 0 : s + 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused, playing]);

  const b = Math.max(0, Math.min(100, bounce)) / 100;
  const spring = still
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 34 - b * 16, mass: 0.9 };

  const size = open ? OPEN[kind] : COMPACT;

  const toggle = () => {
    setOpen((o) => !o);
  };

  return (
    <div className="dyn">
      <div className="dyn-top">
        <motion.button
          type="button"
          className="dyn-pill"
          data-tone={tone === "White" ? "white" : undefined}
          aria-expanded={open}
          aria-label={open ? `Close ${kind}` : `Open ${kind}`}
          onClick={toggle}
          initial={false}
          animate={{
            width: size.w,
            height: size.h,
            borderRadius: size.r,
            scale: 1,
          }}
          transition={spring}
          whileTap={still ? undefined : { scale: 0.97 }}
        >
          {/* the swell on a new activity, on a wrapper of its own
              so it never fights the size spring */}
          <motion.span
            key={nudge}
            className="dyn-in"
            initial={nudge && !still ? { scale: NUDGE } : false}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${kind}-${open}`}
                className={open ? "dyn-open" : "dyn-compact"}
                data-kind={kind}
                {...FADE}
                transition={{ duration: still ? 0 : 0.22, delay: still ? 0 : 0.06 }}
              >
                {open ? (
                  <Expanded
                    kind={kind}
                    left={left}
                    talk={talk}
                    at={at}
                    flown={flown}
                    paused={paused}
                    playing={playing}
                    onPause={() => { setPaused((p) => !p); }}
                    onPlay={() => { setPlaying((p) => !p); }}
                    onEnd={() => { setOpen(false); }}
                  />
                ) : (
                  <Compact kind={kind} left={left} talk={talk} flown={flown} playing={playing} />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        </motion.button>
      </div>

    </div>
  );
}

/* ── shut: a glyph at each end of the pill ──────────────── */
function Compact({ kind, left, talk, flown, playing }: { kind: Kind; left: number; talk: number; flown: number; playing: boolean }) {
  if (kind === "Timer") {
    return (
      <>
        <Timer size={16} strokeWidth={2} className="dyn-amber" />
        <span className="dyn-num dyn-amber">{clock(left)}</span>
      </>
    );
  }
  if (kind === "Flight") {
    return (
      <>
        <Plane size={16} strokeWidth={0} fill="currentColor" className="dyn-cyan dyn-plane" />
        <span className="dyn-num dyn-cyan">{ahead(flown)}</span>
      </>
    );
  }
  if (kind === "Call") {
    return (
      <>
        <Phone size={14} strokeWidth={2} fill="currentColor" className="dyn-green" />
        <span className="dyn-num dyn-green">{clock(talk)}</span>
      </>
    );
  }
  return (
    <>
      <img className="dyn-art dyn-art-s" src={ART} alt="" />
      <Bars on={playing} />
    </>
  );
}

/* ── open: the whole activity ───────────────────────────── */
function Expanded(props: {
  kind: Kind;
  left: number;
  talk: number;
  at: number;
  flown: number;
  paused: boolean;
  playing: boolean;
  onPause: () => void;
  onPlay: () => void;
  onEnd: () => void;
}) {
  const { kind } = props;
  /* the buttons are inside the pill, and a press on one is not
     a press on the pill */
  const own = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  if (kind === "Timer") {
    return (
      <>
        <span className="dyn-round dyn-amber-bg" role="button" tabIndex={0} aria-label={props.paused ? "Resume" : "Pause"} onClick={own(props.onPause)}>
          {props.paused ? <Play size={18} fill="currentColor" strokeWidth={0} /> : <Pause size={18} fill="currentColor" strokeWidth={0} />}
        </span>
        <span className="dyn-grow" />
        <span className="dyn-label">Timer</span>
        <span className="dyn-big dyn-amber">{clock(props.left)}</span>
      </>
    );
  }
  if (kind === "Call") {
    return (
      <>
        <img className="dyn-face" src={AVATARS.mara} alt="" />
        <span className="dyn-who">
          <span className="dyn-label">Mara · {clock(props.talk)}</span>
          <span className="dyn-name">On a call</span>
        </span>
        <span className="dyn-grow" />
        <span className="dyn-round dyn-red-bg" role="button" tabIndex={0} aria-label="End call" onClick={own(props.onEnd)}>
          {/* the end-call mark: a solid handset turned face down */}
          <Phone size={20} strokeWidth={0} fill="currentColor" style={{ rotate: "135deg" }} />
        </span>
      </>
    );
  }
  if (kind === "Flight") {
    /* the plane rides the front of what has been flown */
    const p = Math.min(1, props.flown / FLIGHT_MIN);
    return (
      <span className="dyn-flight" style={{ ["--p" as string]: p } as React.CSSProperties}>
        <span className="dyn-row dyn-ends">
          <span className="dyn-label">San Francisco</span>
          <span className="dyn-label">Edmonton</span>
        </span>
        <span className="dyn-row">
          <span className="dyn-code">SFO</span>
          <span className="dyn-fly">
            <i />
            <Plane size={18} strokeWidth={0} fill="currentColor" className="dyn-plane" />
          </span>
          <span className="dyn-code">YEG</span>
        </span>
        <span className="dyn-row dyn-ends">
          <span className="dyn-t">21:59</span>
          <span className="dyn-eta dyn-cyan">{p >= 1 ? "Landed" : `Arrives in ${ahead(props.flown)}`}</span>
          <span className="dyn-t">00:59</span>
        </span>
      </span>
    );
  }
  const total = 214;
  return (
    <span className="dyn-music">
      <span className="dyn-row">
        <img className="dyn-art" src={ART} alt="" />
        <span className="dyn-who">
          <span className="dyn-name">Soft Focus</span>
          <span className="dyn-label">Lumen Park</span>
        </span>
        <span className="dyn-grow" />
        <Bars on={props.playing} />
      </span>
      <span className="dyn-row dyn-track">
        <span className="dyn-t">{clock(props.at)}</span>
        <span className="dyn-rail"><span style={{ width: `${(props.at / total) * 100}%` }} /></span>
        <span className="dyn-t">-{clock(total - props.at)}</span>
      </span>
      <span className="dyn-row dyn-ctl">
        <SkipBack size={20} fill="currentColor" strokeWidth={0} />
        <span role="button" tabIndex={0} aria-label={props.playing ? "Pause" : "Play"} onClick={own(props.onPlay)} className="dyn-play">
          {props.playing ? <Pause size={24} fill="currentColor" strokeWidth={0} /> : <Play size={24} fill="currentColor" strokeWidth={0} />}
        </span>
        <SkipForward size={20} fill="currentColor" strokeWidth={0} />
      </span>
    </span>
  );
}

/* four bars that dance while it plays, and lie down when not */
function Bars({ on }: { on: boolean }) {
  return (
    <span className="dyn-bars" data-on={on || undefined} aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  );
}
