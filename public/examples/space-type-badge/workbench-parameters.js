(() => {
  const specs = [{"type":"checkbox","name":"stripSwitch"},{"type":"select","name":"font0"},{"type":"range","name":"padding0"},{"type":"checkbox","name":"repeatCheckbox0"},{"type":"checkbox","name":"cycleCheckbox0"},{"type":"checkbox","name":"invertCheckbox0"},{"type":"checkbox","name":"outlineCheckbox0"},{"type":"checkbox","name":"backgroundCheckbox0"},{"type":"range","name":"stripLength"},{"type":"range","name":"stripHeight"},{"type":"range","name":"stripShear"},{"type":"range","name":"stripRotate"},{"type":"range","name":"stripPosition"},{"type":"checkbox","name":"orbitSwitch"},{"type":"select","name":"font1"},{"type":"range","name":"padding1"},{"type":"checkbox","name":"repeatCheckbox1"},{"type":"checkbox","name":"cycleCheckbox1"},{"type":"checkbox","name":"invertCheckbox1"},{"type":"checkbox","name":"outlineCheckbox1"},{"type":"checkbox","name":"backgroundCheckbox1"},{"type":"range","name":"orbitCirc"},{"type":"range","name":"orbitHeight"},{"type":"range","name":"orbitRadius"},{"type":"range","name":"orbitXrot"},{"type":"range","name":"orbitZrot"},{"type":"checkbox","name":"tunnelSwitch"},{"type":"select","name":"font2"},{"type":"range","name":"padding2"},{"type":"checkbox","name":"repeatCheckbox2"},{"type":"checkbox","name":"cycleCheckbox2"},{"type":"checkbox","name":"invertCheckbox2"},{"type":"checkbox","name":"outlineCheckbox2"},{"type":"checkbox","name":"flipCheckbox2"},{"type":"checkbox","name":"backgroundCheckbox2"},{"type":"range","name":"tunnelCount"},{"type":"range","name":"tunnelCirc"},{"type":"range","name":"tunnelInner"},{"type":"range","name":"tunnelOffset"},{"type":"checkbox","name":"ringSwitch"},{"type":"select","name":"font3"},{"type":"range","name":"padding3"},{"type":"checkbox","name":"repeatCheckbox3"},{"type":"checkbox","name":"cycleCheckbox3"},{"type":"checkbox","name":"invertCheckbox3"},{"type":"checkbox","name":"outlineCheckbox3"},{"type":"checkbox","name":"flipCheckbox3"},{"type":"checkbox","name":"repeatCheckbox3"},{"type":"checkbox","name":"backgroundCheckbox3"},{"type":"range","name":"ringHeight"},{"type":"range","name":"ringCirc"},{"type":"range","name":"ringRadius"},{"type":"range","name":"ringOffset"},{"type":"checkbox","name":"gateSwitch"},{"type":"select","name":"font4"},{"type":"range","name":"padding4"},{"type":"checkbox","name":"repeatCheckbox4"},{"type":"checkbox","name":"cycleCheckbox4"},{"type":"checkbox","name":"invertCheckbox4"},{"type":"checkbox","name":"outlineCheckbox4"},{"type":"checkbox","name":"flipCheckbox4"},{"type":"checkbox","name":"repeatCheckbox4"},{"type":"checkbox","name":"backgroundCheckbox4"},{"type":"range","name":"gateCount"},{"type":"range","name":"stretchRes"},{"type":"range","name":"gateInner"},{"type":"checkbox","name":"spreadSwitch"},{"type":"select","name":"font5"},{"type":"range","name":"padding5"},{"type":"range","name":"spreadFontSize"},{"type":"checkbox","name":"repeatCheckbox5"},{"type":"checkbox","name":"cycleCheckbox5"},{"type":"checkbox","name":"invertCheckbox5"},{"type":"checkbox","name":"outlineCheckbox5"},{"type":"checkbox","name":"flipCheckbox5"},{"type":"checkbox","name":"spreadTangent"},{"type":"checkbox","name":"spreadRadial"},{"type":"checkbox","name":"backgroundCheckbox5"},{"type":"range","name":"spreadRadius"},{"type":"range","name":"spreadXPinch"},{"type":"range","name":"spreadYPinch"},{"type":"checkbox","name":"trackSwitch"},{"type":"select","name":"font6"},{"type":"range","name":"padding6"},{"type":"checkbox","name":"repeatCheckbox6"},{"type":"checkbox","name":"cycleCheckbox6"},{"type":"checkbox","name":"invertCheckbox6"},{"type":"checkbox","name":"outlineCheckbox6"},{"type":"checkbox","name":"flipCheckbox6"},{"type":"checkbox","name":"repeatCheckbox6"},{"type":"checkbox","name":"backgroundCheckbox6"},{"type":"range","name":"trackStripHeight"},{"type":"range","name":"trackWidth"},{"type":"range","name":"trackWidthPinch"},{"type":"range","name":"trackHeight"},{"type":"range","name":"trackHeightPinch"},{"type":"checkbox","name":"imageSwitch"},{"type":"select","name":"imageShape"},{"type":"range","name":"imageWidth"},{"type":"range","name":"imageHeight"}];
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
