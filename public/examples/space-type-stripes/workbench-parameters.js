(() => {
  const specs = [{"type":"range","name":"typeXSlider","offset":1449},{"type":"range","name":"typeYSlider","offset":1557},{"type":"range","name":"typeStrokeSlider","offset":1664},{"type":"range","name":"trackingSlider","offset":1783},{"type":"range","name":"ribbonCountSlider","offset":1900},{"type":"range","name":"ribbonSpaceXSlider","offset":2024},{"type":"range","name":"ribbonSpaceYSlider","offset":2155},{"type":"range","name":"ribbonSizeSlider","offset":2286},{"type":"range","name":"ribbonOffsetSlider","offset":2411},{"type":"range","name":"yWaveSlider","offset":2548},{"type":"range","name":"speedSlider","offset":2656},{"type":"range","name":"offsetSlider","offset":2772},{"type":"range","name":"slopeSlider","offset":2889},{"type":"color","name":"inp1","offset":4314},{"type":"checkbox","name":"inp1check","offset":4404},{"type":"color","name":"inp2","offset":4472},{"type":"checkbox","name":"inp2check","offset":4563},{"type":"color","name":"inp3","offset":4632},{"type":"checkbox","name":"inp3check","offset":4723},{"type":"color","name":"inp4","offset":4792},{"type":"checkbox","name":"inp4check","offset":4883},{"type":"color","name":"inp5","offset":4952},{"type":"checkbox","name":"inp5check","offset":5040},{"type":"color","name":"bkgdColorPicker","offset":5111}];
  const label = value => value.replace(/(?:Slider|Check|Picker|Select)$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  const slug = (value, index) => (value.replace(/[^A-Za-z0-9_-]/g, '-').replace(/^[^A-Za-z]+/, '') || 'control-' + index).slice(0, 64);
  const start = () => {
    const elements = [...document.querySelectorAll('input[type="range"], input[type="checkbox"], input[type="color"], select')].slice(0, 100);
    if (!elements.length) { setTimeout(start, 250); return; }
    const definitions = {}, records = [];
    elements.forEach((element, index) => {
      const spec = specs[index] || { name: 'control' + (index + 1), type: element.tagName === 'SELECT' ? 'select' : element.type };
      let id = slug(spec.name, index), suffix = 2;
      while (id in definitions) id = (slug(spec.name, index).slice(0, 60) + '-' + suffix++).slice(0, 64);
      let definition;
      if (element.type === 'range') definition = { type: 'number', label: label(spec.name), default: Number(element.value), min: Number(element.min || 0), max: Number(element.max || 100), step: Number(element.step || 1), group: 'Source controls' };
      else if (element.type === 'checkbox') definition = { type: 'boolean', label: label(spec.name), default: element.checked, group: 'Source controls' };
      else if (element.type === 'color') definition = { type: 'color', label: label(spec.name), default: element.value, group: 'Source controls' };
      else definition = { type: 'select', label: label(spec.name), default: element.value, options: [...element.options].map(option => ({ label: option.textContent || option.value, value: option.value })), group: 'Source controls' };
      if (definition.type === 'number' && (!Number.isFinite(definition.default) || !Number.isFinite(definition.min) || !Number.isFinite(definition.max) || definition.min > definition.default || definition.default > definition.max)) return;
      definitions[id] = definition;
      records.push({ id, element, definition });
    });
    if (!Object.keys(definitions).length) return;
    const values = window.workbench?.params?.define?.(definitions);
    if (!values) return;
    let applying = false;
    const apply = detail => {
      applying = true;
      for (const { id, element, definition } of records) {
        const value = detail[id];
        if (definition.type === 'boolean') element.checked = Boolean(value);
        else element.value = String(value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      applying = false;
    };
    document.addEventListener('workbench:params', event => apply(event.detail || values));
    for (const { id, element, definition } of records) element.addEventListener('input', () => {
      if (applying) return;
      values[id] = definition.type === 'number' ? Number(element.value) : definition.type === 'boolean' ? element.checked : element.value;
      parent.postMessage({ type: 'workbench-parameter-values', values: { ...values } }, '*');
    });
  };
  addEventListener('load', () => setTimeout(start, 350), { once: true });
})();
