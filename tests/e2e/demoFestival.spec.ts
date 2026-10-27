import { expect, test } from '@playwright/test'

test('DEMO intro composites transparent scaled pixels without edge streaks', async ({ page }) => {
  await page.goto('./examples/demo-festival/index.html')
  await page.waitForFunction(() => 'DemoFestivalRenderer' in window && 'DemoFestivalMotion' in window)
  const results = await page.evaluate(async () => {
    const runtime = window as unknown as {
      DemoFestivalRenderer: {
        createRenderer(canvas: HTMLCanvasElement, images: Record<string, HTMLImageElement>): {
          gl: WebGLRenderingContext
          resize(width: number, height: number): void
          render(frame: unknown, options: unknown): void
          dispose(): void
        }
      }
      DemoFestivalMotion: { letterAnchors(x: number, y: number): unknown }
    }
    const images = Object.fromEntries(await Promise.all(['d', 'e', 'm', 'o'].map(async (letter) => {
      const image = new Image()
      image.src = `./assets/${letter}.webp`
      await image.decode()
      return [letter, image] as const
    })))
    const canvas = document.createElement('canvas')
    const renderer = runtime.DemoFestivalRenderer.createRenderer(canvas, images)
    const gl = renderer.gl
    const options = {
      gap: 5, inputMin: 0.53, midpoint: 0.5, inputMax: 0.583,
      outputMin: 0, outputMax: 1, foreground: '#ffffff', background: '#000000',
      antialiasing: false,
    }
    const cases = []
    try {
      for (const [width, height] of [[720, 450], [901, 601]]) {
        renderer.resize(width, height)
        const pixels = new Uint8Array(width * height * 4)
        for (const scale of [0.2, 0.45, 0.8, 1]) {
          for (const [x, y] of [[0, 0], [-1, 1], [1, -1]]) {
            for (const [top, bottom, splitY] of [[0.5, 0.5, 0.5], [0.27, 0.73, 0.63]]) {
              const horizontal = (1 - splitY) * height
              // The visible intro bounds grow from each of the four corners.
              const bounds = [
                [0, 0, (top * width - options.gap) * scale, (horizontal - options.gap) * scale],
                [width - ((1 - top) * width - options.gap) * scale, 0, width, (horizontal - options.gap) * scale],
                [0, height - (splitY * height - options.gap) * scale, (bottom * width - options.gap) * scale, height],
                [width - ((1 - bottom) * width - options.gap) * scale, height - (splitY * height - options.gap) * scale, width, height],
              ]
              for (const antialiasing of [false, true]) {
                renderer.render({
                  anchors: runtime.DemoFestivalMotion.letterAnchors(x, y),
                  splitTop: top, splitBottom: bottom, splitY, scale, globalX: 0, globalY: 0,
                }, { ...options, antialiasing })
                gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
                let escaped = 0
                let visible = 0
                for (let py = 0; py < height; py += 3) {
                  for (let px = 0; px < width; px += 3) {
                    const offset = ((height - 1 - py) * width + px) * 4
                    if (pixels[offset] <= 8) continue
                    visible += 1
                    // Leave room for the source's eight-pixel FXAA search span.
                    if (!bounds.some(([x0, y0, x1, y1]) => px >= x0 - 12 && px <= x1 + 12 && py >= y0 - 12 && py <= y1 + 12)) escaped += 1
                  }
                }
                cases.push({ width, height, scale, x, y, top, bottom, splitY, antialiasing, escaped, visible, error: gl.getError() })
              }
            }
          }
        }
      }
    } finally {
      renderer.dispose()
    }
    return cases
  })
  expect(results).toHaveLength(96)
  for (const result of results) {
    expect(result.escaped, JSON.stringify(result)).toBe(0)
    expect(result.visible, JSON.stringify(result)).toBeGreaterThan(50)
    expect(result.error, JSON.stringify(result)).toBe(0)
  }
})

test('DEMO Festival study loads its glyphs and renders through WebGL without runtime errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await page.getByTitle('Browse examples').click()
  const dialog = page.getByRole('dialog', { name: 'Examples', exact: true })
  await dialog.getByRole('button', { name: /DEMO Festival letter motion/ }).click()
  await dialog.getByRole('button', { name: /Open example|Replace unsaved project/ }).click()

  const frame = page.frameLocator('iframe[title="Project preview"]')
  const canvas = frame.locator('#stage')
  await expect(canvas).toBeVisible()
  await expect(page.locator('.parameter-count')).not.toHaveText('0')
  const renderState = await canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement
    const gl = target.getContext('webgl')
    return { webgl: Boolean(gl), width: target.width, height: target.height, glError: gl?.getError() ?? -1, contextLost: gl?.isContextLost() ?? true }
  })
  expect(renderState.webgl).toBe(true)
  expect(renderState).toMatchObject({ width: 1440, height: 900, glError: 0, contextLost: false })
  await expect(frame.locator('#status')).toBeEmpty()
  expect(errors).toEqual([])
})
