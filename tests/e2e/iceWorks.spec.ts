import { expect, test } from '@playwright/test'

test('Ice Works source port runs its shader, interactions, and original controls', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto('./')
  await page.getByTitle('Browse examples').click()
  const dialog = page.getByRole('dialog', { name: 'Examples', exact: true })
  await dialog.getByRole('button', { name: 'Ice Works showcase study Exploration · Three.js / WebGL', exact: true }).click()
  await dialog.getByRole('button', { name: /Open example|Replace unsaved project/ }).click()

  const frame = page.frameLocator('iframe[title="Project preview"]')
  const scene = frame.locator('.ice-scene')
  const canvas = scene.locator('canvas')
  await expect(scene).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
  await expect(canvas).toBeVisible()
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => ({
    width: element.width,
    height: element.height,
  }))).toEqual({ width: 1440, height: 900 })

  await page.getByRole('button', { name: /Parameters/ }).click()
  await expect(page.locator('.parameter-count')).toHaveText(/1\d{2}/)
  await expect(page.getByRole('spinbutton', { name: 'ring radius value' })).toHaveValue('340')
  await expect(page.getByRole('checkbox', { name: 'enabled' }).first()).toBeVisible()

  const before = await scene.getAttribute('data-active')
  await scene.dispatchEvent('wheel', { deltaY: 900, deltaX: 0 })
  await expect.poll(() => scene.getAttribute('data-active')).not.toBe(before)

  const replay = page.getByRole('combobox', { name: 'replay' })
  await replay.selectOption('run')
  await expect(scene).toHaveAttribute('data-ready', 'false')
  await expect(replay).toHaveValue('idle')
  await expect(scene).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })

  await page.setViewportSize({ width: 1440, height: 760 })
  await expect.poll(() => page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const { top, bottom, height } = element.getBoundingClientRect()
      return { top, bottom, height }
    }
    return {
      workspace: rect('.workspace'),
      explorer: rect('.explorer'),
      editor: rect('.editor-area'),
      statusbar: rect('.statusbar'),
      explorerFoot: rect('.explorer-foot'),
    }
  })).toEqual({
    workspace: { top: 48, bottom: 735, height: 687 },
    explorer: { top: 48, bottom: 735, height: 687 },
    editor: { top: 48, bottom: 735, height: 687 },
    statusbar: { top: 735, bottom: 760, height: 25 },
    explorerFoot: { top: 698, bottom: 735, height: 37 },
  })

  expect(errors).toEqual([])
})
