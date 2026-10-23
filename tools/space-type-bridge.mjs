const presetExclusions = /^(?:save|record|export|reset(?: points)?|clear all|random palette|reroll|invert)$/i

export function sourceControlBindings(specs) {
  // Classic scripts share global lexical bindings, but `let` variables are not
  // window properties. Resolve their actual p5.Elements after setup, without eval.
  const names = [...new Set(specs.map((spec) => spec.name))]
  return 'window.__SPACE_TYPE_WORKBENCH__.getControls = () => ({' + names.map((name) => `${JSON.stringify(name)}: typeof ${name} === "undefined" ? undefined : ${name}`).join(',') + '});\n'
}

export function sourceControlSpecs(sources) {
  const controls = []
  const patterns = [
    ['range', /([A-Za-z_$][\w$]*)\s*=\s*createSlider\s*\(/g],
    ['checkbox', /([A-Za-z_$][\w$]*)\s*=\s*createCheckbox\s*\(/g],
    ['color', /([A-Za-z_$][\w$]*)\s*=\s*createColorPicker\s*\(/g],
    ['select', /([A-Za-z_$][\w$]*)\s*=\s*createSelect\s*\(/g],
    ['text', /([A-Za-z_$][\w$]*)\s*=\s*createInput\s*\(/g],
  ]
  for (const source of sources) {
    const found = []
    for (const [type, expression] of patterns) {
      for (const match of source.matchAll(expression)) found.push({ type, name: match[1], offset: match.index })
    }
    controls.push(...found.sort((a, b) => a.offset - b.offset).map(({ type, name }) => ({ type, name })))
  }
  return controls.slice(0, 256)
}

export function sourcePresetLabels(sources, html = '') {
  const presets = []
  for (const source of sources) {
    const buttons = [...source.matchAll(/([A-Za-z_$][\w$]*)\s*=\s*createButton\s*\(\s*(['"])(.*?)\2\s*\)[\s\S]{0,260}?\1\.mousePressed\s*\(\s*([A-Za-z_$][\w$]*)/g)]
    for (const match of buttons) {
      const label = match[3].trim()
      const callback = match[4]
      if (!label || presetExclusions.test(label) || /^(?:save|record|export|reset|clear|random)/i.test(callback)) continue
      presets.push(label)
    }
  }
  for (const match of html.matchAll(/<button\b[^>]*class=["'][^"']*(?:imagePresets|preset)[^"']*["'][^>]*>([^<]+)/gi)) {
    const label = match[1].trim()
    if (label && !presetExclusions.test(label)) presets.push(label)
  }
  return [...new Set(presets)].slice(0, 64)
}
