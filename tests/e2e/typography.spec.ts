import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { examples } from '../../src/examples.ts'

const studies = examples.filter((example) => example.category === 'Typography' && example.id.startsWith('space-type-') && !['space-type-cylinder', 'space-type-field'].includes(example.id))

for (const study of studies) test(`${study.name}: source controls, strings and every preset`, async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await page.getByTitle('Browse examples').click()
  const dialog = page.getByRole('dialog', { name: 'Examples', exact: true })
  await dialog.getByRole('button', { name: study.name + ' Typography · Original p5.js study', exact: true }).click()
  await dialog.getByRole('button', { name: /Open example|Replace unsaved project/ }).click()
  const frame = page.frameLocator('iframe[title="Project preview"]')
  await expect(frame.locator('canvas').first()).toBeVisible()
  await expect(page.locator('.parameter-count')).not.toHaveText('0')
  await page.getByRole('button', { name: /Parameters/ }).click()
  const controls = frame.locator('[data-workbench-parameter-id]')
  const strings = await controls.evaluateAll((elements) => elements.filter((element) => element.tagName === 'TEXTAREA' || (element as HTMLInputElement).type === 'text').map((element) => ({
    id: (element as HTMLElement).dataset.workbenchParameterId!, value: (element as HTMLInputElement).value,
  })))
  const inputs = page.locator('.parameter-text')
  await expect(inputs).toHaveCount(strings.length)
  for (const [index, text] of strings.entries()) {
    await expect(inputs.nth(index)).toHaveValue(text.value)
    const replacement = 'WORKBENCH ' + index
    await inputs.nth(index).fill(replacement)
    await expect(frame.locator(`[data-workbench-parameter-id="${text.id}"]`)).toHaveValue(replacement)
  }
  await expect(frame.locator('[data-workbench-source-control]:visible')).toHaveCount(0)
  await expect(frame.locator('#widget:visible,#generatorInput:visible,.bottom:visible,.dropdown:visible,.switch:visible')).toHaveCount(0)

  const source = readFileSync(`public/examples/${study.projectDirectory}/workbench-parameters.js`, 'utf8')
  const config = JSON.parse(source.slice(source.indexOf('=') + 1, source.indexOf(';')))
  const preset = page.getByRole('combobox', { name: 'Preset', exact: true })
  if (config.presetLabels.length) {
    await expect(preset.locator('option')).toHaveCount(config.presetLabels.length + 1)
    await page.getByTitle('Pause', { exact: true }).click()
    for (const label of config.presetLabels) {
      await preset.selectOption(label)
      await expect(preset).toHaveValue(label)
      // Compare every mirrored control against the actual source DOM after the callback.
      const values = await controls.evaluateAll((elements) => elements.filter((element) => (element as HTMLInputElement).type !== 'radio' || (element as HTMLInputElement).checked).map((element) => {
        const input = element as HTMLInputElement
        return { id: input.dataset.workbenchParameterId!, value: input.type === 'checkbox' ? input.checked : input.type === 'range' || input.type === 'number' ? Number(input.value) : input.value }
      }))
      const published = await frame.locator('html').evaluate(() => ({ ...(window as unknown as {workbench: {params: {values: Record<string, unknown>}}}).workbench.params.values }))
      for (const value of values) expect(published[value.id], `${label}: ${value.id}`).toEqual(value.value)
      if ('sourcePaletteCount' in published) {
        expect(published.sourcePaletteCount).toBe(await frame.locator('html').evaluate(() => (window as unknown as { inpNumber: number }).inpNumber))
      }
      await expect.poll(() => page.locator('.parameter-card').evaluateAll((cards) => Object.fromEntries(cards.map((card) => {
        const input = card.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input:not([type="range"]),textarea,select')!
        return [(card as HTMLElement).dataset.parameterId!, input instanceof HTMLInputElement && input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value]
      }))), { message: `${label}: panel must reflect source callback` }).toEqual(published)
    }
    await page.getByTitle('Resume', { exact: true }).click()
    const saved = await frame.locator('html').evaluate(() => ({ ...(window as unknown as {workbench: {params: {values: Record<string, unknown>}}}).workbench.params.values }))
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(frame.locator('canvas').first()).toBeVisible()
    await expect.poll(() => frame.locator('html').evaluate(() => ({ ...(window as unknown as {workbench: {params: {values: Record<string, unknown>}}}).workbench.params.values }))).toEqual(saved)
  } else await expect(preset).toHaveCount(0)
  expect(errors).toEqual([])
})
