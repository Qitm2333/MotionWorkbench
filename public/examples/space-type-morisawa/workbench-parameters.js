window.__SPACE_TYPE_WORKBENCH__ = {"dynamicSpecs":[{"type":"range","name":"rowsSlider"},{"type":"range","name":"typeStrokeSlider"},{"type":"range","name":"trackingSlider"},{"type":"range","name":"speedSlider"},{"type":"range","name":"lineSpaceSlider"},{"type":"range","name":"paddingSlider"},{"type":"checkbox","name":"mirrorCheck"},{"type":"checkbox","name":"mirrorSpeedCheck"},{"type":"checkbox","name":"fluxCheck"},{"type":"color","name":"textColorPicker"},{"type":"color","name":"bkgdColorPicker"}],"presetLabels":["PRIDE!","MOON","Post Space","X","Bridge","Whitney","Beach","Recede","Flux Loop","Scroll"]};
window.__SPACE_TYPE_WORKBENCH__.getControls = () => ({"rowsSlider": typeof rowsSlider === "undefined" ? undefined : rowsSlider,"typeStrokeSlider": typeof typeStrokeSlider === "undefined" ? undefined : typeStrokeSlider,"trackingSlider": typeof trackingSlider === "undefined" ? undefined : trackingSlider,"speedSlider": typeof speedSlider === "undefined" ? undefined : speedSlider,"lineSpaceSlider": typeof lineSpaceSlider === "undefined" ? undefined : lineSpaceSlider,"paddingSlider": typeof paddingSlider === "undefined" ? undefined : paddingSlider,"mirrorCheck": typeof mirrorCheck === "undefined" ? undefined : mirrorCheck,"mirrorSpeedCheck": typeof mirrorSpeedCheck === "undefined" ? undefined : mirrorSpeedCheck,"fluxCheck": typeof fluxCheck === "undefined" ? undefined : fluxCheck,"textColorPicker": typeof textColorPicker === "undefined" ? undefined : textColorPicker,"bkgdColorPicker": typeof bkgdColorPicker === "undefined" ? undefined : bkgdColorPicker});
(() => {
  const config = window.__SPACE_TYPE_WORKBENCH__ || { dynamicSpecs: [], presetLabels: [] };
  // Hide the source UI before the first p5 frame, not after asset loading.
  document.documentElement.classList.add('workbench-source-controls-hidden');
  const style = document.createElement('style');
  style.textContent = '.workbench-source-controls-hidden :is(input,textarea,select,button,#widget,#generatorInput,.bottom,.dropdown,.slug,.switch){display:none!important}';
  document.head.append(style);
  const cleanLabel = (value) => String(value || '').replace(/(?:Slider|Check|Picker|Select)$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\s+/g, ' ').trim().replace(/^./, (character) => character.toUpperCase());
  const slug = (value, index) => (String(value || '').replace(/[^A-Za-z0-9_-]/g, '-').replace(/^[^A-Za-z]+/, '') || 'control-' + index).slice(0, 64);
  const kindOf = (element) => element.tagName === 'TEXTAREA' || element.type === 'text' || !element.type ? 'text' : element.tagName === 'SELECT' ? 'select' : element.type;
  const labelFor = (element, fallback) => {
    const explicit = element.id ? document.querySelector('label[for="' + CSS.escape(element.id) + '"]') : null;
    const previous = element.previousElementSibling;
    return cleanLabel(explicit?.textContent || element.closest('label')?.textContent || (previous?.matches('p,label,span,h1,h2,h3') ? previous.textContent : '') || element.getAttribute('aria-label') || element.placeholder || fallback || element.name || element.id).slice(0, 120);
  };

  function start() {
    if (window.p5?.instance && !window.p5.instance._setupDone) { setTimeout(start, 100); return; }
    const selector = 'input[type="range"],input[type="number"],input[type="checkbox"],input[type="color"],input[type="text"],input:not([type]),textarea,select,input[type="radio"]';
    const elements = [...document.querySelectorAll(selector)].slice(0, 256);
    if (!elements.length) { setTimeout(start, 250); return; }
    window.spaceTypeSyncControls?.();
    const hasPaletteCount = Number.isFinite(window.inpNumber) && window.inp1check && window.inp5check;
    const syncPalette = () => {
      if (!hasPaletteCount) return;
      // Source presets sometimes update inpNumber without matching checkboxes.
      // Rendering consumes inpNumber; reflect that state without firing handlers.
      for (let index = 1; index <= 5; index++) window['inp' + index + 'check'].checked(index <= window.inpNumber);
    };
    syncPalette();

    const queues = new Map();
    for (const spec of config.dynamicSpecs) { const queue = queues.get(spec.type) || []; queue.push(spec); queues.set(spec.type, queue); }
    const sourceControls = config.getControls?.() || {};
    const definitions = {}, records = [], radioGroups = new Map();
    const uniqueId = (base, index) => { let id = slug(base, index), suffix = 2; while (id in definitions) id = (slug(base, index).slice(0, 60) + '-' + suffix++).slice(0, 64); return id; };
    elements.forEach((element, index) => {
      element.dataset.workbenchSourceControl = '';
      if (/hideWidget\s*\(/.test((element.getAttribute('oninput') || '') + (element.getAttribute('onclick') || ''))) return;
      const type = kindOf(element);
      if (type === 'radio') { const key = element.name || 'radio-' + index; const group = radioGroups.get(key) || []; group.push(element); radioGroups.set(key, group); return; }
      const queue = queues.get(type) || [];
      // p5 1.0 gives checkbox inputs random names. Bind through the source's
      // p5.Element instead, so persisted parameter IDs survive a fresh iframe.
      const spec = queue.find((candidate) => {
        const node = (sourceControls[candidate.name] || window[candidate.name])?.elt;
        return node === element || node?.contains(element);
      }) || (!element.id && !element.name ? queue[0] : null);
      if (spec) queue.splice(queue.indexOf(spec), 1);
      const sourceName = spec?.name || element.id || element.name || 'control' + (index + 1);
      const id = uniqueId(sourceName, index), label = labelFor(element, sourceName) || cleanLabel(sourceName) || 'Control ' + (index + 1);
      element.dataset.workbenchParameterId = id;
      let definition;
      if (type === 'range' || type === 'number') definition = { type: 'number', label, default: Number(element.value), min: Number(element.min || 0), max: Number(element.max || 100), step: Number(element.step || 1), group: 'Source controls' };
      else if (type === 'checkbox') definition = { type: 'boolean', label, default: element.checked, group: 'Source controls' };
      else if (type === 'color') definition = { type: 'color', label, default: element.value, group: 'Source controls' };
      else if (type === 'text') definition = { type: 'text', label: label || 'Text', default: element.value, multiline: element.tagName === 'TEXTAREA', maxLength: Math.min(10000, element.maxLength > 0 ? element.maxLength : 10000), group: 'Content' };
      else definition = { type: 'select', label, default: element.value, options: [...element.options].map((option) => ({ label: option.textContent?.trim() || option.value, value: option.value })), group: 'Source controls' };
      if (definition.type === 'number' && (!Number.isFinite(definition.default) || !Number.isFinite(definition.min) || !Number.isFinite(definition.max) || definition.min > definition.default || definition.default > definition.max)) return;
      if (definition.type === 'select' && (!definition.options.length || !definition.options.some((option) => option.value === definition.default))) return;
      definitions[id] = definition; records.push({ id, elements: [element], definition, radio: false });
    });
    for (const [name, radios] of radioGroups) {
      const options = radios.map((radio, index) => ({ label: labelFor(radio) || cleanLabel(radio.id) || 'Option ' + (index + 1), value: radio.value }));
      const selected = radios.find((radio) => radio.checked) || radios[0];
      if (!selected) continue;
      const id = uniqueId(name, records.length), definition = { type: 'select', label: cleanLabel(name), default: selected.value, options, group: 'Source controls' };
      for (const radio of radios) radio.dataset.workbenchParameterId = id;
      definitions[id] = definition; records.push({ id, elements: radios, definition, radio: true });
    }

    const allButtons = [...document.querySelectorAll('button,input[type="button"]')];
    const presetButtons = config.presetLabels.map((label) => allButtons.find((button) => (button.textContent || button.value || '').trim() === label)).filter(Boolean);
    for (const button of document.querySelectorAll('button,input[type="button"],input[type="file"]')) button.dataset.workbenchSourceControl = '';
    if (presetButtons.length) definitions.sourcePreset = { type: 'select', label: 'Preset', default: 'Custom', group: 'Presets', options: [{ label: 'Custom', value: 'Custom' }, ...presetButtons.map((button) => { const value = (button.textContent || button.value).trim(); return { label: value, value }; })] };
    if (hasPaletteCount) definitions.sourcePaletteCount = { type: 'number', label: 'Palette color count', default: window.inpNumber, min: 0, max: typeof window.pride === 'function' ? 6 : 5, step: 1, group: 'Source controls' };
    if (!Object.keys(definitions).length) return;
    const values = window.workbench?.params?.define?.(definitions);
    if (!values) return;
    let applying = false;
    let activePreset = 'Custom';
    const readRecord = (record) => record.radio ? (record.elements.find((element) => element.checked)?.value ?? record.definition.default) : record.definition.type === 'number' ? Number(record.elements[0].value) : record.definition.type === 'boolean' ? record.elements[0].checked : record.elements[0].value;
    const publish = () => { syncPalette(); for (const record of records) values[record.id] = readRecord(record); if (hasPaletteCount) values.sourcePaletteCount = window.inpNumber; parent.postMessage({ type: 'workbench-parameter-values', values: { ...values } }, '*'); };
    const applyRecord = (record, value) => {
      if (record.radio) { const target = record.elements.find((element) => element.value === String(value)); if (target && !target.checked) target.click(); return; }
      const element = record.elements[0];
      if (readRecord(record) === value) return;
      if (record.definition.type === 'boolean') { element.click(); return; }
      element.value = String(value);
      element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const apply = (detail, change) => {
      applying = true;
      const desired = { ...detail };
      const ids = change?.ids || Object.keys(detail);
      const hasControlChange = records.some((record) => ids.includes(record.id) && readRecord(record) !== desired[record.id]) || (hasPaletteCount && ids.includes('sourcePaletteCount') && desired.sourcePaletteCount !== window.inpNumber);
      const requestedPreset = detail.sourcePreset;
      if (ids.includes('sourcePreset') && requestedPreset && (requestedPreset !== activePreset || change?.restore) && requestedPreset !== 'Custom') {
        const button = presetButtons.find((candidate) => (candidate.textContent || candidate.value).trim() === requestedPreset);
        // p5.Element.mousePressed listens to mousedown; static HTML uses click.
        button?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
        button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
        button?.click(); values.sourcePreset = requestedPreset; activePreset = requestedPreset;
        window.spaceTypeSyncControls?.();
        if (!change?.restore) { publish(); applying = false; return; }
      }
      for (const record of records) if (ids.includes(record.id)) applyRecord(record, desired[record.id]);
      if (hasPaletteCount && ids.includes('sourcePaletteCount')) {
        window.inpNumber = desired.sourcePaletteCount;
        // The sixth source color is otherwise initialized only by PRIDE!.
        if (window.inpNumber === 6 && window.inp6 === undefined) window.inp6 = window.color('#760089');
      }
      if ('sourcePreset' in definitions && (requestedPreset === 'Custom' || (hasControlChange && !change?.restore))) {
        values.sourcePreset = 'Custom'; activePreset = 'Custom';
      }
      publish();
      applying = false;
    };
    document.addEventListener('workbench:params', (event) => apply(event.detail || values, event.workbenchChange));
    for (const record of records) for (const element of record.elements) for (const eventName of ['input', 'change']) element.addEventListener(eventName, () => { if (applying) return; if ('sourcePreset' in values) values.sourcePreset = 'Custom'; publish(); });
  }
  addEventListener('load', () => setTimeout(start, 350), { once: true });
})();
