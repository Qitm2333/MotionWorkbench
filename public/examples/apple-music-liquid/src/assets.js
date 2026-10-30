async function loadImage(src) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();
  return img;
}
function imageAspect(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  return w > 0 && h > 0 ? w / h : 1;
}
function rasterize(img, width, aspect) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.max(1, Math.round(width / aspect));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}
function toMask(canvas, mode = "alpha") {
  const ctx = canvas.getContext("2d");
  const im = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) * (d[i + 3] / 255);
    const a = mode === "alpha" ? d[i + 3] : Math.round(mode === "luminance" ? lum : 255 - lum);
    d[i] = d[i + 1] = d[i + 2] = 255;
    d[i + 3] = a;
  }
  ctx.putImageData(im, 0, 0);
  return canvas;
}
export {
  imageAspect,
  loadImage,
  rasterize,
  toMask
};
