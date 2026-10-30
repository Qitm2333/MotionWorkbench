import { interpolate } from "./driver.js";
function parseDome(data) {
  const keys = [data.radius, data.height, data.morph, data.settle];
  const validKeys = keys.every((curve) => Array.isArray(curve) && curve.length > 0 && curve.every((key, index) => Array.isArray(key) && key.length === 2 && Number.isFinite(key[0]) && Number.isFinite(key[1]) && (index === 0 || key[0] > curve[index - 1][0])));
  if (!validKeys || !Array.isArray(data.center) || data.center.length !== 2) {
    throw new Error("Invalid dome data");
  }
  return data;
}
function domeAt(shot, p, t) {
  const d = shot.dome;
  const settle = interpolate(d.settle, t);
  const morph = interpolate(d.morph, t);
  const between = (key) => d.from[key] + (d.to[key] - d.from[key]) * settle;
  return {
    radius: interpolate(d.radius, t),
    height: Math.max(0, interpolate(d.height, t)) * p.dome,
    exponent: 2 + (d.exponent - 2) * morph,
    aspect: 1 + (d.aspect - 1) * morph,
    settle,
    crown: between("crown"),
    shoulder: between("shoulder"),
    flat: between("flat"),
    edge: between("edge"),
    ring: shot.ring ? interpolate(shot.ring, t) : 0,
    ringReach: shot.ringReach ? interpolate(shot.ringReach, t) : p.ringOffset,
    // the rod's ripples decay from the start, and are gone once the dome has settled
    ripple: shot.ripple ? shot.ripple.height * Math.exp(-t / shot.ripple.decay) * (1 - settle) : 0
  };
}
export {
  domeAt,
  parseDome
};
