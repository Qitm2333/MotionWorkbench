(() => {
  const specs = [{"type":"select","name":"fontChange"},{"type":"range","name":"scaler"},{"type":"checkbox","name":"ranRunOn"},{"type":"checkbox","name":"allSlidersOn"},{"type":"select","name":"uiSelect"},{"type":"range","name":"resLon"},{"type":"range","name":"minFlux"},{"type":"range","name":"maxFlux"},{"type":"range","name":"randomFlux"},{"type":"color","name":"bkgdColor"},{"type":"color","name":"foreColor"},{"type":"select","name":"colorTypeChange"},{"type":"color","name":"triple0color"},{"type":"color","name":"triple1color"},{"type":"color","name":"triple2color"},{"type":"color","name":"quint0color"},{"type":"color","name":"quint1color"},{"type":"color","name":"quint2color"},{"type":"color","name":"quint3color"},{"type":"color","name":"quint4color"},{"type":"checkbox","name":"taperOn"},{"type":"range","name":"baseSW"},{"type":"range","name":"minSW"},{"type":"range","name":"maxSW"},{"type":"select","name":"stageAstrength"},{"type":"select","name":"stageAdirect"},{"type":"range","name":"stageAlength"},{"type":"select","name":"stageBstrength"},{"type":"select","name":"stageBdirect"},{"type":"range","name":"stageBlength"},{"type":"range","name":"pauseLength"},{"type":"range","name":"pauseLength"},{"type":"range","name":"delay"},{"type":"checkbox","name":"scrubOn"},{"type":"range","name":"scrubVal"},{"type":"checkbox","name":"control36"}];
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
