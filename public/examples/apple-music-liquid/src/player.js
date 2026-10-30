import { fitLogo } from './brand.js';
import { PlaybackClock } from './clock.js';
import { drawingSize } from './resolution.js';
import { paramsFor } from './scene.js';

const QUALITY_LEVELS = [
  [1, undefined],
  [1, 4],
  [0.8, 4],
  [0.65, 4],
  [0.5, 3],
  [0.4, 2],
];

export function createPlayer(engine, film, values) {
  const stage = document.querySelector('.stage');
  const canvas = stage.querySelector('canvas');
  const playButton = document.querySelector('[data-play]');
  const scrubber = document.querySelector('[data-scrub]');
  const readout = document.querySelector('[data-time]');
  const shotLabel = document.querySelector('[data-shot]');
  const status = document.querySelector('[data-status]');
  const fileInput = document.querySelector('[data-file]');
  const fps = film.fps;
  const duration = film.duration;
  const clock = new PlaybackClock(duration);
  const baseParams = film.shots.map(paramsFor);

  scrubber.max = String(duration);
  let shown = -1;
  let sharp = false;
  let qualityLevel = 0;
  let frameMs = 0;
  let lastFrameAt = 0;
  let calmFrames = 0;
  let uploadFor = 'icon';
  let objectUrl = null;

  const invalidate = () => {
    shown = -1;
  };

  function applyParameters() {
    film.shots.forEach((_, index) => {
      const base = baseParams[index];
      engine.setParams(index, {
        dome: base.dome * Number(values.dome),
        depth: base.depth * Number(values.depth),
        dispersion: base.dispersion * Number(values.dispersion),
        softbox: base.softbox * Number(values.highlights),
        horizon: base.horizon * Number(values.rims),
        exposure: base.exposure * Number(values.exposure),
        bloom: base.bloom * Number(values.bloom),
        grain: Number(values.grain),
        vignette: Number(values.vignette),
        wavelengths: Math.round(Number(values.wavelengths)),
        subframes: Math.round(Number(values.motionBlur)),
      });
    });
    invalidate();
  }

  function sizeFor(scale) {
    const [width, height] = drawingSize(canvas, { scale, aspect: film.aspect });
    const changed = Math.abs(width - engine.width) / engine.width > 0.04
      || Math.abs(height - engine.height) / engine.height > 0.04;
    if (changed) engine.resize(width, height);
  }

  function fit() {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, Math.min(stage.clientHeight, width / film.aspect));
    canvas.style.width = `${Math.round(height * film.aspect)}px`;
    canvas.style.height = `${Math.round(height)}px`;
    invalidate();
  }

  function adapt(now) {
    if (lastFrameAt) {
      const delta = now - lastFrameAt;
      frameMs = frameMs ? frameMs * 0.85 + delta * 0.15 : delta;
    }
    lastFrameAt = now;
    const budget = 1000 / fps;
    if (frameMs > budget * 1.25 && qualityLevel < QUALITY_LEVELS.length - 1) {
      qualityLevel += 1;
      frameMs = 0;
      calmFrames = 0;
    } else if (frameMs && frameMs < budget * 0.6 && qualityLevel > 0 && ++calmFrames > 48) {
      qualityLevel -= 1;
      frameMs = 0;
      calmFrames = 0;
    }
  }

  async function replaceLogo(shotName, file) {
    if (!file?.type.startsWith('image/')) return;
    const index = film.shots.findIndex((shot) => shot.name === shotName);
    if (index < 0) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    status.textContent = 'Loading logo...';
    try {
      const logo = await fitLogo(shotName, objectUrl);
      await engine.setLogo(index, logo);
      invalidate();
      status.textContent = `${shotName} logo loaded`;
      window.setTimeout(() => {
        if (status.textContent.endsWith('logo loaded')) status.textContent = '';
      }, 1600);
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  document.querySelectorAll('[data-upload]').forEach((button) => {
    button.addEventListener('click', () => {
      uploadFor = button.dataset.upload;
      fileInput.click();
    });
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) void replaceLogo(uploadFor, file);
    fileInput.value = '';
  });
  stage.addEventListener('dragover', (event) => {
    event.preventDefault();
    stage.classList.add('dropping');
  });
  stage.addEventListener('dragleave', () => stage.classList.remove('dropping'));
  stage.addEventListener('drop', (event) => {
    event.preventDefault();
    stage.classList.remove('dropping');
    const shot = film.shots[engine.shotIndexAt(clock.time())];
    void replaceLogo(shot.name, event.dataTransfer?.files[0]);
  });

  playButton.addEventListener('click', () => clock.toggle());
  canvas.addEventListener('click', () => clock.toggle());
  scrubber.addEventListener('input', () => {
    clock.seek(Number(scrubber.value));
    invalidate();
  });
  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, button')) return;
    if (event.code === 'Space') {
      event.preventDefault();
      clock.toggle();
    } else if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
      event.preventDefault();
      const direction = event.code === 'ArrowRight' ? 1 : -1;
      const beatFrames = Math.round((fps * 60) / 114.8);
      clock.step(direction * (event.shiftKey ? beatFrames : 1), fps);
      invalidate();
    }
  });

  document.addEventListener('workbench:params', (event) => {
    Object.assign(values, event.detail);
    applyParameters();
  });
  window.addEventListener('message', (event) => {
    if (event.data?.type !== 'workbench-reset') return;
    clock.pause();
    clock.seek(0);
    invalidate();
  });

  const observer = new ResizeObserver(() => fit());
  observer.observe(stage);
  fit();
  applyParameters();

  function drawAt(time, fullQuality = true) {
    if (fullQuality) {
      sizeFor(1);
      engine.render(time);
    } else {
      const [scale, subframes] = QUALITY_LEVELS[qualityLevel];
      sizeFor(scale);
      engine.render(time, { subframes });
    }
    shown = time;
    sharp = fullQuality || qualityLevel === 0;
  }

  let frameHandle = 0;
  function tick(now) {
    frameHandle = requestAnimationFrame(tick);
    const time = clock.time();
    if (clock.playing) {
      adapt(now);
      drawAt(time, false);
    } else {
      lastFrameAt = 0;
      if (time !== shown || !sharp) drawAt(time, true);
    }
    playButton.textContent = clock.playing ? 'Pause' : 'Play';
    playButton.setAttribute('aria-pressed', String(clock.playing));
    if (document.activeElement !== scrubber) scrubber.value = String(time);
    readout.textContent = `${time.toFixed(2)} / ${duration.toFixed(2)} s`;
    shotLabel.textContent = engine.shotIndexAt(time) === 0 ? 'Icon' : 'Wordmark';
  }
  frameHandle = requestAnimationFrame(tick);

  const api = {
    engine,
    values,
    play: () => clock.play(),
    pause: () => clock.pause(),
    seek(time) {
      clock.pause();
      clock.seek(time);
      invalidate();
    },
    renderFrame(time) {
      clock.pause();
      clock.seek(time);
      drawAt(time, true);
      scrubber.value = String(time);
      readout.textContent = `${time.toFixed(2)} / ${duration.toFixed(2)} s`;
      return canvas;
    },
    getTime: () => clock.time(),
  };
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frameHandle);
    observer.disconnect();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    engine.dispose();
  }, { once: true });
  return api;
}
