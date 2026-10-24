import { expect, test } from '@playwright/test'

test('Type Physics study preserves the traced layout, physics, actions, drag, and project state', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await page.getByTitle('Browse examples').click()
  const dialog = page.getByRole('dialog', { name: 'Examples', exact: true })
  await dialog.getByRole('button', { name: 'Type Physics+ mechanism study Typography · Canvas2D / HTML project study', exact: true }).click()
  await dialog.getByRole('button', { name: /Open example|Replace unsaved project/ }).click()

  const frame = page.frameLocator('iframe[title="Project preview"]')
  const canvas = frame.locator('#physics')
  const diagnostics = frame.locator('#diagnostics')
  await expect(canvas).toBeVisible()
  await expect(page.locator('.parameter-count')).toHaveText('32')
  await expect.poll(() => diagnostics.evaluate((element: HTMLOutputElement) => JSON.parse(element.value).letters)).toBe(10)
  await page.locator('iframe[title="Project preview"]').evaluate((element) => {
    (element as HTMLIFrameElement).contentWindow?.postMessage({ type: 'workbench-set-parameter', id: 'textColor', value: '#ff0000' }, '*')
  })
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => {
    const pixels = element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data
    let white = 0
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] > 220 && pixels[index + 1] > 220 && pixels[index + 2] > 220) white++
    }
    return white
  })).toBeGreaterThan(10_000)

  await page.getByRole('button', { name: /Parameters/ }).click()
  const layout = page.getByRole('combobox', { name: 'Layout direction' })
  for (const value of ['right', 'down', 'diag-dl', 'diag-ur', 'circle', 'spiral', 'wave-h', 'wave-v', 'rays']) {
    await layout.selectOption(value)
    await expect.poll(() => diagnostics.evaluate((element: HTMLOutputElement) => JSON.parse(element.value).layout)).toBe(value)
  }

  const ratio = page.getByRole('combobox', { name: 'Canvas ratio' })
  await ratio.selectOption('16:9')
  await expect.poll(() => diagnostics.evaluate((element: HTMLOutputElement) => JSON.parse(element.value).canvas)).toEqual({ width: 1920, height: 1080 })
  await ratio.selectOption('1:1')

  const text = page.locator('textarea[aria-label="Text"]')
  await text.fill('PHYSICS')
  await expect.poll(() => diagnostics.evaluate((element: HTMLOutputElement) => JSON.parse(element.value).letters)).toBe(7)
  await page.getByRole('spinbutton', { name: 'Gravity value' }).fill('4')
  await page.getByRole('combobox', { name: 'One-shot action' }).selectOption('scatter')
  await expect(page.getByRole('combobox', { name: 'One-shot action' })).toHaveValue('none')
  await page.getByRole('combobox', { name: 'One-shot action' }).selectOption('freeze')
  await expect(page.getByRole('combobox', { name: 'One-shot action' })).toHaveValue('none')

  const before = await diagnostics.evaluate((element: HTMLOutputElement) => JSON.parse(element.value).first)
  const canvasRect = await canvas.evaluate((element: HTMLCanvasElement) => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })
  const previewRect = await page.locator('.preview-content').evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })
  const previewScale = previewRect.width / 1440
  const startX = previewRect.x + (canvasRect.x + before.x / 1920 * canvasRect.width) * previewScale
  const startY = previewRect.y + (canvasRect.y + before.y / 1920 * canvasRect.height) * previewScale
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await expect.poll(() => diagnostics.evaluate((element: HTMLOutputElement) => JSON.parse(element.value).dragging)).toBe(true)
  await page.mouse.move(startX + 45, startY + 30, { steps: 6 })
  await page.mouse.up()
  await expect.poll(async () => {
    const current = await diagnostics.evaluate((element: HTMLOutputElement) => JSON.parse(element.value).first)
    return Math.hypot(current.tx - before.tx, current.ty - before.ty)
  }).toBeGreaterThan(20)

  await layout.selectOption('circle')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(canvas).toBeVisible()
  await expect(text).toHaveValue('PHYSICS')
  await expect(layout).toHaveValue('circle')
  await expect(page.getByRole('spinbutton', { name: 'Gravity value' })).toHaveValue('4')
  await canvas.press('1')
  await expect(layout).toHaveValue('right')
  await canvas.press('5')
  await expect(layout).toHaveValue('circle')
  await canvas.press('w')
  await expect.poll(() => diagnostics.evaluate((element: HTMLOutputElement) => JSON.parse(element.value).wave)).toBe(true)
  await expect(page.getByRole('checkbox', { name: 'Wave' })).toBeChecked()
  await canvas.press('w')
  await expect(page.getByRole('checkbox', { name: 'Wave' })).not.toBeChecked()
  expect(errors).toEqual([])
})
