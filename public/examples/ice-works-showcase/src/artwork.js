const PALETTES = [
  ['#101218', '#c7d1de', '#f6f7fa'],
  ['#18242c', '#70a9a1', '#f4d9a6'],
  ['#2b1522', '#cb5270', '#f5b8a7'],
  ['#141a32', '#7289da', '#d9e2ff'],
  ['#282011', '#e5b85c', '#fff0bd'],
  ['#161d18', '#6eb68a', '#d7f0db'],
]

export function createArtwork(index) {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const [dark, mid, light] = PALETTES[index % PALETTES.length]

  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  background.addColorStop(0, dark)
  background.addColorStop(1, mid)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(((index % 7) - 3) * 0.08)
  for (let ring = 0; ring < 9; ring += 1) {
    const t = ring / 8
    const metal = ctx.createLinearGradient(-250, -150, 250, 150)
    metal.addColorStop(0, 'rgba(255,255,255,.08)')
    metal.addColorStop(.35, light)
    metal.addColorStop(.52, '#222')
    metal.addColorStop(.7, '#fff')
    metal.addColorStop(1, 'rgba(255,255,255,.04)')
    ctx.strokeStyle = metal
    ctx.lineWidth = 18 - ring * 1.35
    ctx.globalAlpha = 0.85 - t * 0.45
    ctx.beginPath()
    ctx.ellipse(0, 0, 250 - ring * 18, 150 - ring * 9, ring * 0.075, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()

  ctx.globalAlpha = 0.85
  ctx.fillStyle = '#fff'
  ctx.font = '600 24px Arial, Helvetica, sans-serif'
  ctx.fillText(String(index + 1).padStart(2, '0'), 30, 46)
  ctx.globalAlpha = 1
  return canvas
}
