/** Vite/Pages may supply a deployment prefix without its trailing slash. */
export function deploymentBase(base: string) {
  return base.endsWith('/') ? base : `${base}/`
}

export function deploymentAssetUrl(path: string, base: string, pageUrl: string) {
  return new URL(path, new URL(deploymentBase(base), pageUrl)).href
}
