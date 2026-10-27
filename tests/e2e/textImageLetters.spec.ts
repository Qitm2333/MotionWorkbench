import { expect, test } from '@playwright/test'

test('Text to image letters opens with mapped assets and live Workbench parameters', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await page.getByTitle('Browse examples').click()
  const dialog = page.getByRole('dialog', { name: 'Examples', exact: true })
  await dialog.getByRole('button', { name: 'Exploration', exact: true }).click()
  await dialog.getByRole('button', { name: /Text to image letters/ }).click()
  await dialog.getByRole('button', { name: /Open example|Replace unsaved project/ }).click()

  const frame = page.frameLocator('iframe[title="Project preview"]')
  await expect(frame.locator('#words .letter')).toHaveCount(11)
  await expect(frame.locator('#status')).toContainText('将鼠标移到字母上')
  await expect(frame.locator('#words .sticker img')).toHaveCount(0)
  await expect(page.locator('.parameter-count')).toHaveText('4')
  await expect(frame.locator('#replay')).toBeEnabled()
  await expect(frame.locator('#pause')).toBeEnabled()

  await page.getByRole('button', { name: /Parameters/ }).click()
  await page.getByRole('spinbutton', { name: 'Entry duration value' }).fill('500')
  await expect(frame.locator('html')).toHaveAttribute('style', /--exit-duration: 620ms/)
  await page.getByRole('spinbutton', { name: 'Simultaneous image letters value' }).fill('2')
  await page.getByRole('checkbox', { name: 'Automatic playback' }).uncheck()

  const selectedIndex = 5
  const previewFrame = page.locator('iframe[title="Project preview"]')
  const previewBox = await previewFrame.boundingBox()
  if (!previewBox) throw new Error('Project preview is not visible')
  const pointFor = async (selector: string, index = 0) => {
    const point = await frame.locator(selector).nth(index).evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: innerWidth, height: innerHeight }
    })
    return {
      x: previewBox.x + point.x * previewBox.width / point.width,
      y: previewBox.y + point.y * previewBox.height / point.height,
    }
  }
  const moveToLetter = async (index: number) => {
    const point = await pointFor('#words .hit', index)
    await page.mouse.move(point.x, point.y)
  }
  await moveToLetter(selectedIndex)
  await expect(frame.locator('#words .letter').nth(selectedIndex)).toHaveClass(/active/)
  const selectedImage = frame.locator('#words .letter').nth(selectedIndex).locator('.sticker img')
  await expect(await selectedImage.evaluate((element) => (element as HTMLImageElement).naturalWidth > 0)).toBe(true)
  await expect(selectedImage).toHaveAttribute('src', /^blob:/)
  await expect(frame.locator('#words .letter.active')).toHaveCount(1)
  await moveToLetter(4)
  await expect(frame.locator('#words .letter.active')).toHaveCount(1)

  const replayPoint = await pointFor('#replay')
  await page.mouse.click(replayPoint.x, replayPoint.y)
  await expect(frame.locator('#status')).toContainText('将鼠标移到字母上')
  expect(errors).toEqual([])
})
