import { expect, test } from '@playwright/test'

async function openExample(page, accessibleName: string) {
  await page.getByTitle('Browse examples').click()
  const dialog = page.getByRole('dialog', { name: 'Examples', exact: true })
  await dialog.getByRole('button', { name: accessibleName, exact: true }).click()
  await dialog.getByRole('button', { name: /Open example|Replace unsaved project/ }).click()
  return page.frameLocator('iframe[title="Project preview"]')
}

async function colorRange(canvas) {
  return canvas.evaluate((element: HTMLCanvasElement) => {
    const probe = document.createElement('canvas')
    probe.width = 32
    probe.height = 32
    const context = probe.getContext('2d')
    context?.drawImage(element, 0, 0, 32, 32)
    const pixels = context?.getImageData(0, 0, 32, 32).data || []
    let minimum = 255
    let maximum = 0
    for (let index = 0; index < pixels.length; index += 4) {
      for (let channel = 0; channel < 3; channel += 1) {
        minimum = Math.min(minimum, pixels[index + channel])
        maximum = Math.max(maximum, pixels[index + channel])
      }
    }
    return maximum - minimum
  })
}

test('Paper Wake, ASCII Goldfish and Paperbound run as editable parameterized examples', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.location().url.endsWith('/favicon.ico')) errors.push(`${message.text()} @ ${message.location().url}`)
  })
  page.on('response', (response) => { if (response.status() === 404) errors.push(`404 ${response.url()}`) })
  await page.goto('./')

  let frame = await openExample(page, 'Ice Paper Wake Exploration · Three.js / WebGL')
  const wakeCanvas = frame.locator('.wake-canvas')
  await expect(wakeCanvas).toBeVisible()
  await expect.poll(() => wakeCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.width * canvas.height)).toBeGreaterThan(100_000)
  await page.getByRole('button', { name: /Parameters/ }).click()
  await expect(page.getByRole('spinbutton', { name: 'Paper curl value' })).toHaveValue('0.055')
  await page.getByRole('spinbutton', { name: 'Paper curl value' }).fill('0.09')
  await expect(page.getByRole('spinbutton', { name: 'Paper curl value' })).toHaveValue('0.09')
  await expect(wakeCanvas).toHaveAttribute('data-paper-curl', '0.09')
  await expect(wakeCanvas).toHaveAttribute('data-render-ready', 'true')
  await page.screenshot({ path: 'test-results/megd1-wake.png' })

  frame = await openExample(page, 'ASCII Goldfish Glass Exploration · Canvas2D / HTML')
  const pond = frame.locator('#pond')
  await expect(pond).toBeVisible()
  await expect(frame.locator('.glass-add-fish')).toBeVisible()
  await page.getByRole('button', { name: /Parameters/ }).click()
  await page.getByRole('spinbutton', { name: 'Fish count value' }).fill('4')
  await expect.poll(() => frame.locator('.glass-count').getAttribute('aria-label')).toContain('4')
  await page.getByRole('checkbox', { name: 'Paused' }).check()
  await expect(frame.locator('.glass-pause')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => colorRange(pond)).toBeGreaterThan(40)
  await page.screenshot({ path: 'test-results/megd1-goldfish.png' })

  frame = await openExample(page, 'Paperbound interaction study Exploration · Three.js / WebGL')
  const bookCanvas = frame.locator('.bookshelf-canvas--ready')
  await expect(bookCanvas).toBeVisible()
  await expect.poll(() => bookCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.width * canvas.height)).toBeGreaterThan(100_000)
  await page.getByRole('button', { name: /Parameters/ }).click()
  await page.getByRole('combobox', { name: 'Selected volume' }).selectOption('matter')
  await page.getByRole('checkbox', { name: 'Cover open' }).check()
  await expect(page.getByRole('checkbox', { name: 'Cover open' })).toBeChecked()
  await expect(frame.locator('.bookshelf-stage')).toHaveAttribute('data-active-volume', 'matter')
  await expect(frame.locator('.bookshelf-stage')).toHaveAttribute('data-book-view', 'open')
  await expect(bookCanvas).toHaveAttribute('data-render-ready', 'true')
  await page.screenshot({ path: 'test-results/megd1-paperbound.png' })

  await expect(page.locator('.preview-error')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('Paperbound preserves extraction, all seven covers, return, and parameter synchronization', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('./')
  const frame = await openExample(page, 'Paperbound interaction study Exploration · Three.js / WebGL')
  const canvas = frame.locator('.bookshelf-canvas--ready')
  const stage = frame.locator('.bookshelf-stage')
  await expect(canvas).toBeVisible()
  await page.waitForTimeout(1400)
  await page.getByRole('button', { name: /Parameters/ }).click()

  for (const id of ['form', 'light', 'color', 'matter', 'field', 'notes', 'index']) {
    await frame.locator(`button[data-volume="${id}"]`).focus()
    await page.keyboard.press('Enter')
    await expect(stage).toHaveAttribute('data-active-volume', id)
    await expect(stage).toHaveAttribute('data-book-view', 'extracting')
    await expect(page.getByRole('combobox', { name: 'Selected volume' })).toHaveValue(id)
    await expect(stage).toHaveAttribute('data-book-view', 'cover')
    await page.keyboard.press('Enter')
    await expect(stage).toHaveAttribute('data-book-view', 'opening')
    await expect(stage).toHaveAttribute('data-book-view', 'open')
    await expect(page.getByRole('checkbox', { name: 'Cover open' })).toBeChecked()
    await page.keyboard.press('Enter')
    await expect(stage).toHaveAttribute('data-book-view', 'cover')
    await expect(page.getByRole('checkbox', { name: 'Cover open' })).not.toBeChecked()
    await page.keyboard.press('Escape')
    await expect(stage).toHaveAttribute('data-book-view', 'returning')
    await expect(stage).toHaveAttribute('data-book-view', 'shelf')
    await expect(page.getByRole('combobox', { name: 'Selected volume' })).toHaveValue('none')
  }

  // A cover request during extraction must wait for the source cover state.
  await page.getByRole('combobox', { name: 'Selected volume' }).selectOption('matter')
  await expect(stage).toHaveAttribute('data-book-view', 'extracting')
  await page.getByRole('checkbox', { name: 'Cover open' }).check()
  await expect(stage).toHaveAttribute('data-book-view', 'open')
  await page.getByRole('checkbox', { name: 'Reset shelf' }).check()
  await expect(stage).toHaveAttribute('data-book-view', 'shelf')
  await expect(page.getByRole('checkbox', { name: 'Reset shelf' })).not.toBeChecked()

  // Rapid switching keeps the incoming book authoritative while previous books return.
  const selectedVolume = page.getByRole('combobox', { name: 'Selected volume' })
  await selectedVolume.selectOption('form')
  await selectedVolume.selectOption('index')
  await selectedVolume.selectOption('light')
  await expect(stage).toHaveAttribute('data-active-volume', 'light')
  await expect(stage).toHaveAttribute('data-book-view', 'cover')
  await page.getByRole('checkbox', { name: 'Cover open' }).check()
  await page.getByRole('spinbutton', { name: 'Motion speed value' }).fill('2')
  await expect(stage).toHaveAttribute('data-book-view', 'open')
  await page.getByRole('spinbutton', { name: 'Camera zoom value' }).fill('1.2')
  await page.setViewportSize({ width: 1200, height: 800 })
  await expect(canvas).toBeVisible()
  await expect(canvas).toHaveAttribute('data-render-ready', 'true')
  await selectedVolume.selectOption('none')
  await expect(stage).toHaveAttribute('data-book-view', 'shelf')
  await expect(page.locator('.preview-error')).toHaveCount(0)
  expect(errors).toEqual([])
})
