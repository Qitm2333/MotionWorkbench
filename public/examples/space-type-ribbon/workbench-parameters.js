(() => {
  const specs = [{"type":"range","name":"segmentSpaceSlider","offset":1411},{"type":"range","name":"segmentCountSlider","offset":1539},{"type":"range","name":"typeHeightSlider","offset":1666},{"type":"range","name":"trackingSlider","offset":1789},{"type":"range","name":"typeStrokeSlider","offset":1907},{"type":"range","name":"speedSlider","offset":2030},{"type":"range","name":"depthSlider","offset":2143},{"type":"range","name":"middleStretchSlider","offset":2249},{"type":"range","name":"countSlider","offset":2382},{"type":"range","name":"zSpaceSlider","offset":2486},{"type":"range","name":"xSpaceSlider","offset":2600},{"type":"checkbox","name":"altCheck","offset":2713},{"type":"range","name":"scalerSlider","offset":2783},{"type":"range","name":"rotXslider","offset":2902},{"type":"range","name":"rotYslider","offset":3028},{"type":"range","name":"rotZslider","offset":3150},{"type":"checkbox","name":"inp0check","offset":3278},{"type":"checkbox","name":"gradientCheck","offset":3347},{"type":"checkbox","name":"bSideCheck","offset":3423},{"type":"color","name":"inp1","offset":3493},{"type":"checkbox","name":"inp1check","offset":3584},{"type":"color","name":"inp2","offset":3653},{"type":"checkbox","name":"inp2check","offset":3744},{"type":"color","name":"inp3","offset":3813},{"type":"checkbox","name":"inp3check","offset":3904},{"type":"color","name":"inp4","offset":3973},{"type":"checkbox","name":"inp4check","offset":4061},{"type":"color","name":"inp5","offset":4131},{"type":"checkbox","name":"inp5check","offset":4222},{"type":"color","name":"bkgdColorPicker","offset":4295},{"type":"color","name":"textColorPicker","offset":4419}];
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
