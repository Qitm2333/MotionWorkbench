const MAX_PIXELS = 3840 * 2160;
function drawingSize(canvas, { scale = 1, maxPixels = MAX_PIXELS, aspect } = {}) {
  const box = canvas.getBoundingClientRect();
  const dpr = globalThis.devicePixelRatio || 1;
  let w = Math.max(1, box.width * dpr * scale);
  let h = aspect ? w / aspect : Math.max(1, box.height * dpr * scale);
  const over = Math.sqrt(w * h / maxPixels);
  if (over > 1) {
    w /= over;
    h /= over;
  }
  return [Math.round(w), Math.round(h)];
}
export {
  MAX_PIXELS,
  drawingSize
};
