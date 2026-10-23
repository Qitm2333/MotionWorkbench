import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { examples } from '../../src/examples.ts'

const preview = (page: Page) => page.frameLocator('iframe[title="Project preview"]')

test('Examples browser filters the catalog and keeps the active result in sync', async ({ page }) => {
  await page.goto('./')
  await page.getByTitle('Browse examples').click()
  const dialog = page.getByRole('dialog', { name: 'Examples', exact: true })
  const list = dialog.getByRole('navigation', { name: 'Example projects' })
  await expect(list.getByRole('button')).toHaveCount(examples.length)

  await dialog.getByRole('button', { name: 'Bencho Block', exact: true }).click()
  await expect(list.getByRole('button')).toHaveCount(41)
  await expect(dialog.locator('.examples-results-heading small')).toHaveText(`41 / ${examples.length}`)

  const search = dialog.getByRole('searchbox', { name: 'Search examples' })
  await search.fill('Action node')
  await expect(list.getByRole('button')).toHaveCount(1)
  await expect(dialog.getByRole('heading', { name: 'Action node', exact: true })).toBeVisible()
  await expect(list.getByRole('button', { name: /Action node/ })).toHaveAttribute('aria-current', 'true')

  await search.fill('no matching example')
  await expect(list.getByRole('button')).toHaveCount(0)
  await expect(dialog.getByText('No examples match this search.').first()).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Open example/ })).toBeDisabled()
})

test('Space Type Cylinder exposes source controls and renders an editable study', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await page.getByTitle('Browse examples').click()
  const dialog = page.getByRole('dialog', { name: 'Examples', exact: true })
  await dialog.getByRole('button', { name: 'Typography', exact: true }).click()
  await expect(dialog.getByRole('navigation', { name: 'Example projects' }).getByRole('button')).toHaveCount(2)
  await dialog.getByRole('button', { name: /Space Type Generator \/ Cylinder/ }).click()
  await dialog.getByRole('button', { name: /Open example|Replace unsaved project/ }).click()
  const frame = preview(page)
  const canvas = frame.locator('#cylinder')
  await expect(canvas).toBeVisible()
  await expect(page.locator('.parameter-count')).toHaveText('25')
  await expect.poll(() => canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement
    if (!target.width || !target.height) return false
    const pixels = target.getContext('2d')!.getImageData(0, 0, target.width, target.height).data
    let minX = target.width, maxX = 0, minY = target.height, maxY = 0
    for (let y = 0; y < target.height; y += 2) for (let x = 0; x < target.width; x += 2) {
      if (pixels[(y * target.width + x) * 4] < 120) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x)
        minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      }
    }
    return maxX - minX > 250 && maxY - minY > 40
  })).toBe(true)
  const iframe = page.locator('iframe[title="Project preview"]')
  await iframe.evaluate((element) => {
    element.setAttribute('data-load-count', '0')
    element.addEventListener('load', () => element.setAttribute('data-load-count', String(Number(element.getAttribute('data-load-count')) + 1)))
  })
  await page.getByRole('button', { name: /Parameters/ }).click()
  await page.getByRole('combobox', { name: 'Cylinder preset' }).selectOption('Jellyfish')
  await expect(page.getByRole('spinbutton', { name: 'Cylinder count value' })).toHaveValue('6')
  await expect(frame.locator('#cylinder')).toBeVisible()
  await expect(iframe).toHaveAttribute('data-load-count', '0')
  await page.getByRole('checkbox', { name: 'PRIDE! six-color layers' }).check()
  await expect(page.getByRole('spinbutton', { name: 'Cylinder count value' })).toHaveValue('6')
  await frame.locator('#phrase').fill('CYLINDER TEST')
  expect(errors).toEqual([])
})

test('Space Type Field maps its grid, wave phases, palette and presets to Workbench parameters', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await page.getByTitle('Browse examples').click()
  const dialog = page.getByRole('dialog', { name: 'Examples', exact: true })
  await dialog.getByRole('button', { name: 'Typography', exact: true }).click()
  await expect(dialog.getByRole('navigation', { name: 'Example projects' }).getByRole('button')).toHaveCount(2)
  await dialog.getByRole('button', { name: /Space Type Generator \/ Field/ }).click()
  await dialog.getByRole('button', { name: /Open example|Replace unsaved project/ }).click()
  const frame = preview(page)
  const canvas = frame.locator('#field')
  await expect(canvas).toBeVisible()
  await expect.poll(() => canvas.evaluate(async () => {
    await document.fonts.ready
    return document.fonts.check('24px "IBM Plex Mono"')
  })).toBe(true)
  await expect(page.locator('.parameter-count')).toHaveText('40')
  await page.getByRole('button', { name: /Parameters/ }).click()
  await expect(page.getByRole('checkbox', { name: 'Fill the full grid with text' })).not.toBeChecked()
  await expect.poll(() => canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement
    if (!target.width || !target.height) return false
    const pixels = target.getContext('2d')!.getImageData(0, 0, target.width, target.height).data
    let marks = 0
    for (let i = 0; i < pixels.length; i += 32) if (pixels[i] < 120) marks++
    return marks > 100
  })).toBe(true)
  await page.getByRole('combobox', { name: 'Field preset' }).selectOption('Stacks')
  await expect(page.getByRole('spinbutton', { name: 'Columns value' })).toHaveValue('22')
  await expect(page.getByRole('spinbutton', { name: 'Rows value' })).toHaveValue('8')
  await expect(page.getByRole('checkbox', { name: 'Fill the full grid with text' })).toBeChecked()
  await page.getByRole('combobox', { name: 'Field preset' }).selectOption('Complex Z')
  await expect(page.getByRole('spinbutton', { name: 'Z-axis amplitude value' })).toHaveValue('41')
  await expect(page.getByRole('checkbox', { name: 'Y-wave phase shift' })).toBeChecked()
  await page.getByRole('checkbox', { name: 'Use layer 3' }).check()
  await expect(page.getByRole('checkbox', { name: 'Use layer 2' })).toBeChecked()
  await expect(page.getByRole('combobox', { name: 'Field preset' })).toHaveValue('Custom')
  await frame.locator('#phrase').fill('FIELD TEST')
  expect(errors).toEqual([])
})

test('Examples browser fits a narrow viewport and scrolls its results independently', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByTitle('Browse examples').click()
  const dialog = page.getByRole('dialog', { name: 'Examples', exact: true })
  const metrics = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const list = element.querySelector('.examples-list')!
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      listHeight: list.clientHeight,
      listScrollHeight: list.scrollHeight,
    }
  })
  expect(metrics.left).toBeGreaterThanOrEqual(0)
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth)
  expect(metrics.top).toBeGreaterThanOrEqual(0)
  expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight)
  expect(metrics.listScrollHeight).toBeGreaterThan(metrics.listHeight)
  await dialog.getByRole('button', { name: /Open example/ }).scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('button', { name: /Open example/ })).toBeVisible()
})

test('Orbit study resolves project-relative TypeScript imports in the editor', async ({ page }) => {
  await page.goto('./')
  await openExample(page, 'Motion postcard')
  await openExample(page, 'Orbit study')
  await expect(page.locator('.statusbar')).toContainText('Running')
  await page.waitForTimeout(2500)
  await expect(page.locator('.monaco-editor .squiggly-error')).toHaveCount(0)
  await page.getByRole('button', { name: 'orbit-scene.ts', exact: true }).click()
  await expect(page.locator('.monaco-editor .squiggly-error')).toHaveCount(0)
  await expect(page.locator('canvas[aria-label="Canvas2D animation preview"]')).toBeVisible()
})

async function openExample(page: Page, name: string) {
  await page.getByTitle('Browse examples').click()
  await page.getByRole('button', { name: new RegExp(name) }).click()
  await page.getByRole('button', { name: /Open example|Replace unsaved project/ }).click()
  await expect(page.getByRole('dialog', { name: 'Examples', exact: true })).not.toBeVisible()
}

// Scroll iframe contents, wait out spring layout motion, then map the virtual
// viewport into the preview's CSS transform for a real mouse click.
async function clickInPreview(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded()
  const inner = await target.evaluate((element) => new Promise<{ x: number; y: number; width: number; height: number; viewport: number }>((resolve) => {
    let previous = element.getBoundingClientRect(), stable = 0
    const start = performance.now()
    function check() {
      const rect = element.getBoundingClientRect()
      stable = Math.abs(rect.x - previous.x) + Math.abs(rect.y - previous.y) + Math.abs(rect.width - previous.width) + Math.abs(rect.height - previous.height) < 0.25 ? stable + 1 : 0
      previous = rect
      if (stable >= 3 || performance.now() - start > 2000) resolve({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, viewport: innerWidth })
      else requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  }))
  const outer = (await page.locator('iframe').boundingBox())!
  const scale = outer.width / inner.viewport
  await page.mouse.click(outer.x + (inner.x + inner.width / 2) * scale, outer.y + (inner.y + inner.height / 2) * scale)
}

async function draftAssetCount(page: Page) {
  return page.evaluate(() => new Promise<number>((resolve, reject) => {
    const open = indexedDB.open('motion-workbench', 1)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const request = db.transaction('drafts').objectStore('drafts').get('current')
      request.onsuccess = () => { resolve(Object.keys(request.result?.project.assets ?? {}).length); db.close() }
      request.onerror = () => { reject(request.error); db.close() }
    }
  }))
}

test('Three.js local model, parameters, pause, reset, reapply and portable round trip', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByRole('button', { name: /Three\.js/ }).click()
  await expect(page.locator('.parameter-count')).toHaveText('7')
  const frame = preview(page)
  // WebGL clears its drawing buffer after compositing; assert the rendered
  // canvas dimensions instead of reading pixels from a non-preserved buffer.
  const scene = frame.locator('#scene')
  await expect(scene).toBeVisible()
  await expect.poll(() => scene.evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    return canvas.width > 0 && canvas.height > 0
  })).toBe(true)
  await page.getByRole('button', { name: /Parameters/ }).click()
  await expect(page.getByRole('spinbutton', { name: 'Rotation speed value', exact: true })).toBeVisible()
  await page.getByRole('spinbutton', { name: 'Rotation speed value', exact: true }).fill('1.2')
  await page.getByRole('spinbutton', { name: 'Rotation speed value', exact: true }).press('Tab')
  await page.getByTitle('Pause', { exact: true }).click()
  const frozen = await frame.locator('body').evaluate(() => performance.now())
  await page.waitForTimeout(200)
  expect(await frame.locator('body').evaluate(() => performance.now())).toBe(frozen)
  await page.getByTitle('Resume', { exact: true }).click()
  await expect.poll(() => frame.locator('body').evaluate(() => performance.now())).toBeGreaterThan(frozen)
  await page.getByTitle('Reset simulation', { exact: true }).click()
  await expect(frame.locator('#scene')).toBeVisible()
  for (let index = 0; index < 2; index++) {
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(scene).toBeVisible()
    await expect(frame.locator('canvas')).toHaveCount(1)
  }
  const download = page.waitForEvent('download')
  await page.getByTitle('Export portable project').click()
  const file = await download
  await page.locator('input[type="file"]').setInputFiles((await file.path())!)
  await expect(page.locator('.asset-section summary small')).toHaveText('2')
  await expect(page.locator('.parameter-count')).toHaveText('7')
  await expect(scene).toBeVisible()
  expect(errors).toEqual([])
})

test('React + TypeScript starter mounts in isolation, responds to input and survives reapply', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByRole('button', { name: /React \+ TypeScript/ }).click()
  const frame = page.frameLocator('iframe[title="Project preview"]')
  const toggle = frame.getByRole('button', { name: /Open the motion study|Motion in progress/ })
  await expect(toggle).toBeVisible()
  await expect(frame.locator('.study')).toBeVisible()
  await toggle.click()
  await expect(frame.getByText('Motion in progress')).toBeVisible()
  await expect.poll(() => frame.locator('body').evaluate(() => {
    try { void parent.document.body; return false } catch { return true }
  })).toBe(true)
  for (let index = 0; index < 2; index++) {
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(frame.locator('#root > .study')).toHaveCount(1)
  }
  await page.getByTitle('Pause', { exact: true }).click()
  await expect(page.locator('.statusbar')).toContainText('Paused')
  await page.getByTitle('Resume', { exact: true }).click()
  await page.getByTitle('Reset simulation', { exact: true }).click()
  await expect(toggle).toBeVisible()
  expect(errors).toEqual([])
})

test('all imported React blocks mount with the fixed dependency runtime', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  const frame = page.frameLocator('iframe[title="Project preview"]')
  const blocks = examples.filter((example) => example.id.startsWith('bencho-'))
  expect(blocks).toHaveLength(41)
  for (const example of blocks) {
    await openExample(page, example.name)
    await expect(frame.locator('#root > .bencho-example'), example.name).toBeVisible()
    await expect(page.locator('.statusbar'), example.name).not.toContainText('Build failed')
  }
  expect(errors).toEqual([])
})

test('Apple desktop poses, slider, orbit, mobile scene, sandbox and large draft recovery', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await openExample(page, 'Apple Duo interaction study')
  const frame = preview(page)
  await expect(frame.locator('.viewer')).toHaveAttribute('data-ready', 'true')
  await expect(frame.locator('.viewer')).toHaveAttribute('data-scene', 'L')
  // Ready means WebGL is loaded; intro controls are intentionally inert until
  // their entrance animation completes. Wait before sending a real click.
  await expect(frame.locator('.controls')).toHaveClass(/intro-complete/)
  await expect(frame.locator('.item.active')).toHaveAttribute('data-index', '0')
  await clickInPreview(page, frame.locator('.item-open').nth(2))
  await expect(frame.locator('.item.active')).toHaveAttribute('data-index', '2')
  await clickInPreview(page, frame.locator('#close'))
  await clickInPreview(page, frame.locator('.item-open').first())
  await expect(frame.locator('.item.active')).toHaveAttribute('data-index', '0')
  await frame.locator('#fold').evaluate((element) => {
    const slider = element as HTMLInputElement
    slider.value = '0.9'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect.poll(() => frame.locator('#diagnostics').textContent()).toContain('"target":0.9')
  await clickInPreview(page, frame.locator('#close'))
  const area = frame.locator('#hit-area')
  await expect.poll(async () => JSON.parse((await frame.locator('#diagnostics').textContent())!).activation).toBeLessThan(0.01)
  const before = JSON.parse((await frame.locator('#diagnostics').textContent())!)
  await area.scrollIntoViewIfNeeded()
  const outer = (await page.locator('iframe').boundingBox())!
  const bounds = await area.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, viewport: innerWidth }
  })
  const scale = outer.width / bounds.viewport
  const x = outer.x + (bounds.x + bounds.width * 0.7) * scale
  const y = outer.y + (bounds.y + bounds.height * 0.5) * scale
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 90 * scale, y + 25 * scale, { steps: 12 })
  await page.mouse.up()
  await expect.poll(async () => {
    const after = JSON.parse((await frame.locator('#diagnostics').textContent())!)
    return Math.abs(after.theta - before.theta) + Math.abs(after.phi - before.phi)
  }).toBeGreaterThan(0.01)
  expect(await frame.locator('body').evaluate(() => {
    try { void parent.document.body; return false } catch { return true }
  })).toBe(true)
  await expect.poll(() => draftAssetCount(page)).toBe(329)
  await page.reload()
  await page.getByRole('button', { name: 'Recover draft', exact: true }).click()
  await expect(preview(page).locator('.viewer')).toHaveAttribute('data-ready', 'true')
  await page.getByRole('combobox', { name: 'Page viewport size' }).selectOption('390x844')
  await page.getByTitle('Reset simulation', { exact: true }).click()
  await expect(preview(page).locator('.viewer')).toHaveAttribute('data-ready', 'true')
  await expect(preview(page).locator('.viewer')).toHaveAttribute('data-scene', 'S')
  expect(errors).toEqual([])
})

test('Catalog navigation and Canvas2D/HTML switching still work', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await openExample(page, 'Catalog motion study')
  await expect(page.locator('.parameter-count')).toHaveText('5')
  const frame = preview(page)
  await clickInPreview(page, frame.locator('.node-anchor[data-target="product-design"]'))
  await expect(frame.locator('#catalogStatus')).toContainText('Digital. 60 works.')
  await expect(frame.locator('.project-card[data-key="card:archiv"]')).toBeVisible()
  await openExample(page, 'Orbit study')
  await expect(page.locator('canvas[aria-label="Canvas2D animation preview"]')).toBeVisible()
  await openExample(page, 'Motion postcard')
  await expect(preview(page).locator('.sun')).toBeVisible()
  expect(errors).toEqual([])
})
