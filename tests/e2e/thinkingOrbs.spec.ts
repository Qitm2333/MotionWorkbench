import { expect, test } from '@playwright/test'

test('Thinking Orbs switches source states, size, speed and theme on Canvas2D', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1024, height: 820 })
  await page.goto('./examples/thinking-orbs/index.html')
  const canvas = page.locator('.hero-orb')
  await expect(canvas).toBeVisible()
  await expect(page.locator('[data-states] .state-button')).toHaveCount(9)

  const pixels = () => canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('2d')!
    return [...context.getImageData(0, 0, 128, 128).data].reduce((sum, value) => sum + value, 0)
  })
  const listening = await pixels()
  await page.getByRole('button', { name: 'shaping: Circle → triangle → square' }).click()
  await expect(page.locator('[data-state-name]')).toHaveText('Shaping')
  const shaping = await pixels()
  expect(shaping).not.toBe(listening)

  await page.getByRole('button', { name: 'Light', exact: true }).click()
  await expect(page.locator('.workbench-orbs')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
  const before = await pixels()
  await page.waitForTimeout(250)
  expect(await pixels()).not.toBe(before)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const paused = await pixels()
  await page.waitForTimeout(250)
  expect(await pixels()).toBe(paused)
  expect(errors).toEqual([])

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.state-grid')).toBeVisible()
  expect(await page.locator('body').evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(390)
})

test('Thinking Orbs loads through the Workbench parameter bridge', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await page.getByTitle('Browse examples').click()
  const dialog = page.getByRole('dialog', { name: 'Examples', exact: true })
  await dialog.getByRole('button', { name: /Thinking Orbs/ }).click()
  await dialog.getByRole('button', { name: /Open example|Replace unsaved project/ }).click()
  const frame = page.frameLocator('iframe[title="Project preview"]')
  await expect(frame.locator('.hero-orb')).toBeVisible()
  await expect(page.locator('.parameter-count')).toHaveText('5')
  await page.getByRole('button', { name: /Parameters/ }).click()
  await page.getByRole('combobox', { name: 'Motion state' }).selectOption('shaping')
  await expect(frame.locator('[data-state-name]')).toHaveText('Shaping')
  await expect(frame.locator('.hero-orb')).toHaveAttribute('aria-label', 'Shaping animation')
  await page.getByRole('combobox', { name: 'Tuned size preset' }).selectOption('20')
  await expect(frame.locator('[data-preset-size]')).toHaveText('20 px preset')
  await page.getByRole('spinbutton', { name: 'Speed multiplier value' }).fill('1.5')
  await expect(frame.getByRole('slider', { name: 'Animation speed' })).toHaveValue('150')
  await page.getByRole('combobox', { name: 'Ink theme' }).selectOption('light')
  await expect(frame.locator('.workbench-orbs')).toHaveAttribute('data-theme', 'light')
  expect(errors).toEqual([])
})
