// The composite writes straight to the default framebuffer with no automatic
// output conversion, so anything it mixes in — background, dither palettes —
// has to arrive already in display space. THREE.Color would convert hex to
// linear on the way in, which is exactly what we don't want here, so unpack the
// components by hand into a plain Vector3.
import * as THREE from "three";

export function hexToSRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255
  );
}
