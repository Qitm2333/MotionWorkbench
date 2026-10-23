export type ProjectAsset = { mime: string; base64: string }

export function assetMime(path: string) {
  const extension = path.split('.').pop()?.toLowerCase() ?? ''
  return ({ gltf: 'model/gltf+json', glb: 'model/gltf-binary', json: 'application/json', lsd: 'application/json',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', avif: 'image/avif', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
    woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', mp4: 'video/mp4', webm: 'video/webm',
    wasm: 'application/wasm', css: 'text/css', js: 'text/javascript', html: 'text/html', md: 'text/plain',
  } as Record<string, string>)[extension] ?? 'application/octet-stream'
}

export function isProjectAsset(path: string) {
  return /\.(?:glb|gltf|bin|exr|hdr|ktx2?|basis|lsd|json|png|jpe?g|avif|webp|gif|svg|woff2?|ttf|otf|mp4|webm|wasm|md)$/i.test(path)
}

export function encodeAsset(buffer: ArrayBuffer, mime: string): ProjectAsset {
  const bytes = new Uint8Array(buffer)
  let text = ''
  for (let offset = 0; offset < bytes.length; offset += 32768) text += String.fromCharCode(...bytes.subarray(offset, offset + 32768))
  return { mime, base64: btoa(text) }
}

export function decodeAsset(asset: ProjectAsset) {
  return Uint8Array.from(atob(asset.base64), (character) => character.charCodeAt(0))
}
