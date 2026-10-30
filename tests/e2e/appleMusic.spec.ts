import { expect, test } from '@playwright/test'

test('Apple Music source renderer plays, seeks, steps and replaces a logo', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 800, height: 600 })
  await page.goto('./examples/apple-music-liquid/index.html')
  const canvas = page.locator('canvas')
  await page.waitForFunction(() => '__appleMusicStudy' in window)
  const scrubber = page.getByRole('slider', { name: 'Film time' })
  const seek = async (time: number) => {
    await scrubber.fill(String(time))
    await expect(page.locator('[data-time]')).toContainText(time.toFixed(2))
  }
  const pixels = () => canvas.evaluate((element) => {
    const c = element as HTMLCanvasElement
    const gl = c.getContext('webgl2')!
    const pixels = new Uint8Array(c.width * c.height * 4)
    gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    return { error: gl.getError(), energy: pixels.reduce((sum, value, index) => sum + (index % 4 === 3 ? 0 : value), 0) }
  })
  await seek(0.6)
  const icon = await pixels()
  expect(icon.error).toBe(0)
  expect(icon.energy).toBeGreaterThan(100_000)
  await seek(2.1)
  await expect(page.locator('[data-shot]')).toHaveText('Wordmark')
  expect((await pixels()).energy).not.toBe(icon.energy)
  await seek(0.6)
  expect((await pixels()).energy).toBe(icon.energy)
  await canvas.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-time]')).toContainText('0.63')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => Number((await page.locator('[data-time]').textContent())?.split(' / ')[0])).toBeGreaterThan(0.7)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await seek(4)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { __appleMusicStudy: { getTime(): number } }
  ).__appleMusicStudy.getTime())).toBeLessThan(2)
  await page.evaluate(() => (
    window as typeof window & { __appleMusicStudy: { pause(): void } }
  ).__appleMusicStudy.pause())
  await seek(0.6)
  await page.locator('[data-file]').setInputFiles({
    name: 'logo.svg', mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="white"/></svg>'),
  })
  await expect(page.locator('[data-status]')).toHaveText('icon logo loaded')
  await expect.poll(async () => (await pixels()).energy).not.toBe(icon.energy)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => canvas.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(390)
  expect(errors).toEqual([])
})

test('Apple Music opens with local assets and redraws parameters without reloading the preview', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await page.getByTitle('Browse examples').click()
  const dialog = page.getByRole('dialog', { name: 'Examples', exact: true })
  await dialog.getByRole('button', { name: /Apple Music liquid logo/ }).click()
  await dialog.getByRole('button', { name: /Open example|Replace unsaved project/ }).click()
  const frame = page.frameLocator('iframe[title="Project preview"]')
  await expect(frame.locator('canvas')).toBeVisible()
  await expect(page.locator('.parameter-count')).toHaveText('11')
  await frame.getByRole('slider', { name: 'Film time' }).fill('0.6')
  await expect(frame.locator('[data-time]')).toContainText('0.60')
  const before = await frame.locator('canvas').screenshot()
  await page.getByRole('button', { name: /Parameters/ }).click()
  await page.getByRole('spinbutton', { name: 'Dispersion value', exact: true }).fill('0')
  await expect.poll(() => frame.locator('canvas').evaluate((element) => {
    const runtime = (element.ownerDocument.defaultView as unknown as {
      __appleMusicStudy: { engine: { getParams(index: number): { dispersion: number } } }
    }).__appleMusicStudy
    return runtime.engine.getParams(0).dispersion
  })).toBe(0)
  expect((await frame.locator('canvas').screenshot()).equals(before)).toBe(false)
  await expect(frame.locator('[data-time]')).toContainText('0.60')
  await expect(frame.locator('[data-status]')).toBeEmpty()
  expect(errors).toEqual([])
})
