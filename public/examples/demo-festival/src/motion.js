(() => {
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const easing = {
    7: (value) => {
      const x = value * 2;
      return x < 1 ? 0.5 * x * x * x : 0.5 * ((x - 2) ** 3 + 2);
    },
    24: (value) => {
      const x = value * 2;
      return x < 1 ? 0.5 * x ** 4 : -0.5 * ((x - 2) ** 4 - 2);
    },
    26: (value) => 1 - (1 - value) ** 5,
    27: (value) => {
      const x = value * 2;
      return x < 1 ? 0.5 * x ** 5 : 0.5 * ((x - 2) ** 5 + 2);
    },
  };

  const quart = 24;
  const cubic = 7;
  const timelines = {
    top: [[0, 0.5, quart], [0.866666667, 0.9, quart], [1.566666667, 0, quart], [2.033333333, 0.9, quart], [2.433333333, 0, cubic], [3.566666667, 0.5, quart]],
    bottom: [[0.1, 0.5, quart], [0.933333333, 0.9, quart], [1.633333333, 0, quart], [2.133333333, 0.9, quart], [2.533333333, 0, cubic], [3.666666667, 0.5, quart]],
    vertical: [[0, 0.5, quart], [0.866666667, 0.1, quart], [1.566666667, 0, quart], [2.033333333, 0.9, quart], [2.433333333, 1, cubic], [3.533333333, 0.5, quart]],
    bulge: [[0, 0, quart], [0.866666667, -0.4, quart], [1.566666667, 0, quart]],
    pointerMask: [[0, 0, cubic], [0.866666667, 1, cubic], [2.433333333, 1, cubic], [3.566666667, 0, cubic]],
    introScale: [
      [0, 0, 4, [0, -0.7702994011976045], [0, 0.7702994011976045]],
      [0.8333333333333334, 1, 4, [-0.5578105392580808, 0], [0.5578105392580808, 0]],
    ],
    introX: [
      [0, -0.9, 4, [-0.03608229592910367, -0.7839055586283186], [0.03608229592910367, 0.7839055586283186]],
      [0.8333333333333334, 0.15, cubic],
      [1.7666666666666666, 0, 26],
    ],
    introY: [
      [0, -0.9, 4, [-0.01843931185517687, -0.7839055586283186], [0.01843931185517687, 0.7839055586283186]],
      [0.8333333333333334, 0.15, cubic],
      [1.7666666666666666, 0, cubic],
    ],
    introPointer: [[1.133333333, 0.1, cubic], [2.766666667, 1, cubic]],
  };

  function cubicPoint(progress, p0, p1, p2, p3) {
    const inverse = 1 - progress;
    return inverse ** 3 * p0
      + 3 * inverse ** 2 * progress * p1
      + 3 * inverse * progress ** 2 * p2
      + progress ** 3 * p3;
  }

  // Cables creates samples for indices 0 through 31 with a 1/30 step.
  function sampleCablesSpline(from, to, time) {
    const fromCp = from[4] || [-0.5, 0];
    const toCp = to[3] || [-0.5, 0];
    let previous = [from[0], from[1]];
    for (let index = 1; index <= 31; index += 1) {
      const progress = index / 30;
      const current = [
        cubicPoint(progress, from[0], from[0] + fromCp[0], to[0] + toCp[0], to[0]),
        cubicPoint(progress, from[1], from[1] + fromCp[1], to[1] + toCp[1], to[1]),
      ];
      if (time <= current[0] || index === 31) {
        const range = current[0] - previous[0];
        const mix = range === 0 ? 1 : clamp((time - previous[0]) / range);
        return previous[1] + (current[1] - previous[1]) * mix;
      }
      previous = current;
    }
    return to[1];
  }

  function sample(keys, time) {
    if (time <= keys[0][0]) return keys[0][1];
    const last = keys[keys.length - 1];
    if (time >= last[0]) return last[1];
    for (let index = 0; index < keys.length - 1; index += 1) {
      const from = keys[index];
      const to = keys[index + 1];
      if (time > to[0]) continue;
      if (from[2] === 4) return sampleCablesSpline(from, to, time);
      const progress = clamp((time - from[0]) / (to[0] - from[0]));
      const curved = (easing[from[2]] || ((value) => value))(progress);
      return from[1] + (to[1] - from[1]) * curved;
    }
    return last[1];
  }

  function smoothstep(value) {
    const x = clamp(value);
    return x * x * (3 - 2 * x);
  }

  function smootherstep(value) {
    const x = clamp(value);
    return x * x * x * (x * (x * 6 - 15) + 10);
  }

  function mapRange(value, oldMin, oldMax, newMin, newMax, curve, shouldClamp) {
    let progress = (value - oldMin) / (oldMax - oldMin);
    if (shouldClamp) progress = clamp(progress);
    if (curve === 'smooth') progress = smoothstep(progress);
    if (curve === 'smoother') progress = smootherstep(progress);
    return newMin + (newMax - newMin) * progress;
  }

  const maps = {
    d: {
      x: [[-1, 0.05, 0.6, 0.3, 'smooth', false], [-0.05, 1, 0.1, 0.03, 'smoother', true]],
      y: [[-0.05, 1, 0.7, 0.4, 'smooth', true], [-1, 0.05, 0, 0.03, 'smoother', true]],
    },
    e: {
      x: [[-0.05, 1, 0.6, 0.3, 'smooth', true], [0.05, -1, 0.03, 0.1, 'smooth', false]],
      y: [[-0.05, 1, 0.7, 0.4, 'smooth', true], [-1, 0.05, 0, 0.03, 'smooth', true]],
    },
    m: {
      x: [[-1, 0.05, 0.6, 0.3, 'smooth', true], [1, -0.05, 0.03, 0.1, 'smooth', false]],
      y: [[-1, 0.05, 0.65, 0.4, 'smooth', true], [-0.05, 1, 0, 0.03, 'smooth', true]],
    },
    o: {
      x: [[-0.05, 1, 0.6, 0.3, 'smooth', false], [0.05, -1, 0.03, 0.1, 'smooth', false]],
      y: [[-1, 0.05, 0.65, 0.4, 'smooth', true], [-0.05, 1, 0, 0.03, 'smooth', true]],
    },
  };

  function letterAnchors(x, y) {
    return Object.fromEntries(Object.entries(maps).map(([letter, axes]) => [letter, {
      x: axes.x.reduce((sum, args) => sum + mapRange(x, ...args), 0),
      y: axes.y.reduce((sum, args) => sum + mapRange(y, ...args), 0),
    }]));
  }

  function createMotion() {
    const state = {
      pointer: { x: 0, y: 0 },
      smoothed: { x: 0, y: 0 },
      introTime: 0,
      idleTime: -1,
      inactivity: 0,
      nextIdleTrigger: null,
    };
    return {
      state,
      move(x, y) {
        state.pointer.x = clamp(x, -1, 1);
        state.pointer.y = clamp(y, -1, 1);
        state.inactivity = 0;
        state.nextIdleTrigger = null;
      },
      reset() {
        Object.assign(state, { introTime: 0, idleTime: -1, inactivity: 0, nextIdleTrigger: null });
        Object.assign(state.pointer, { x: 0, y: 0 });
        Object.assign(state.smoothed, { x: 0, y: 0 });
      },
      update(delta, options) {
        const speed = Number(options.speed);
        state.introTime += delta * speed;
        state.inactivity += delta;
        if (state.idleTime >= 0) state.idleTime += delta * speed;
        const divisor = Math.max(1, Number(options.smoothing));
        state.smoothed.x += (state.pointer.x - state.smoothed.x) / divisor;
        state.smoothed.y += (state.pointer.y - state.smoothed.y) / divisor;
        const idleDelay = Number(options.idleDelay);
        if (state.nextIdleTrigger === null) state.nextIdleTrigger = idleDelay;
        if (options.autoPlay && state.inactivity >= state.nextIdleTrigger) {
          while (state.inactivity >= state.nextIdleTrigger) {
            state.idleTime = 0;
            state.nextIdleTrigger += Number(options.cycleInterval);
          }
        }
        const activeIdle = state.idleTime >= 0 && state.idleTime <= 3.666666667;
        const idleTime = activeIdle ? state.idleTime : 3.666666667;
        const idleMask = activeIdle ? 1 - sample(timelines.pointerMask, idleTime) : 1;
        const introMask = sample(timelines.introPointer, state.introTime);
        const influence = Number(options.pointerStrength) * idleMask * introMask;
        const x = state.smoothed.x * influence;
        const y = state.smoothed.y * influence;
        const split = (name) => 0.05 + sample(timelines[name], idleTime) * 0.9;
        return {
          anchors: letterAnchors(x, y),
          splitTop: activeIdle ? split('top') : 0.5,
          splitBottom: activeIdle ? split('bottom') : 0.5,
          splitY: activeIdle ? split('vertical') : 0.5,
          scale: sample(timelines.introScale, state.introTime),
          globalX: (sample(timelines.introX, state.introTime) + (activeIdle ? sample(timelines.bulge, idleTime) : 0)) * Number(options.globalWarp),
          globalY: sample(timelines.introY, state.introTime) * Number(options.globalWarp),
        };
      },
    };
  }

  window.DemoFestivalMotion = { createMotion, sample, timelines, letterAnchors };
})();
